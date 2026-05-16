'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

/**
 * Client-side landing after a successful token redemption.
 * Calls updateSession() so the JWT's emailVerified flag is refreshed immediately,
 * then performs a hard navigation to /dashboard so the Router Cache is bypassed
 * and the fresh session cookie is read by the server on the next load.
 */
export default function VerifyConfirmedPage() {
  const { update } = useSession();
  const searchParams = useSearchParams();
  const isEmailChange = searchParams.get('type') === 'email-change';

  useEffect(() => {
    const destination = isEmailChange
      ? '/settings/email?changed=1'
      : '/dashboard?verified=1';

    update()
      .then(() => {
        window.location.href = destination;
      })
      .catch(() => {
        // update() failed — hard-nav anyway; the server will re-read the DB
        // on the fresh load and the session will reflect the verified state.
        window.location.href = destination;
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
