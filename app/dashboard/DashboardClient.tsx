'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, Bell, ChevronRight, Mic, RefreshCw } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { PlanState } from '@/lib/planState';
import type { TeamMemberRole } from '@/lib/team/roles';
import CardCaptureNudge from '@/components/billing/CardCaptureNudge';
import VerifyEmailModal from '@/components/VerifyEmailModal';

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

interface TeamWorkloadEntry {
  memberId: string;
  name: string;
  color: string;
  avatarInitials: string;
  activeJobs: number;
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

interface ShippedCallout {
  _id: string;
  title: string;
  description: string;
}

interface MemberStats {
  activeJobs: number;
  jobsAssignedToday: number;
}

interface Props {
  firstName: string;
  businessName: string;
  planState: PlanState;
  trialEndsAt: string | null;
  hasRecentFeatureRequest?: boolean;
  shippedCallouts?: ShippedCallout[];
  teamWorkload?: TeamWorkloadEntry[];
  role?: TeamMemberRole | 'owner';
  accountType?: 'owner' | 'member';
  memberStats?: MemberStats | null;
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

// ── Weekly area chart ──────────────────────────────────────────────────

function WeeklyTooltip({
  active,
  payload,
  label,
}: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card"
      style={{ padding: '8px 14px', fontSize: 12, lineHeight: 1.5, pointerEvents: 'none' }}
    >
      <p style={{ color: 'var(--text-muted)', margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: 'var(--accent-text)', fontWeight: 700, margin: 0 }}>
        {formatCurrency((payload[0]?.payload?.earned as number | undefined) ?? (payload[0]?.value as number | undefined) ?? 0)}
      </p>
    </div>
  );
}

function WeeklyAreaChart({ data }: { data: WeekDay[] }) {
  const chartData = data.map((d) => ({
    day: DAY_LETTERS[new Date(d.date + 'T12:00:00').getDay()],
    date: d.date,
    earned: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-dm-sans)' }}
        />
        <Tooltip
          content={<WeeklyTooltip />}
          cursor={{ stroke: 'var(--quartz-border)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="earned"
          stroke="var(--accent)"
          strokeWidth={2.5}
          fill="url(#weeklyFill)"
          dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--accent-text)', stroke: 'var(--accent)', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1100}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
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

interface PayrollMeData {
  hoursLogged: number;
  gross: number;
  ratePerHour: number;
  hasRate: boolean;
  ownerBusinessName: string | null;
}

export default function DashboardClient({ firstName, businessName, planState, trialEndsAt, hasRecentFeatureRequest = false, shippedCallouts = [], teamWorkload = [], role = 'owner', accountType = 'owner', memberStats = null }: Props) {
  const isMember = accountType === 'member';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [visibleCallouts, setVisibleCallouts] = useState<ShippedCallout[]>(shippedCallouts);
  const [payrollMe, setPayrollMe] = useState<PayrollMeData | null>(null);

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

  // Fetch member payroll estimate (tech/lead only)
  useEffect(() => {
    if (!isMember || role === 'apprentice' || role === 'office') return;
    fetch('/api/payroll/me?period=current')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PayrollMeData | null) => { if (d) setPayrollMe(d); })
      .catch(() => null);
  }, [isMember, role]);

  const now = new Date();
  const greeting = greetPrefix(now);
  const weekTotal = data?.weeklyEarnings.reduce((s, d) => s + d.total, 0) ?? 0;

  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    if (
      searchParams?.get('verify_required') === '1' &&
      session?.user?.emailVerified === false
    ) {
      setShowVerifyModal(true);
    }
  }, [searchParams, session?.user?.emailVerified]);

  return (
    <div className="dashboard-wrap">
      {showVerifyModal && (
        <VerifyEmailModal
          onClose={() => setShowVerifyModal(false)}
          message="This feature unlocks once you confirm your email address."
        />
      )}
      {/* Top bar */}
      <div className="dashboard-top">
        <div className="dashboard-greeting">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Image
              src="/logo/verityflow-icon.png"
              alt="VerityFlow"
              width={28}
              height={28}
              style={{ borderRadius: 6 }}
            />
            <span className="greeting-pre">Good {greeting},</span>
          </div>
          <span className="greeting-name">{firstName || 'there'}.</span>
          {businessName && <span className="greeting-biz">{businessName}</span>}
        </div>
        <div className="dashboard-top-right">
          {/* Members inherit owner's plan — don't show their own trial badge */}
          {!isMember && <PlanBadge planState={planState} trialEndsAt={trialEndsAt} />}
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

      {/* Stat tiles — owner vs member layouts */}
      {isMember ? (
        <div className="dashboard-stats">
          <div className="glass-card stat-tile-dash">
            <span className="stat-tile-dash__value">{memberStats?.jobsAssignedToday ?? 0}</span>
            <span className="stat-tile-dash__label">Jobs Today</span>
          </div>
          <div className="glass-card stat-tile-dash">
            <span className="stat-tile-dash__value">{memberStats?.activeJobs ?? 0}</span>
            <span className="stat-tile-dash__label">Active Jobs</span>
          </div>
          {/* Lead sees revenue; tech/apprentice see active job count as third tile */}
          {role === 'lead' ? (
            <div className="glass-card stat-tile-dash">
              <span className="stat-tile-dash__value">{loading ? '—' : formatCurrency(data?.earnedToday ?? 0)}</span>
              <span className="stat-tile-dash__label">Earned Today</span>
            </div>
          ) : (
            <div className="glass-card stat-tile-dash">
              <span className="stat-tile-dash__value">{loading ? '—' : (data?.jobsToday ?? 0)}</span>
              <span className="stat-tile-dash__label">New Jobs</span>
            </div>
          )}
        </div>
      ) : (
        loading && !data ? (
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
        )
      )}

      {/* Member earnings card — tech/lead */}
      {isMember && payrollMe && role !== 'apprentice' && (
        <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              This Pay Period
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-text)' }}>
              {payrollMe.hasRate ? formatCurrency(payrollMe.gross) : `${payrollMe.hoursLogged.toFixed(1)}h logged`}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {payrollMe.hasRate
              ? `${payrollMe.hoursLogged.toFixed(1)}h × $${payrollMe.ratePerHour}/hr · Estimate — final pay determined by ${payrollMe.ownerBusinessName ?? 'your employer'}`
              : `Hourly rate not yet set by ${payrollMe.ownerBusinessName ?? 'your employer'}`
            }
          </p>
        </div>
      )}

      {/* Weekly earnings area chart — owner only */}
      {!isMember && (
        <div className="glass-card weekly-card">
          <div className="weekly-card__head">
            <span className="weekly-card__title">This Week</span>
            <span className="weekly-card__total">{formatCurrency(weekTotal)}</span>
          </div>
          {loading && !data ? (
            <SkeletonSparkline />
          ) : (
            <WeeklyAreaChart data={data?.weeklyEarnings ?? []} />
          )}
        </div>
      )}

      {/* ── Team workload card ─────────────────────────────────────── */}
      {teamWorkload.length > 0 && (
        <Link href="/team" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Team workload
              </span>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teamWorkload.map((m) => (
                <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {m.avatarInitials}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: m.activeJobs > 0 ? 'var(--accent-text)' : 'var(--text-muted)',
                      background: m.activeJobs > 0 ? 'var(--accent-dim)' : 'var(--quartz-bg)',
                      border: `1px solid ${m.activeJobs > 0 ? 'var(--accent)' : 'var(--quartz-border)'}`,
                      borderRadius: 6,
                      padding: '2px 8px',
                    }}
                  >
                    {m.activeJobs} active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Quick Log CTA — owners only; members use the FAB in BottomNav */}
      {!isMember && (
        planState.isActive ? (
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
        )
      )}

      {/* Ship callouts — owners only */}
      {!isMember && visibleCallouts.map((callout) => (
        <div key={callout._id} className="dashboard-ship-callout">
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.2rem' }}>
              🚀 Your idea shipped: <span style={{ fontWeight: 400 }}>{callout.title || callout.description}</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Thanks for shaping VerityFlow! Check the feature board for more.
            </p>
          </div>
          <button
            aria-label="Dismiss"
            onClick={() => {
              setVisibleCallouts((prev) => prev.filter((c) => c._id !== callout._id));
              fetch(`/api/contact/${callout._id}/dismiss-ship`, { method: 'POST' }).catch(console.error);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0 0 0 0.5rem',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Feature request banner — owners only */}
      {!isMember && (hasRecentFeatureRequest ? (
        <Link href="/feature-board" className="dashboard-feature-banner dashboard-feature-banner--queued">
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, margin: '0 0 0.2rem', fontSize: '0.9rem' }}>Your idea is in the queue 🙌</p>
            <p style={{ fontSize: '0.78rem', opacity: 0.8, margin: 0 }}>See all community features and vote on your favourites</p>
          </div>
          <ChevronRight size={18} />
        </Link>
      ) : (
        <Link href="/contact?type=feature" className="dashboard-feature-banner">
          <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>💡</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, margin: '0 0 0.2rem', fontSize: '0.9rem' }}>Got an idea?</p>
            <p style={{ fontSize: '0.78rem', opacity: 0.8, margin: 0 }}>Share a feature request — we build what trades need</p>
          </div>
          <ChevronRight size={18} />
        </Link>
      ))}

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

      {/* Card capture nudge — shown once after first job logged on trial (owner only) */}
      {!isMember && (
        <CardCaptureNudge
          jobsLogged={data?.recentJobs.length ?? 0}
          planIsTrial={planState.plan === 'trial'}
        />
      )}
    </div>
  );
}
