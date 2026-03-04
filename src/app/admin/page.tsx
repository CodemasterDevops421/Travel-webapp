'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Users, ShoppingBag, TrendingUp, Loader2, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '@/shared/hooks/use-auth';
import { Button } from '@/components/ui/button';

interface AdminStats {
  totalBookings: number;
  activeUsers: number;
  totalRevenue: number;
  conversionRate: string;
}

interface RecentBooking {
  id: string;
  liteapi_booking_id: string | null;
  status: string;
  created_at: string;
}

interface ReconciliationSummary {
  confirmedCount: number;
  reconciledCount: number;
  pendingCount: number;
  mismatchCount: number;
  openIssueCount: number;
  resolvedIssueCount: number;
  grossConfirmedAmount: number;
  expectedCommissionAmount: number;
  recordedCommissionAmount: number;
  varianceAmount: number;
  coveragePercent: number;
}

interface ReconciliationIssue {
  bookingId: string;
  type: 'missing_tracking' | 'amount_mismatch' | 'currency_mismatch';
  detail: string;
  createdAt: string;
  reconciliation: {
    resolved: boolean;
    resolvedAt: string | null;
    resolvedBy: string | null;
    resolutionNote: string | null;
  };
}

interface ReconciliationDrilldown {
  booking: {
    id: string;
    status: string;
    total_amount: number | null;
    commission_amount: number | null;
    currency: string | null;
    liteapi_booking_id: string | null;
    payment_status: string | null;
  };
  commission: {
    payment_log_id: string | null;
    gross_booking_value: number;
    commission_percent: number;
    commission_amount: number;
    currency: string;
    updated_at: string;
  } | null;
  latestPaymentLog: {
    provider: string;
    event_type: string;
    status: string;
    amount: number | null;
    currency: string | null;
  } | null;
  issueState: {
    resolved: boolean;
    resolvedAt: string | null;
    resolvedBy: string | null;
    resolutionNote: string | null;
  };
  reconciliation: {
    grossDelta: number | null;
    commissionDelta: number | null;
    hasTracking: boolean;
    hasPaymentLog: boolean;
  };
}

interface SupportSlaSummary {
  totalCases: number;
  openCases: number;
  forwardedCases: number;
  forwardingFailures: number;
  breachCount: number;
  averageAgeHours: number;
}

interface SupportSlaCase {
  bookingId: string;
  bookingStatus: string;
  supportRequestedAt: string;
  supportForwarded: boolean;
  supportForwardError: string | null;
  ageHours: number;
  breach: boolean;
}

interface ReadinessGate {
  id: string;
  title: string;
  passed: boolean;
  details: string[];
}

interface SupportSlaPayload {
  summary: SupportSlaSummary;
  cases: SupportSlaCase[];
}

interface ReadinessPayload {
  overallPassed: boolean;
  gates: ReadinessGate[];
}

interface SettlementSummary {
  totalRows: number;
  settledRows: number;
  awaitingTrackingRows: number;
  awaitingPaymentRows: number;
  exceptionRows: number;
}

interface SettlementEntry {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  grossAmount: number;
  commissionAmount: number;
  currency: string;
  settlementStatus: 'settled' | 'awaiting_tracking' | 'awaiting_payment' | 'exception';
  issue: string | null;
  createdAt: string;
}

interface SettlementPayload {
  summary: SettlementSummary;
  ledger: SettlementEntry[];
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciliationIssues, setReconciliationIssues] = useState<ReconciliationIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<ReconciliationIssue | null>(null);
  const [drilldown, setDrilldown] = useState<ReconciliationDrilldown | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [supportSummary, setSupportSummary] = useState<SupportSlaSummary | null>(null);
  const [supportCases, setSupportCases] = useState<SupportSlaCase[]>([]);
  const [readinessOverall, setReadinessOverall] = useState<boolean | null>(null);
  const [readinessGates, setReadinessGates] = useState<ReadinessGate[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [settlementLedger, setSettlementLedger] = useState<SettlementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [drilldownError, setDrilldownError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, reconciliationRes, supportRes, readinessRes, settlementRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/reconciliation?days=30&includeResolved=${includeResolved ? '1' : '0'}`),
        fetch('/api/admin/support/sla?days=30&breachHours=24'),
        fetch('/api/admin/readiness'),
        fetch('/api/admin/settlement/ledger?days=30')
      ]);

      if (
        statsRes.status === 403 ||
        reconciliationRes.status === 403 ||
        supportRes.status === 403 ||
        readinessRes.status === 403 ||
        settlementRes.status === 403
      ) {
        setForbidden(true);
        setError('You do not have permission to view admin data.');
        return;
      }
      if (!statsRes.ok || !reconciliationRes.ok || !supportRes.ok || !readinessRes.ok || !settlementRes.ok) {
        throw new Error('Could not load admin data.');
      }

      const [statsData, reconciliationData, supportData, readinessData, settlementData] = await Promise.all([
        statsRes.json(),
        reconciliationRes.json(),
        supportRes.json() as Promise<SupportSlaPayload>,
        readinessRes.json() as Promise<ReadinessPayload>,
        settlementRes.json() as Promise<SettlementPayload>
      ]);

      setStats(statsData.stats ?? null);
      setRecentBookings(statsData.recentBookings ?? []);
      setReconciliationSummary(reconciliationData.summary ?? null);
      setReconciliationIssues(reconciliationData.issues ?? []);
      setSupportSummary(supportData.summary ?? null);
      setSupportCases(supportData.cases ?? []);
      setReadinessOverall(readinessData.overallPassed ?? null);
      setReadinessGates(readinessData.gates ?? []);
      setSettlementSummary(settlementData.summary ?? null);
      setSettlementLedger(settlementData.ledger ?? []);
      setForbidden(false);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load admin data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  useEffect(() => {
    if (!user) return;
    void fetchDashboardData();
  }, [fetchDashboardData, user]);

  const openIssue = useCallback(async (issue: ReconciliationIssue) => {
    setSelectedIssue(issue);
    setResolutionNote(issue.reconciliation.resolutionNote ?? '');
    setDrilldown(null);
    setDrilldownError('');
    setDrilldownLoading(true);

    try {
      const res = await fetch(`/api/admin/reconciliation/${encodeURIComponent(issue.bookingId)}`);
      if (!res.ok) throw new Error('Failed to load drilldown');
      const data = (await res.json()) as ReconciliationDrilldown;
      setDrilldown(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load drilldown';
      setDrilldownError(message);
    } finally {
      setDrilldownLoading(false);
    }
  }, []);

  async function markResolved() {
    if (!selectedIssue) return;
    if (resolutionNote.trim().length < 3) {
      setDrilldownError('Resolution note must be at least 3 characters.');
      return;
    }

    setResolving(true);
    setDrilldownError('');
    try {
      const res = await fetch(`/api/admin/reconciliation/${encodeURIComponent(selectedIssue.bookingId)}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          issueType: selectedIssue.type,
          resolutionNote: resolutionNote.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to resolve issue');

      await fetchDashboardData();
      setSelectedIssue(null);
      setDrilldown(null);
      setResolutionNote('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve issue';
      setDrilldownError(message);
    } finally {
      setResolving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="space-y-4 text-center">
          <h1 className="font-heading text-2xl font-bold">Admin Access Required</h1>
          <p className="text-muted-foreground">Sign in to view the admin dashboard.</p>
          <a href="/auth/login?redirect=/admin">
            <Button>Sign in</Button>
          </a>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-heading text-2xl font-bold">Admin Access Denied</h1>
          <p className="text-muted-foreground">Your account is signed in, but it does not have an active admin role.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/">
              <Button variant="outline">Back to home</Button>
            </Link>
            <a href="/auth/login?redirect=/admin">
              <Button>Sign in as admin</Button>
            </a>
          </div>
        </div>
      </main>
    );
  }

  const statCards = [
    { title: 'Total Bookings', value: stats?.totalBookings ?? 0, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { title: 'Revenue', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { title: 'Active Users', value: stats?.activeUsers ?? 0, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { title: 'Conversion Rate', value: `${stats?.conversionRate ?? '0.0'}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Reconciliation, support SLA, and launch readiness.</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className={`rounded-xl ${card.bg} p-3`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{card.title}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h2 className="font-heading text-lg font-semibold">Launch Readiness Gates</h2>
          <p className="text-sm text-muted-foreground">
            Overall status: {readinessOverall === null ? 'unknown' : readinessOverall ? 'PASS' : 'FAIL'}
          </p>
        </div>
        <div className="p-6 space-y-3">
          {readinessGates.map((gate) => (
            <article key={gate.id} className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="font-semibold">
                {gate.passed ? 'PASS' : 'FAIL'} - {gate.title}
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {gate.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 p-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Support SLA (30 days, 24h breach)</h2>
            <p className="text-sm text-muted-foreground">Operational queue health for LiteAPI support handoffs.</p>
          </div>
          {supportSummary && supportSummary.breachCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {supportSummary.breachCount} breaches
            </span>
          ) : null}
        </div>
        {supportSummary ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Cases</p>
              <p className="mt-2 text-2xl font-bold">{supportSummary.totalCases}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Cases</p>
              <p className="mt-2 text-2xl font-bold">{supportSummary.openCases}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Forwarding Failures</p>
              <p className="mt-2 text-2xl font-bold">{supportSummary.forwardingFailures}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Age (h)</p>
              <p className="mt-2 text-2xl font-bold">{supportSummary.averageAgeHours}</p>
            </article>
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No support SLA data available.</p>
        )}
        <div className="border-t border-border/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Booking</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Age (h)</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Forwarded</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {supportCases.length > 0 ? (
                supportCases.slice(0, 10).map((row) => (
                  <tr key={row.bookingId} className="border-b border-border/20">
                    <td className="px-6 py-4 font-mono text-xs">{row.bookingId.slice(0, 8)}...</td>
                    <td className="px-6 py-4">{row.bookingStatus}</td>
                    <td className="px-6 py-4">{row.ageHours}</td>
                    <td className="px-6 py-4">{row.supportForwarded ? 'yes' : 'no'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.supportForwardError ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No support requests in period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 p-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Settlement Ledger (30 days)</h2>
            <p className="text-sm text-muted-foreground">Payout readiness view for booking, payment, and commission signals.</p>
          </div>
          {settlementSummary && settlementSummary.exceptionRows > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {settlementSummary.exceptionRows} exceptions
            </span>
          ) : null}
        </div>
        {settlementSummary ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Settled</p>
              <p className="mt-2 text-2xl font-bold">{settlementSummary.settledRows}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting Tracking</p>
              <p className="mt-2 text-2xl font-bold">{settlementSummary.awaitingTrackingRows}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting Payment</p>
              <p className="mt-2 text-2xl font-bold">{settlementSummary.awaitingPaymentRows}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Exceptions</p>
              <p className="mt-2 text-2xl font-bold">{settlementSummary.exceptionRows}</p>
            </article>
          </div>
        ) : null}
        <div className="border-t border-border/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Booking</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Gross</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Commission</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Settlement</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Issue</th>
              </tr>
            </thead>
            <tbody>
              {settlementLedger.length > 0 ? (
                settlementLedger.slice(0, 12).map((row) => (
                  <tr key={row.bookingId} className="border-b border-border/20">
                    <td className="px-6 py-4 font-mono text-xs">{row.bookingId.slice(0, 8)}...</td>
                    <td className="px-6 py-4">{row.bookingStatus}</td>
                    <td className="px-6 py-4">{row.currency} {row.grossAmount}</td>
                    <td className="px-6 py-4">{row.currency} {row.commissionAmount}</td>
                    <td className="px-6 py-4">{row.settlementStatus}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row.issue ?? '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No settlement rows in period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 p-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Revenue Reconciliation (30 days)</h2>
            <p className="text-sm text-muted-foreground">Tracks booking totals against commission tracking records.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/api/admin/reconciliation/export?days=30&includeResolved=${includeResolved ? '1' : '0'}`}>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>
        </div>

        {reconciliationSummary ? (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
              <p className="mt-2 text-2xl font-bold">{reconciliationSummary.coveragePercent}%</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Open Issues</p>
              <p className="mt-2 text-2xl font-bold">{reconciliationSummary.openIssueCount}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Variance</p>
              <p className="mt-2 text-2xl font-bold">${reconciliationSummary.varianceAmount.toLocaleString()}</p>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Volume</p>
              <p className="mt-2 text-2xl font-bold">${reconciliationSummary.grossConfirmedAmount.toLocaleString()}</p>
            </article>
          </div>
        ) : null}

        <div className="border-t border-border/40">
          <div className="flex items-center justify-between p-6">
            <h3 className="font-semibold">Exception Queue</h3>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeResolved} onChange={(event) => setIncludeResolved(event.target.checked)} />
              Show resolved
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Booking</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Issue</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">State</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Detail</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationIssues.length > 0 ? (
                  reconciliationIssues.map((issue) => (
                    <tr key={`${issue.bookingId}-${issue.type}`} className="cursor-pointer border-b border-border/20 hover:bg-muted/20" onClick={() => void openIssue(issue)}>
                      <td className="px-6 py-4 font-mono text-xs">{issue.bookingId.slice(0, 8)}...</td>
                      <td className="px-6 py-4">{issue.type}</td>
                      <td className="px-6 py-4">{issue.reconciliation.resolved ? 'resolved' : 'open'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{issue.detail}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No reconciliation issues in selected view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/40 p-6">
          <h2 className="font-heading text-lg font-semibold">Exception Drilldown</h2>
          <p className="text-sm text-muted-foreground">{selectedIssue ? `Booking ${selectedIssue.bookingId}` : 'Select an issue row to inspect and resolve.'}</p>
        </div>
        {!selectedIssue ? (
          <p className="p-6 text-sm text-muted-foreground">No issue selected.</p>
        ) : drilldownLoading ? (
          <div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : drilldownError ? (
          <p className="p-6 text-sm text-destructive">{drilldownError}</p>
        ) : drilldown ? (
          <div className="grid gap-4 p-6 lg:grid-cols-3">
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Booking</p>
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Status:</span> {drilldown.booking.status}</p>
                <p><span className="text-muted-foreground">Gross:</span> {drilldown.booking.currency ?? 'USD'} {drilldown.booking.total_amount ?? 0}</p>
                <p><span className="text-muted-foreground">Commission:</span> {drilldown.booking.currency ?? 'USD'} {drilldown.booking.commission_amount ?? 0}</p>
              </div>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracking</p>
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Gross delta:</span> {drilldown.reconciliation.grossDelta ?? '—'}</p>
                <p><span className="text-muted-foreground">Commission delta:</span> {drilldown.reconciliation.commissionDelta ?? '—'}</p>
                <p><span className="text-muted-foreground">Payment log:</span> {drilldown.reconciliation.hasPaymentLog ? 'present' : 'missing'}</p>
              </div>
            </article>
            <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolve</p>
              <textarea
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
                placeholder="Add a resolution note"
                className="mt-3 min-h-[90px] w-full rounded-md border border-border bg-background p-2 text-sm"
              />
              <Button size="sm" className="mt-3" onClick={() => void markResolved()} disabled={resolving}>
                {resolving ? 'Resolving...' : 'Mark Resolved'}
              </Button>
            </article>
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">Drilldown not available.</p>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <h2 className="font-heading text-lg font-semibold">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Booking ID</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">LiteAPI ID</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{booking.id.slice(0, 8)}...</td>
                    <td className="px-6 py-4 font-mono text-xs">{booking.liteapi_booking_id || '—'}</td>
                    <td className="px-6 py-4">{booking.status}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(booking.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No bookings yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
