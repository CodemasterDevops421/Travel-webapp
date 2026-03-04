'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Users, ShoppingBag, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

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
    metadata: Record<string, unknown> | null;
}

interface ReconciliationSummary {
    confirmedCount: number;
    reconciledCount: number;
    pendingCount: number;
    mismatchCount: number;
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
}

export default function AdminPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
    const [reconciliationIssues, setReconciliationIssues] = useState<ReconciliationIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [forbidden, setForbidden] = useState(false);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [statsRes, reconciliationRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/reconciliation')
                ]);

                if (statsRes.status === 403 || reconciliationRes.status === 403) {
                    setForbidden(true);
                    setError('You do not have permission to view admin data.');
                    return;
                }
                if (!statsRes.ok || !reconciliationRes.ok) throw new Error('failed');

                const [statsData, reconciliationData] = await Promise.all([statsRes.json(), reconciliationRes.json()]);
                setStats(statsData.stats);
                setRecentBookings(statsData.recentBookings || []);
                setReconciliationSummary(reconciliationData.summary || null);
                setReconciliationIssues(reconciliationData.issues || []);
                setForbidden(false);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'failed';
                setError(message === 'forbidden' ? 'You do not have permission to view admin data.' : 'Could not load admin data.');
            } finally {
                setLoading(false);
            }
        }

        if (user) fetchStats();
    }, [user]);

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
                <div className="text-center space-y-4">
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

    const commissionPercent = 12; // mirrors env.PRICE_MARKUP_PERCENT default

    const statCards = [
        {
            title: 'Total Bookings',
            value: stats?.totalBookings ?? 0,
            icon: ShoppingBag,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/30'
        },
        {
            title: 'Revenue',
            value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30'
        },
        {
            title: 'Active Users',
            value: stats?.activeUsers ?? 0,
            icon: Users,
            color: 'text-violet-500',
            bg: 'bg-violet-50 dark:bg-violet-950/30'
        },
        {
            title: 'Conversion Rate',
            value: `${stats?.conversionRate ?? '0.0'}%`,
            icon: TrendingUp,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/30'
        }
    ];

    return (
        <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Commission rate: {commissionPercent}%</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                {statCards.map((card) => (
                    <article
                        key={card.title}
                        className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`rounded-xl ${card.bg} p-3`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{card.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
                    </article>
                ))}
            </div>

            {/* Recent Bookings Table */}
            <section className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
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
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${booking.status === 'confirmed'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : booking.status === 'cancelled'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}
                                            >
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        No bookings yet
                                    </td>
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
                    {reconciliationSummary && reconciliationSummary.mismatchCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {reconciliationSummary.mismatchCount} mismatches
                        </span>
                    ) : null}
                </div>

                {reconciliationSummary ? (
                    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                        <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                            <p className="mt-2 text-2xl font-bold">{reconciliationSummary.coveragePercent}%</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {reconciliationSummary.reconciledCount}/{reconciliationSummary.confirmedCount} confirmed bookings tracked
                            </p>
                        </article>
                        <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Tracking</p>
                            <p className="mt-2 text-2xl font-bold">{reconciliationSummary.pendingCount}</p>
                            <p className="text-xs text-muted-foreground mt-1">Confirmed bookings missing tracking records</p>
                        </article>
                        <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Commission Variance</p>
                            <p className="mt-2 text-2xl font-bold">${reconciliationSummary.varianceAmount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Expected - recorded commission</p>
                        </article>
                        <article className="rounded-xl border border-border/50 bg-muted/20 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Confirmed Volume</p>
                            <p className="mt-2 text-2xl font-bold">${reconciliationSummary.grossConfirmedAmount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total booking value in period</p>
                        </article>
                    </div>
                ) : (
                    <p className="p-6 text-sm text-muted-foreground">No reconciliation data available yet.</p>
                )}

                <div className="border-t border-border/40">
                    <div className="flex items-center justify-between p-6">
                        <h3 className="font-semibold">Open Reconciliation Issues</h3>
                        <span className="text-sm text-muted-foreground">{reconciliationIssues.length} showing</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/30">
                                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Booking</th>
                                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Issue</th>
                                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Detail</th>
                                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reconciliationIssues.length > 0 ? (
                                    reconciliationIssues.map((issue) => (
                                        <tr key={`${issue.bookingId}-${issue.type}`} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs">{issue.bookingId.slice(0, 8)}...</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                    {issue.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">{issue.detail}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{new Date(issue.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            No open reconciliation issues in the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    );
}
