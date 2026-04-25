'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import PlanCards from '@/components/billing/PlanCards';
import { useToast } from '@/components/Toast/ToastProvider';

interface Props {
  jobCount: number;
  customerCount: number;
  invoiceCount: number;
  reason: 'expired' | 'past_due';
  hasStripeCustomer: boolean;
}

export default function BillingExpiredClient({
  jobCount,
  customerCount,
  invoiceCount,
  reason,
  hasStripeCustomer,
}: Props) {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleCheckout = useCallback(
    async (plan: 'monthly' | 'annual') => {
      setLoadingPlan(plan);
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (res.ok && data.url) {
          window.location.href = data.url;
        } else {
          toast.error(data.error ?? 'Could not start checkout.');
          setLoadingPlan(null);
        }
      } catch {
        toast.error('Something went wrong.');
        setLoadingPlan(null);
      }
    },
    [toast],
  );

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

  const isPastDue = reason === 'past_due';

  return (
    <div className="billing-expired-page page-padding">
      <div className="billing-expired__icon">
        <Lock size={64} style={{ color: 'var(--accent)' }} />
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: 24,
          margin: '20px 0 12px',
          textAlign: 'center',
        }}
      >
        {isPastDue
          ? "We couldn't process your payment."
          : 'Your TradesBrain trial has ended.'}
      </h1>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: 15,
          lineHeight: 1.6,
          textAlign: 'center',
          margin: '0 0 8px',
        }}
      >
        {isPastDue
          ? 'Update your payment method to restore full access.'
          : 'Your data is safe. Subscribe to Pro to continue working.'}
      </p>

      <p className="billing-expired__stats">
        {jobCount} job{jobCount !== 1 ? 's' : ''} ·{' '}
        {customerCount} customer{customerCount !== 1 ? 's' : ''} ·{' '}
        {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} waiting for you
      </p>

      {isPastDue && hasStripeCustomer ? (
        <div style={{ width: '100%', marginTop: 24 }}>
          <button
            className="btn-accent step-cta"
            onClick={handlePortal}
            disabled={loadingPortal}
          >
            {loadingPortal ? 'Opening…' : 'Update Payment Method'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 24, width: '100%' }}>
          <PlanCards onSelect={handleCheckout} loadingPlan={loadingPlan} />
        </div>
      )}

      <Link
        href="/settings"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 20,
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Maybe later
      </Link>
    </div>
  );
}
