'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import PlanCards from '@/components/billing/PlanCards';
import CancelFlowModal from '@/components/billing/CancelFlowModal';

interface Props {
  plan: 'trial' | 'pro' | 'cancelled' | 'expired';
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  subscriptionPlan: 'monthly' | 'annual' | null;
  subscriptionEndsAt: string | null;
  hasStripeCustomer: boolean;
  trialEndsAt: string | null;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return DATE_FMT.format(new Date(iso));
}

function getTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isExpired(iso: string | null): boolean {
  if (!iso) return true;
  return new Date(iso).getTime() < Date.now();
}

export default function BillingClient({
  plan,
  subscriptionStatus,
  subscriptionPlan,
  subscriptionEndsAt,
  trialEndsAt,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingResume, setLoadingResume] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loadingSwitchAnnual, setLoadingSwitchAnnual] = useState(false);

  // Show toast based on return from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    if (success === 'true') {
      toast.success('Subscription activated! Welcome to Pro.');
      router.replace('/settings/billing');
    } else if (cancelled === 'true') {
      toast.info('Checkout cancelled — no charges were made.');
      router.replace('/settings/billing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = useCallback(async (selectedPlan: 'monthly' | 'annual') => {
    setLoadingPlan(selectedPlan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const text = await res.text();
      // #region agent log
      fetch('http://127.0.0.1:7640/ingest/3195af90-a8fb-42a5-93e8-4e3cff3932fe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bac3eb' },
        body: JSON.stringify({
          sessionId: 'bac3eb',
          location: 'app/settings/billing/BillingClient.tsx:handleCheckout',
          message: 'checkout response received',
          data: { status: res.status, ok: res.ok, bodyPreview: text.slice(0, 500), contentType: res.headers.get('content-type') },
          hypothesisId: 'A,B,C,D,E',
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      let data: { url?: string; error?: string; detail?: string } | null = null;
      try {
        data = JSON.parse(text) as { url?: string; error?: string; detail?: string };
      } catch {
        data = null;
      }

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      const errMsg = data?.error
        ? data.detail
          ? `${data.error}: ${data.detail}`
          : data.error
        : `Checkout failed (${res.status}). ${text.slice(0, 120)}`;
      console.error('[checkout] failed', { status: res.status, body: text });
      toast.error(errMsg);
      setLoadingPlan(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      // #region agent log
      fetch('http://127.0.0.1:7640/ingest/3195af90-a8fb-42a5-93e8-4e3cff3932fe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bac3eb' },
        body: JSON.stringify({
          sessionId: 'bac3eb',
          location: 'app/settings/billing/BillingClient.tsx:handleCheckout-catch',
          message: 'checkout fetch threw',
          data: { error: msg },
          hypothesisId: 'A,B,C,D,E',
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error('[checkout] fetch threw', e);
      toast.error(`Something went wrong: ${msg}`);
      setLoadingPlan(null);
    }
  }, [toast]);

  const handlePortal = useCallback(async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? 'Could not open billing portal.');
        setLoadingPortal(false);
      }
    } catch {
      toast.error('Something went wrong.');
      setLoadingPortal(false);
    }
  }, [toast]);

  const handleSwitchToAnnual = useCallback(async () => {
    setLoadingSwitchAnnual(true);
    try {
      const res = await fetch('/api/billing/switch-to-annual', { method: 'POST' });
      if (res.ok) {
        toast.success("Switched to annual — you're saving $58/yr!");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Could not switch plans.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoadingSwitchAnnual(false);
    }
  }, [toast, router]);

  const handleResume = useCallback(async () => {
    setLoadingResume(true);
    try {
      const res = await fetch('/api/billing/resume', { method: 'POST' });
      if (res.ok) {
        toast.success('Subscription reactivated!');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to resume subscription.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoadingResume(false);
    }
  }, [toast, router]);

  // Determine which state we're in
  const isProActive = plan === 'pro' && subscriptionStatus === 'active';
  const isCancelledPending =
    subscriptionStatus === 'canceled' && !isExpired(subscriptionEndsAt);
  const isPastDue = subscriptionStatus === 'past_due';
  const trialDays = getTrialDaysLeft(trialEndsAt);

  // Show plan selection when no active Pro subscription
  const showPlanSelection =
    plan === 'trial' || isPastDue || (!isProActive && !isCancelledPending);

  return (
    <div className="settings-page page-padding">
      {/* Header */}
      <div className="settings-page__header">
        <Link href="/settings" className="icon-btn" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Subscription</h1>
      </div>

      {/* Current plan card */}
      <div className="glass-card billing-status-card">
        {/* Trial */}
        {plan === 'trial' && (
          <>
            <p className="billing-status-title">Trial</p>
            <p className="billing-status-sub billing-status-sub--warning">
              {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
            </p>
            <p className="billing-status-sub">
              After your trial, choose a plan to continue using VerityFlow.
            </p>
          </>
        )}

        {/* Pro active */}
        {isProActive && (
          <>
            <p className="billing-status-title billing-status-title--pro">Pro</p>
            <p className="billing-status-sub">
              {subscriptionPlan === 'monthly' ? 'Monthly' : 'Annual'} ·{' '}
              renews {formatDate(subscriptionEndsAt)}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="billing-manage-link"
                onClick={handlePortal}
                disabled={loadingPortal}
              >
                {loadingPortal ? 'Opening…' : 'Update payment →'}
              </button>
              <button
                className="billing-manage-link"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setShowCancelModal(true)}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Pro cancelled, still has access */}
        {isCancelledPending && (
          <>
            <p className="billing-status-title billing-status-title--warning">Pro (Cancelled)</p>
            <p className="billing-status-sub">
              Access ends {formatDate(subscriptionEndsAt)}
            </p>
            <button
              className="btn-accent"
              style={{ width: '100%', marginTop: 4 }}
              onClick={handleResume}
              disabled={loadingResume}
            >
              {loadingResume ? 'Resuming…' : 'Resume Subscription'}
            </button>
          </>
        )}

        {/* Past due */}
        {isPastDue && (
          <>
            <p className="billing-status-title" style={{ color: 'var(--danger)' }}>
              Payment Failed
            </p>
            <p className="billing-status-sub">
              We could not process your last payment. Please update your payment method.
            </p>
            <button
              className="btn-accent"
              style={{ width: '100%', marginTop: 4 }}
              onClick={handlePortal}
              disabled={loadingPortal}
            >
              {loadingPortal ? 'Opening…' : 'Update Payment Method'}
            </button>
          </>
        )}

        {/* No active / expired cancelled */}
        {plan === 'cancelled' && !isCancelledPending && !isPastDue && (
          <>
            <p className="billing-status-title billing-status-title--muted">
              No Active Subscription
            </p>
            <p className="billing-status-sub">
              Subscribe to restore full access.
            </p>
          </>
        )}
      </div>

      {/* Annual upsell — only for active monthly Pro users */}
      {isProActive && subscriptionPlan === 'monthly' && (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderColor: 'rgba(30,144,255,0.3)',
            background: 'rgba(30,144,255,0.05)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Switch to annual — save $58/yr
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              $24/mo instead of $29/mo. We'll prorate your current period.
            </p>
          </div>
          <button
            className="btn-accent"
            style={{ padding: '8px 14px', whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={handleSwitchToAnnual}
            disabled={loadingSwitchAnnual}
          >
            {loadingSwitchAnnual ? 'Switching…' : 'Save 20%'}
          </button>
        </div>
      )}

      {/* Plan selection — shown when not actively subscribed */}
      {showPlanSelection && (
        <>
          <p className="settings-section-heading" style={{ marginBottom: 12 }}>
            CHOOSE A PLAN
          </p>
          <PlanCards onSelect={handleCheckout} loadingPlan={loadingPlan} />
        </>
      )}

      {/* Cancel flow modal */}
      {showCancelModal && (
        <CancelFlowModal
          subscriptionPlan={subscriptionPlan}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
