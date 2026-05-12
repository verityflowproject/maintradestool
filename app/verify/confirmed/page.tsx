'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Client-side landing after a successful token redemption.
 * Calls updateSession() so the JWT's emailVerified flag is refreshed immediately,
 * then redirects to /dashboard without requiring a sign-out/sign-in cycle.
 */
export default function VerifyConfirmedPage() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailChange = searchParams.get('type') === 'email-change';

  useEffect(() => {
    update().finally(() => {
      router.replace(
        isEmailChange
          ? '/settings/email?changed=1'
          : '/dashboard?verified=1',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon verify-icon--success">✓</div>
        <p className="verify-body">Confirmed! Redirecting…</p>
      </div>
    </div>
  );
}
