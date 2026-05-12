'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface Props {
  uid?: string;
}

export default function ExpiredClient({ uid }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResend = useCallback(async () => {
    setStatus('sending');
    try {
      const body = uid ? JSON.stringify({ uid }) : '{}';
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) {
        setStatus('sent');
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error?.toLowerCase().includes('wait') || res.status === 429) {
          setStatus('error');
        } else {
          setStatus('sent'); // generic success to avoid enumeration
        }
      }
    } catch {
      setStatus('error');
    }
  }, [uid]);

  if (status === 'sent') {
    return (
      <div className="verify-page">
        <div className="verify-card">
          <div className="verify-icon verify-icon--neutral">✉</div>
          <h1 className="verify-title">Check your inbox</h1>
          <p className="verify-body">
            We&#39;ve sent a fresh confirmation link. It expires in 48 hours.
          </p>
          <Link href="/dashboard" className="btn-accent verify-cta">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon verify-icon--warn">!</div>
        <h1 className="verify-title">Link expired or invalid</h1>
        <p className="verify-body">
          This confirmation link has expired or is no longer valid. Request a
          fresh one and you&#39;ll be up and running in minutes.
        </p>
        {status === 'error' && (
          <p className="field-error" role="alert">
            Please wait a minute before requesting another link.
          </p>
        )}
        <button
          type="button"
          className="btn-accent verify-cta"
          onClick={handleResend}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Sending…' : 'Resend confirmation email'}
        </button>
        <Link href="/dashboard" className="verify-secondary-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
