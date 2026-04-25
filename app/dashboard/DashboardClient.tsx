'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Bell, ChevronRight, Mic, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { PlanState } from '@/lib/planState';

// ── Types ──────────────────────────────────────────────────────────────

interface RecentJob {
  _id: string;
  title: string;
  status: string;
  customerName: string;
  total: number;
  createdAt: string;
  aiParsed: boolean;
  invoiceId: string | null;
}

interface WeekDay {
  date: string;
  total: number;
}

interface DashboardData {
  jobsToday: number;
  earnedToday: number;
  unpaidCount: number;
  unpaidTotal: number;
  overdueCount: number;
  newRequestsCount: number;
  recentJobs: RecentJob[];
  weeklyEarnings: WeekDay[];
}

interface Props {
  firstName: string;
  businessName: string;
  planState: PlanState;
  trialEndsAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function updatedAgo(lastUpdated: Date | null): string {
  if (!lastUpdated) return '';
  const sec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `Updated ${min}m ago`;
}

function greetPrefix(now: Date): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

// ── Skeleton components ────────────────────────────────────────────────

function SkeletonStats() {
  return (
    <div className="dashboard-stats">
      <div className="skeleton-shimmer skeleton-tile" />
      <div className="skeleton-shimmer skeleton-tile" />
      <div className="skeleton-shimmer skeleton-tile" />
    </div>
  );
}

function SkeletonSparkline() {
  return <div className="skeleton-shimmer skeleton-sparkline" />;
}

function SkeletonRecentJobs() {
  return (
    <div className="recent-jobs-list">
      <div className="skeleton-shimmer skeleton-recent-card" />
      <div className="skeleton-shimmer skeleton-recent-card" />
      <div className="skeleton-shimmer skeleton-recent-card" />
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────

function Sparkline({ data }: { data: WeekDay[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="sparkline">
      {data.map((d) => {
        const isToday = d.date === todayStr;
        const isZero = d.total === 0;
        const heightPct = isZero ? 3 : Math.max((d.total / max) * 100, 3);
        const cls = `sparkline__bar${isToday ? ' is-today' : ''}${isZero ? ' is-zero' : ''}`;
        return (
          <div key={d.date} className="sparkline__col">
            <div
              className={cls}
              style={{ height: `${heightPct}%` }}
              title={formatCurrency(d.total)}
            />
            <span className="sparkline__label">
              {DAY_LETTERS[new Date(d.date + 'T12:00:00').getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Plan badge ─────────────────────────────────────────────────────────

function PlanBadge({ planState, trialEndsAt }: { planState: PlanState; trialEndsAt: string | null }) {
  if (planState.plan === 'pro' || (planState.plan === 'cancelled_active' && planState.isActive)) {
    return <span className="plan-badge plan-badge--pro">Pro</span>;
  }
  if (planState.plan === 'cancelled_expired') {
    return <span className="plan-badge plan-badge--cancelled">Cancelled</span>;
  }
  if (planState.plan === 'expired') {
    return <span className="plan-badge plan-badge--cancelled">Expired</span>;
  }
  const days = trialDaysLeft(trialEndsAt);
  return (
    <span className="plan-badge plan-badge--trial">
      Trial · {days} day{days !== 1 ? 's' : ''} left
    </span>
  );
}

// ── StatusBadge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

// ── DashboardClient ────────────────────────────────────────────────────

export default function DashboardClient({ firstName, businessName, planState, trialEndsAt }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Full fetch — shows loading skeleton on first load, spinner on manual refresh
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = (await res.json()) as DashboardData;
        setData(json);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Silent refresh — updates data without toggling the skeleton
  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = (await res.json()) as DashboardData;
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // ignore background errors
    }
  }, []);

  // Initial load + 30s auto-refresh interval
  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void silentRefresh(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData, silentRefresh]);

  // Refresh when the tab regains focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void silentRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [silentRefresh]);

  // Tick every 10s to recompute "Updated Xs ago" without extra fetches
  useEffect(() => {
    const ticker = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(ticker);
  }, []);

  const now = new Date();
  const greeting = greetPrefix(now);
  const weekTotal = data?.weeklyEarnings.reduce((s, d) => s + d.total, 0) ?? 0;

  return (
    <div className="dashboard-wrap">
      {/* Top bar */}
      <div className="dashboard-top">
        <div className="dashboard-greeting">
          <span className="greeting-pre">Good {greeting},</span>
          <span className="greeting-name">{firstName || 'there'}.</span>
          {businessName && <span className="greeting-biz">{businessName}</span>}
        </div>
        <div className="dashboard-top-right">
          <PlanBadge planState={planState} trialEndsAt={trialEndsAt} />
          {lastUpdated && (
            <span className="dashboard-updated">{updatedAgo(lastUpdated)}</span>
          )}
          <button
            className="dashboard-refresh"
            onClick={() => void fetchData()}
            aria-label="Refresh dashboard"
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={`dashboard-refresh__icon${loading ? ' spinning' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Overdue alert */}
      {data && data.overdueCount > 0 && (
        <div className="dashboard-overdue glass-card">
          <AlertCircle size={16} className="dashboard-overdue__icon" />
          <span className="dashboard-overdue__text">
            {data.overdueCount} invoice{data.overdueCount !== 1 ? 's' : ''} overdue
          </span>
          <Link href="/invoices?filter=overdue" className="dashboard-overdue__link">
            View →
          </Link>
        </div>
      )}

      {/* New requests alert */}
      {data && data.newRequestsCount > 0 && (
        <div className="dashboard-requests-alert glass-card">
          <Bell size={16} className="dashboard-requests-alert__icon" />
          <span className="dashboard-requests-alert__text">
            You have {data.newRequestsCount} new job request{data.newRequestsCount !== 1 ? 's' : ''}
          </span>
          <Link href="/requests" className="dashboard-requests-alert__link">
            View Requests →
          </Link>
        </div>
      )}

      {/* Stat tiles */}
      {loading && !data ? (
        <SkeletonStats />
      ) : (
        <div className="dashboard-stats">
          {/* Jobs Today */}
          <div className="glass-card stat-tile-dash">
            <span className="stat-tile-dash__value">{data?.jobsToday ?? 0}</span>
            <span className="stat-tile-dash__label">Jobs Today</span>
          </div>

          {/* Earned Today */}
          <div className="glass-card stat-tile-dash">
            <span
              className="stat-tile-dash__value"
              style={{ color: (data?.earnedToday ?? 0) > 0 ? 'var(--accent-text)' : 'var(--text-muted)' }}
            >
              {(data?.earnedToday ?? 0) > 0 ? formatCurrency(data!.earnedToday) : '—'}
            </span>
            <span className="stat-tile-dash__label">Earned Today</span>
          </div>

          {/* Unpaid */}
          <div className="glass-card stat-tile-dash stat-tile-dash--relative">
            {(data?.unpaidCount ?? 0) > 0 && (
              <span className="stat-tile-dash__dot" aria-hidden />
            )}
            <span
              className="stat-tile-dash__value"
              style={{ color: (data?.unpaidTotal ?? 0) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}
            >
              {(data?.unpaidTotal ?? 0) > 0 ? formatCurrency(data!.unpaidTotal) : '—'}
            </span>
            <span className="stat-tile-dash__label">Unpaid</span>
          </div>
        </div>
      )}

      {/* Weekly earnings sparkline */}
      <div className="glass-card weekly-card">
        <div className="weekly-card__head">
          <span className="weekly-card__title">This Week</span>
          <span className="weekly-card__total">{formatCurrency(weekTotal)}</span>
        </div>
        {loading && !data ? (
          <SkeletonSparkline />
        ) : (
          <Sparkline data={data?.weeklyEarnings ?? []} />
        )}
      </div>

      {/* Quick Log CTA */}
      {planState.isActive ? (
        <Link href="/jobs/new/voice" className="quick-log-cta-dash">
          <div className="quick-log-cta-dash__circle">
            <Mic size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="quick-log-cta-dash__body">
            <span className="quick-log-cta-dash__title">Log a Job</span>
            <span className="quick-log-cta-dash__sub">Voice → invoice in seconds</span>
          </div>
          <ChevronRight size={20} className="quick-log-cta-dash__chevron" />
        </Link>
      ) : (
        <div className="quick-log-cta-dash quick-log-cta-dash--expired">
          <div className="quick-log-cta-dash__body">
            <span className="quick-log-cta-dash__title">Your trial has ended</span>
            <span className="quick-log-cta-dash__sub">Upgrade to keep logging jobs.</span>
          </div>
          <Link href="/settings/billing" className="btn-accent" style={{ padding: '8px 16px', fontSize: 13 }}>
            See Plans
          </Link>
        </div>
      )}

      {/* Recent Jobs */}
      <section className="recent-jobs">
        <div className="recent-jobs__head">
          <h2 className="recent-jobs__title">Recent Jobs</h2>
          <Link href="/jobs" className="recent-jobs__see-all accent-link">
            See all →
          </Link>
        </div>

        {loading && !data ? (
          <SkeletonRecentJobs />
        ) : !data?.recentJobs.length ? (
          <p className="recent-jobs__empty">
            No jobs yet. Tap the mic above to log your first job.
          </p>
        ) : (
          <div className="recent-jobs-list">
            {data.recentJobs.map((job) => (
              <Link key={job._id} href={`/jobs/${job._id}`} className="glass-card recent-job-card">
                <div className="recent-job-card__top">
                  <span className="recent-job-card__title">{job.title || 'Untitled Job'}</span>
                  {job.total > 0 && (
                    <span className="recent-job-card__total">{formatCurrency(job.total)}</span>
                  )}
                </div>
                <div className="recent-job-card__bottom">
                  {job.customerName && (
                    <span className="recent-job-card__customer">{job.customerName}</span>
                  )}
                  <StatusBadge status={job.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
