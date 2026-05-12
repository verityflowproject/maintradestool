'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Mail, X } from 'lucide-react';

const HIDDEN_PATHS = [
  '/onboarding',
  '/verify',
  '/book/',
  '/invoice/',
  '/billing-expired',
  '/team-access-revoked',
];

const DISMISS_KEY = 'emailVerifyBannerDismissed';

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function recordDismiss() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const masked = '*'.repeat(Math.max(0, local.length - visible.length));
  return `${visible}${masked}@${domain}`;
}

export default function EmailVerificationBanner() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? '';
  const router = useRouter();

  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(isDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    recordDismiss();
    setDismissed(true);
  }, []);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }, []);

  if (!mounted) return null;
  if (!session?.user) return null;
  if (session.user.emailVerified) return null;
  // Members are always verified (team invite = proof of inbox)
  if (session.user.accountType === 'member') return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  if (dismissed) return null;

  const maskedEmail = maskEmail(session.user.email ?? '');

  return (
    <div className="email-verify-banner" role="alert">
      <Mail size={14} className="email-verify-banner__icon" aria-hidden />
      <span className="email-verify-banner__text">
        Confirm your email to unlock VerityFlow. We sent a link to{' '}
        <strong>{maskedEmail}</strong>.
      </span>
      <div className="email-verify-banner__actions">
        {resent ? (
          <span className="email-verify-banner__sent">Sent ✓</span>
        ) : (
          <button
            type="button"
            className="email-verify-banner__btn"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Resend'}
          </button>
        )}
        <button
          type="button"
          className="email-verify-banner__btn"
          onClick={() => router.push('/settings/email')}
        >
          Change email
        </button>
      </div>
      <button
        type="button"
        className="email-verify-banner__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss verification banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
