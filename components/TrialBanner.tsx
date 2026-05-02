'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle, Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlanState } from '@/lib/hooks/usePlanState';

const HIDDEN_PATHS = [
  '/settings/billing',
  '/onboarding',
  '/invoice/',
  '/book/',
  '/billing-expired',
];
const DISMISS_KEY = 'trialBannerDismissedAt';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function recordDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

type Tier = 'neutral' | 'warning' | 'danger';

function getTier(daysLeft: number): Tier {
  if (daysLeft < 3) return 'danger';
  if (daysLeft <= 7) return 'warning';
  return 'neutral';
}

export default function TrialBanner() {
  const pathname = usePathname() ?? '';
  const { state } = usePlanState();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(isDismissed());
  }, []);

  if (!mounted || !state) return null;
  if (state.plan !== 'trial') return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const isLastDay = state.daysLeft <= 1;
  if (dismissed && !isLastDay) return null;

  const tier = getTier(state.daysLeft);

  const bannerClass = [
    'trial-banner',
    tier === 'danger' ? 'trial-banner--danger' : tier === 'warning' ? 'trial-banner--warning' : 'trial-banner--neutral',
  ].join(' ');

  const message =
    isLastDay
      ? 'Your trial ends today — upgrade now to keep access.'
      : tier === 'danger'
      ? `Only ${state.daysLeft} day${state.daysLeft !== 1 ? 's' : ''} left — upgrade now to avoid losing access.`
      : tier === 'warning'
      ? `Only ${state.daysLeft} days left in your trial. Upgrade to keep your data flowing.`
      : `${state.daysLeft} days left in your trial. Lock in 20% savings with annual.`;

  const ctaText =
    tier === 'neutral' ? 'Save 20% with Annual →' : 'Upgrade Now →';

  const Icon = tier === 'neutral' ? Clock : AlertCircle;

  function handleDismiss() {
    recordDismiss();
    setDismissed(true);
  }

  return (
    <div className={bannerClass} role="alert">
      <Icon size={14} className="trial-banner__icon" />
      <span className="trial-banner__text">{message}</span>
      <Link href="/settings/billing" className="trial-banner__link">
        {ctaText}
      </Link>
      {!isLastDay && (
        <button
          type="button"
          className="trial-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss trial banner"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
