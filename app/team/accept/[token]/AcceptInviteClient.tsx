'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';

const PASSWORD_RX = /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,72}$/;
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

function computeScore(p: string): number {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

interface Props {
  memberName: string;
  memberEmail: string;
  ownerFirstName: string;
  ownerBusinessName: string;
  token: string;
  memberId: string;
}

export default function AcceptInviteClient({
  memberName,
  memberEmail,
  ownerBusinessName,
  token,
  memberId,
}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(memberName.split(' ')[0] ?? memberName);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const score = useMemo(() => computeScore(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!PASSWORD_RX.test(password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, memberId, firstName: firstName.trim(), password }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (res.status === 201) {
        // Auto-sign in with retry (mirrors AccountStep.tsx pattern)
        const trySignIn = async (): Promise<boolean> => {
          const r = await signIn('credentials', {
            email: memberEmail,
            password,
            redirect: false,
          });
          if (!r?.error) return true;
          const s = await getSession();
          return !!s?.user;
        };

        let ok = await trySignIn();
        if (!ok) {
          await new Promise<void>((resolve) => setTimeout(resolve, 250));
          ok = await trySignIn();
        }

        if (ok) {
          router.push('/dashboard');
        } else {
          setError('Account created — please sign in to continue.');
        }
      } else if (res.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (res.status === 409 && json?.error === 'email_in_use') {
        setError(
          'This email is already registered on VerityFlow. Contact the team owner to resolve.',
        );
      } else {
        setError(json?.message ?? json?.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
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
        style={{ maxWidth: 420, width: '100%', padding: '32px 24px' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          Welcome to {ownerBusinessName}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
          Set up your login to access your team account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="section-label">Your email</label>
            <input
              className="input-field"
              type="email"
              value={memberEmail}
              readOnly
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label className="section-label">First name</label>
            <input
              className="input-field"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your first name"
              autoComplete="given-name"
              autoFocus
            />
          </div>

          <div>
            <label className="section-label">Create a password</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div className="strength-row" data-score={score}>
                <span className="strength-seg" />
                <span className="strength-seg" />
                <span className="strength-seg" />
                <span className="strength-seg" />
                {score > 0 && (
                  <span className="strength-label">{STRENGTH_LABELS[score]}</span>
                )}
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn-accent"
            disabled={submitting}
            style={{ marginTop: 4 }}
          >
            {submitting ? 'Setting up…' : 'Set up my account'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
          }}
        >
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--quartz-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--quartz-border)' }} />
        </div>

        <button
          className="btn-secondary"
          style={{ width: '100%' }}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          By continuing you agree to VerityFlow&apos;s terms. Your account will be linked to the{' '}
          {ownerBusinessName} workspace.
        </p>
      </div>
    </div>
  );
}
