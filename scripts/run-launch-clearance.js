#!/usr/bin/env node
/* eslint-disable no-console */
const { randomUUID } = require('node:crypto');
const {
  createSupabaseAdminClient,
  ensureOutputDir,
  fetchJson,
  formatJson,
  getAdminCookie,
  getBaseUrl,
  info,
  loadLocalEnv,
  writeJsonArtifact,
  writeMarkdownArtifact
} = require('./launch-clearance-utils');
const { runFailureProof } = require('./run-failure-proof');

const TARGET_MIGRATION_ID = '20260320_observability_and_admin_report_rpc.sql';
const OUTPUT_DIR_NAME = 'launch-clearance-results';
const DEFAULT_PERIOD_DAYS = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function evaluateLaunchClearance(gates) {
  const blockingSignals = gates.filter((gate) => !gate.clean && gate.blockingSignal).map((gate) => gate.blockingSignal);
  const failedArtifacts = gates.filter((gate) => !gate.clean && gate.artifactPath).map((gate) => gate.artifactPath);
  const rollbackRequired = gates.some((gate) => !gate.clean && gate.rollbackRequired);
  const allClean = gates.every((gate) => gate.clean);

  return {
    status: allClean ? 'Cleared' : 'Blocked',
    rollbackDecision: rollbackRequired ? 'rollback required' : 'rollback not required',
    blockingSignals,
    failedArtifacts,
    gates
  };
}

async function fetchAdminRoute(baseUrl, adminCookie, path) {
  return fetchJson(`${baseUrl}${path}`, {
    headers: {
      cookie: adminCookie
    }
  });
}

async function fetchAllRows(supabase, table, select, queryBuilder) {
  const rows = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    query = queryBuilder(query);
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load ${table}: ${error.message}`);
    }
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
    offset += pageSize;
  }
}

function isValidIsoString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function toNullableString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

async function computeSupportCaseTotals(supabase, periodStartIso) {
  const bookings = await fetchAllRows(
    supabase,
    'bookings',
    'id, metadata, created_at',
    (query) => query.gte('created_at', periodStartIso).order('created_at', { ascending: false })
  );

  const totalCases = bookings.filter((booking) => isValidIsoString(booking?.metadata?.supportRequestedAt)).length;
  return { totalCases, scannedBookings: bookings.length };
}

async function computeSettlementTotal(supabase, periodStartIso) {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', periodStartIso)
    .in('status', ['confirmed', 'booking_confirmed', 'payment_authorized', 'refunded']);

  if (error) {
    throw new Error(`Failed to count settlement ledger bookings: ${error.message}`);
  }

  return count ?? 0;
}

async function computeReconciliationOpenIssueTotal(supabase, periodStartIso) {
  const bookings = await fetchAllRows(
    supabase,
    'bookings',
    'id, status, total_amount, commission_amount, currency, metadata, created_at',
    (query) => query
      .gte('created_at', periodStartIso)
      .in('status', ['booking_confirmed', 'refunded', 'confirmed'])
      .order('created_at', { ascending: false })
  );

  const bookingIds = bookings.map((booking) => booking.id);
  const commissionRows = [];
  for (let index = 0; index < bookingIds.length; index += 200) {
    const ids = bookingIds.slice(index, index + 200);
    if (ids.length === 0) {
      continue;
    }
    const { data, error } = await supabase
      .from('commission_tracking')
      .select('booking_id, gross_booking_value, commission_amount, currency, updated_at')
      .gte('updated_at', periodStartIso)
      .in('booking_id', ids)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load commission tracking: ${error.message}`);
    }
    commissionRows.push(...((Array.isArray(data) ? data : [])));
  }

  const commissionByBookingId = new Map();
  for (const row of commissionRows) {
    if (!commissionByBookingId.has(row.booking_id)) {
      commissionByBookingId.set(row.booking_id, row);
    }
  }

  let total = 0;
  for (const booking of bookings) {
    const reconciliation = booking?.metadata?.reconciliation ?? {};
    if (reconciliation.resolved === true) {
      continue;
    }

    const tracking = commissionByBookingId.get(booking.id);
    const bookingTotal = typeof booking.total_amount === 'number' ? booking.total_amount : 0;
    if (!tracking) {
      total += 1;
      continue;
    }

    const bookingCurrency = toNullableString(booking.currency);
    const trackingCurrency = toNullableString(tracking.currency);
    if (bookingCurrency && trackingCurrency && bookingCurrency !== trackingCurrency) {
      total += 1;
      continue;
    }

    const expectedCommission = typeof booking.commission_amount === 'number' ? booking.commission_amount : tracking.commission_amount ?? 0;
    const grossMismatch = Math.abs(Math.round((tracking.gross_booking_value - bookingTotal) * 100) / 100) > 0.01;
    const commissionMismatch = Math.abs(Math.round((tracking.commission_amount - expectedCommission) * 100) / 100) > 0.01;
    if (grossMismatch || commissionMismatch) {
      total += 1;
    }
  }

  return { total, scannedBookings: bookings.length };
}

async function verifyMigrationAndRpc(baseUrl, adminCookie, supabase, outputDir) {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - DEFAULT_PERIOD_DAYS);
  const periodStartIso = periodStart.toISOString();
  const rpcChecks = [];
  const rpcCalls = [
    ['fn_admin_reconciliation_summary', { period_start_iso: periodStartIso }],
    ['fn_admin_reconciliation_issue_page', { period_start_iso: periodStartIso, include_resolved: false, page_offset: 0, page_limit: DEFAULT_LIMIT }],
    ['fn_admin_reconciliation_issue_count', { period_start_iso: periodStartIso, include_resolved: false }],
    ['fn_admin_settlement_ledger_page', { period_start_iso: periodStartIso, page_offset: 0, page_limit: DEFAULT_LIMIT }],
    ['fn_admin_settlement_ledger_count', { period_start_iso: periodStartIso }],
    ['fn_admin_support_operations_summary', { period_start_iso: periodStartIso, breach_hours_input: 24 }],
    ['fn_admin_support_operations_case_page', { period_start_iso: periodStartIso, breach_hours_input: 24, page_offset: 0, page_limit: DEFAULT_LIMIT }],
    ['fn_admin_support_operations_case_count', { period_start_iso: periodStartIso }],
    ['fn_admin_support_sla_summary', { period_start_iso: periodStartIso, breach_hours_input: 24 }],
    ['fn_admin_support_sla_case_page', { period_start_iso: periodStartIso, breach_hours_input: 24, page_offset: 0, page_limit: DEFAULT_LIMIT }],
    ['fn_admin_support_sla_case_count', { period_start_iso: periodStartIso }]
  ];

  for (const [name, params] of rpcCalls) {
    const { error } = await supabase.rpc(name, params);
    rpcChecks.push({ name, ok: !error, error: error?.message ?? null });
  }

  const telemetryProbeId = randomUUID();
  const telemetryInsert = await supabase.from('ops_telemetry_events').insert({
    id: telemetryProbeId,
    category: 'failure_proof',
    metric: 'launch_clearance.telemetry_probe',
    value: 1,
    status: 'ok',
    dimensions: {
      probe: true
    },
    observed_at: new Date().toISOString()
  });
  const telemetrySelect = await supabase
    .from('ops_telemetry_events')
    .select('id, metric')
    .eq('id', telemetryProbeId)
    .maybeSingle();
  await supabase.from('ops_telemetry_events').delete().eq('id', telemetryProbeId);

  const routeChecks = [];
  const reconciliation = await fetchAdminRoute(
    baseUrl,
    adminCookie,
    `/api/admin/reconciliation?days=${DEFAULT_PERIOD_DAYS}&page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`
  );
  const settlement = await fetchAdminRoute(
    baseUrl,
    adminCookie,
    `/api/admin/settlement/ledger?days=${DEFAULT_PERIOD_DAYS}&page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`
  );
  const supportOps = await fetchAdminRoute(
    baseUrl,
    adminCookie,
    `/api/admin/support/operations?days=${DEFAULT_PERIOD_DAYS}&breachHours=24&page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`
  );
  const supportSla = await fetchAdminRoute(
    baseUrl,
    adminCookie,
    `/api/admin/support/sla?days=${DEFAULT_PERIOD_DAYS}&breachHours=24&page=${DEFAULT_PAGE}&limit=${DEFAULT_LIMIT}`
  );

  const settlementTotal = await computeSettlementTotal(supabase, periodStartIso);
  const supportOpsTotal = await computeSupportCaseTotals(supabase, periodStartIso);
  const supportSlaTotal = await computeSupportCaseTotals(supabase, periodStartIso);
  const reconciliationTotal = await computeReconciliationOpenIssueTotal(supabase, periodStartIso);

  const routeExpectations = [
    {
      id: 'reconciliation',
      response: reconciliation,
      total: reconciliationTotal.total
    },
    {
      id: 'settlement',
      response: settlement,
      total: settlementTotal
    },
    {
      id: 'support_operations',
      response: supportOps,
      total: supportOpsTotal.totalCases
    },
    {
      id: 'support_sla',
      response: supportSla,
      total: supportSlaTotal.totalCases
    }
  ];

  for (const route of routeExpectations) {
    const body = route.response.body ?? {};
    routeChecks.push({
      id: route.id,
      ok: route.response.response.ok &&
        body?.dataFreshness?.source === 'rpc' &&
        body?.pagination?.total === route.total &&
        body?.processing?.truncationReason !== 'rpc_unavailable',
      status: route.response.response.status,
      source: body?.dataFreshness?.source ?? null,
      total: body?.pagination?.total ?? null,
      expectedTotal: route.total,
      truncationReason: body?.processing?.truncationReason ?? null
    });
  }

  const result = {
    checkedAt: new Date().toISOString(),
    migrationId: TARGET_MIGRATION_ID,
    rpcChecks,
    telemetryTable: {
      insertOk: !telemetryInsert.error,
      selectOk: !telemetrySelect.error && telemetrySelect.data?.id === telemetryProbeId,
      insertError: telemetryInsert.error?.message ?? null,
      selectError: telemetrySelect.error?.message ?? null
    },
    routeChecks,
    directTruth: {
      reconciliation: reconciliationTotal,
      settlement: { total: settlementTotal },
      supportOperations: supportOpsTotal,
      supportSla: supportSlaTotal
    }
  };
  const artifactPath = writeJsonArtifact(outputDir, 'migration-rpc-verification', result);
  const clean = rpcChecks.every((check) => check.ok) &&
    result.telemetryTable.insertOk &&
    result.telemetryTable.selectOk &&
    routeChecks.every((check) => check.ok);

  return {
    clean,
    blockingSignal: clean ? null : 'migration/RPC verification failed or fallback-path usage was non-zero',
    rollbackRequired: false,
    artifactPath,
    payload: result
  };
}

async function validateReadinessAndAlerts(baseUrl, supabase, outputDir) {
  const runId = `launch-clearance-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const probeRows = [];

  for (let index = 0; index < 25; index += 1) {
    probeRows.push({
      id: randomUUID(),
      category: 'admin_report',
      metric: 'admin_report.admin_reconciliation_get.latency_ms',
      value: 2000,
      unit: 'ms',
      status: 'ok',
      dimensions: {
        endpoint: 'admin_reconciliation_get',
        httpStatus: 200,
        scannedRows: 25,
        totalRows: 25,
        launchClearanceRunId: runId
      },
      observed_at: nowIso
    });
  }

  probeRows.push(
    {
      id: randomUUID(),
      category: 'recovery',
      metric: 'booking_requested_backlog_age',
      value: 180,
      status: 'warn',
      dimensions: { launchClearanceRunId: runId },
      observed_at: nowIso
    },
    {
      id: randomUUID(),
      category: 'recovery',
      metric: 'captured_without_terminal_outcome',
      value: 11,
      status: 'warn',
      dimensions: { launchClearanceRunId: runId },
      observed_at: nowIso
    },
    {
      id: randomUUID(),
      category: 'recovery',
      metric: 'outbox_dead_letter',
      value: 1,
      status: 'fail',
      dimensions: { launchClearanceRunId: runId },
      observed_at: nowIso
    }
  );

  const baseline = await fetchJson(`${baseUrl}/api/readyz`);
  const insert = await supabase.from('ops_telemetry_events').insert(probeRows);
  const persistedRows = await supabase
    .from('ops_telemetry_events')
    .select('id, category, metric')
    .contains('dimensions', { launchClearanceRunId: runId });
  const critical = await fetchJson(`${baseUrl}/api/readyz`);
  await supabase.from('ops_telemetry_events').delete().contains('dimensions', { launchClearanceRunId: runId });
  const restored = await fetchJson(`${baseUrl}/api/readyz`);

  const criticalAlarms = Array.isArray(critical.body?.alarms) ? critical.body.alarms.map((alarm) => alarm.id) : [];
  const clean = !insert.error &&
    !persistedRows.error &&
    Array.isArray(persistedRows.data) &&
    persistedRows.data.length >= probeRows.length &&
    critical.response.status === 503 &&
    critical.response.headers.get('x-alert-state') === 'critical' &&
    criticalAlarms.includes('admin-report-error-budget') &&
    criticalAlarms.includes('recovery-backlog');

  const result = {
    checkedAt: new Date().toISOString(),
    baseline: {
      status: baseline.response.status,
      alertState: baseline.response.headers.get('x-alert-state'),
      body: baseline.body
    },
    insertedProbeCount: probeRows.length,
    telemetryPersistence: {
      insertOk: !insert.error,
      persistedCount: Array.isArray(persistedRows.data) ? persistedRows.data.length : 0,
      insertError: insert.error?.message ?? null,
      selectError: persistedRows.error?.message ?? null
    },
    critical: {
      status: critical.response.status,
      alertState: critical.response.headers.get('x-alert-state'),
      alarms: critical.body?.alarms ?? []
    },
    restored: {
      status: restored.response.status,
      alertState: restored.response.headers.get('x-alert-state'),
      body: restored.body
    }
  };
  const artifactPath = writeJsonArtifact(outputDir, 'readiness-alert-validation', result);

  return {
    clean,
    blockingSignal: clean ? null : 'readiness/alert validation failed to persist telemetry or trigger critical alarms',
    rollbackRequired: true,
    artifactPath,
    payload: result
  };
}

function renderMarkdownNote(decision, migrationResult, failureProofResult, readinessResult) {
  return [
    '# Launch Clearance Result',
    '',
    `- Status: ${decision.status}`,
    `- Rollback: ${decision.rollbackDecision}`,
    `- Checked at: ${new Date().toISOString()}`,
    '',
    '## Gate Results',
    `- Migration/RPC verification: ${migrationResult.clean ? 'clean' : 'blocked'}`,
    `- Failure-proof artifacts: ${failureProofResult.clean ? 'clean' : 'blocked'}`,
    `- Readiness/alert validation: ${readinessResult.clean ? 'clean' : 'blocked'}`,
    '',
    '## Blocking Signals',
    ...(decision.blockingSignals.length > 0 ? decision.blockingSignals.map((signal) => `- ${signal}`) : ['- none']),
    '',
    '## Failed Artifacts',
    ...(decision.failedArtifacts.length > 0 ? decision.failedArtifacts.map((artifact) => `- ${artifact}`) : ['- none'])
  ].join('\n');
}

async function main() {
  loadLocalEnv();
  const baseUrl = getBaseUrl();
  const adminCookie = getAdminCookie();
  const supabase = await createSupabaseAdminClient();
  const outputDir = ensureOutputDir(OUTPUT_DIR_NAME);

  info(`Running launch clearance verification against ${baseUrl}`);
  const migrationResult = await verifyMigrationAndRpc(baseUrl, adminCookie, supabase, outputDir);
  const failureProof = await runFailureProof('launch');
  const failureProofGate = {
    clean: failureProof.passed,
    blockingSignal: failureProof.passed ? null : 'failure-proof artifact bundle contains failed or unconfigured required scenarios',
    rollbackRequired: true,
    artifactPath: failureProof.outPath,
    payload: failureProof.summary
  };
  const readinessResult = await validateReadinessAndAlerts(baseUrl, supabase, outputDir);

  const decision = evaluateLaunchClearance([
    {
      gate: 'migration_rpc_verification',
      clean: migrationResult.clean,
      blockingSignal: migrationResult.blockingSignal,
      rollbackRequired: migrationResult.rollbackRequired,
      artifactPath: migrationResult.artifactPath
    },
    {
      gate: 'failure_proof',
      clean: failureProofGate.clean,
      blockingSignal: failureProofGate.blockingSignal,
      rollbackRequired: failureProofGate.rollbackRequired,
      artifactPath: failureProofGate.artifactPath
    },
    {
      gate: 'readiness_alert_validation',
      clean: readinessResult.clean,
      blockingSignal: readinessResult.blockingSignal,
      rollbackRequired: readinessResult.rollbackRequired,
      artifactPath: readinessResult.artifactPath
    }
  ]);

  const summary = {
    generatedAt: new Date().toISOString(),
    targetMigrationId: TARGET_MIGRATION_ID,
    baseUrl,
    decision,
    migrationRpcVerification: migrationResult.payload,
    failureProof: failureProof.summary,
    readinessAlertValidation: readinessResult.payload
  };
  const summaryPath = writeJsonArtifact(outputDir, 'launch-clearance', summary);
  const notePath = writeMarkdownArtifact(outputDir, 'launch-clearance', renderMarkdownNote(
    decision,
    migrationResult,
    failureProofGate,
    readinessResult
  ));

  console.log(formatJson({
    status: decision.status,
    rollbackDecision: decision.rollbackDecision,
    summaryPath,
    notePath,
    blockingSignals: decision.blockingSignals
  }));

  if (decision.status !== 'Cleared') {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
