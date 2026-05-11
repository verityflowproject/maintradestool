'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface Props {
  ownerBusinessName: string;
  ownerFirstName: string;
}

export default function TeamAccessRevokedClient({ ownerBusinessName }: Props) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePromote() {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch('/api/user/promote-to-owner', { method: 'POST' });
      if (res.ok) {
        router.push('/onboarding');
      } else {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json?.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-card"
        style={{ maxWidth: 420, width: '100%', padding: '36px 28px', textAlign: 'center' }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--quartz-bg)',
            border: '1px solid var(--quartz-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 28,
          }}
        >
          🔒
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 12,
          }}
        >
          Your team access has ended
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
          <strong>{ownerBusinessName}</strong> has removed you from their VerityFlow team. Your
          account is still here if you&apos;d like to start your own. Otherwise, you can sign out
          below.
        </p>

        {error && (
          <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, marginBottom: 16 }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-accent"
            onClick={handlePromote}
            disabled={promoting}
          >
            {promoting ? 'Setting up…' : 'Start my own account'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
