'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlanState } from '@/lib/hooks/usePlanState';

const HIDDEN_PATHS = [
  '/settings/billing',
  '/onboarding',
  '/invoice/',
  '/book/',
  '/billing-expired',
];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

function getTimeLeft(endsAt: string): TimeLeft {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

function formatCountdown(t: TimeLeft): string {
  if (t.days > 0) return `${t.days}d ${t.hours}h ${t.minutes}m`;
  if (t.hours > 0) return `${t.hours}h ${t.minutes}m`;
  return `${t.minutes}m`;
}

export default function EarlyBirdBanner() {
  const pathname = usePathname() ?? '';
  const { state } = usePlanState();
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!state?.earlyBirdEndsAt) return;
    const endsAt = state.earlyBirdEndsAt;
    setTimeLeft(getTimeLeft(endsAt));
    const id = setInterval(() => setTimeLeft(getTimeLeft(endsAt)), 60_000);
    return () => clearInterval(id);
  }, [state?.earlyBirdEndsAt]);

  if (!mounted || !state) return null;
  if (!state.earlyBirdEligible || !state.earlyBirdEndsAt) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const countdown = formatCountdown(timeLeft);

  return (
    <div className="early-bird-banner" role="alert">
      <Zap size={14} className="early-bird-banner__icon" fill="currentColor" />
      <span className="early-bird-banner__text">
        <strong>EARLY BIRD: $19/mo — locked in forever.</strong>
        {' '}Ends in{' '}
        <span className="early-bird-banner__timer">{countdown}</span>.
        {' '}Annual: just $190/yr ($15.83/mo).
      </span>
      <Link href="/settings/billing" className="early-bird-banner__cta">
        Claim Deal →
      </Link>
    </div>
  );
}
