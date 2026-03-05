import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { assertProductionReadiness } from '@/server/env';
import { buildReconciliationReport } from '@/server/admin/reconciliation-report';
import { buildSupportSlaReport } from '@/server/admin/support-sla-report';
import { buildSettlementLedgerReport } from '@/server/admin/settlement-ledger-report';

function parseProductionReadinessError(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return ['Unknown production readiness error'];
  }
  const text = error.message ?? 'Unknown production readiness error';
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const detailLines = lines
    .filter((line) => line.startsWith('-'))
    .map((line) => line.replace(/^-+\s*/, ''));
  return detailLines.length > 0 ? detailLines : [text];
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    let envGatePassed = true;
    let envProblems: string[] = [];
    try {
      assertProductionReadiness();
    } catch (error) {
      envGatePassed = false;
      envProblems = parseProductionReadinessError(error);
    }

    const [reconciliation, support, settlement] = await Promise.all([
      buildReconciliationReport(supabase, { periodDays: 30, includeResolved: false, maxIssues: 200 }),
      buildSupportSlaReport(supabase, { periodDays: 30, breachHours: 24, limit: 200 }),
      buildSettlementLedgerReport(supabase, { periodDays: 30, limit: 300 })
    ]);

    const reconciliationGatePassed =
      reconciliation.summary.openIssueCount === 0 && reconciliation.summary.varianceAmount === 0;
    const supportGatePassed = support.summary.breachCount === 0;
    const settlementGatePassed = settlement.summary.exceptionRows === 0;

    const gates = [
      {
        id: 'env-production-readiness',
        title: 'Environment and production configuration',
        passed: envGatePassed,
        details: envGatePassed ? ['All required production settings validated.'] : envProblems
      },
      {
        id: 'reconciliation-integrity',
        title: 'Revenue reconciliation integrity',
        passed: reconciliationGatePassed,
        details: [
          `Open issues: ${reconciliation.summary.openIssueCount}`,
          `Variance amount: ${reconciliation.summary.varianceAmount}`
        ]
      },
      {
        id: 'support-sla',
        title: 'Support SLA breaches',
        passed: supportGatePassed,
        details: [
          `Breach count (24h): ${support.summary.breachCount}`,
          `Open support cases: ${support.summary.openCases}`
        ]
      },
      {
        id: 'settlement-ledger',
        title: 'Settlement ledger exceptions',
        passed: settlementGatePassed,
        details: [
          `Exception rows: ${settlement.summary.exceptionRows}`,
          `Awaiting tracking: ${settlement.summary.awaitingTrackingRows}`,
          `Awaiting payment: ${settlement.summary.awaitingPaymentRows}`
        ]
      }
    ];

    const passedCount = gates.filter((gate) => gate.passed).length;
    const overallPassed = passedCount === gates.length;

    return NextResponse.json({
      overallPassed,
      passedCount,
      totalGates: gates.length,
      gates
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
