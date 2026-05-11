'use client';

import { signOut } from 'next-auth/react';

interface Props {
  ownerBusinessName: string;
}

export default function MemberBillingExpiredClient({ ownerBusinessName }: Props) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'var(--page-bg)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h1
          style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          Access paused
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          <strong>{ownerBusinessName}&apos;s</strong> VerityFlow plan has lapsed. Ask them to
          renew to restore your access.
        </p>
        <button
          className="btn-ghost"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
