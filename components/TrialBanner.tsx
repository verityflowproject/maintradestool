'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlanState } from '@/lib/hooks/usePlanState';

const HIDDEN_PATHS = ['/settings/billing', '/onboarding', '/invoice/', '/book/', '/billing-expired'];
const DISMISS_KEY = 'trialBannerDismissed';

export default function TrialBanner() {
  const pathname = usePathname() ?? '';
  const { state } = usePlanState();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
    } catch {
      // sessionStorage not available
    }
  }, []);

  if (!mounted || !state) return null;

  // Only show for trial plan with <= 7 days left
  if (state.plan !== 'trial' || state.daysLeft > 7) return null;

  // Hide on certain paths
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const isLastDay = state.daysLeft === 0;

  // Dismissable unless last day
  if (dismissed && !isLastDay) return null;

  const bannerClass = [
    'trial-banner',
    state.daysLeft <= 3 ? 'trial-banner--danger' : 'trial-banner--warning',
  ].join(' ');

  const message = isLastDay
    ? 'Your trial ends today'
    : `Trial ends in ${state.daysLeft} day${state.daysLeft !== 1 ? 's' : ''}`;

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div className={bannerClass} role="alert">
      <AlertCircle size={14} className="trial-banner__icon" />
      <span className="trial-banner__text">{message}</span>
      <Link href="/settings/billing" className="trial-banner__link">
        Upgrade →
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
