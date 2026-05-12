'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Mail } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import { validateEmail } from '@/lib/utils/validators';

interface Props {
  currentEmail: string;
  hasPassword: boolean;
  /** Non-null when a pendingEmailChange is already in flight. */
  pendingNewEmail: string | null;
}

export default function EmailSettingsClient({
  currentEmail,
  hasPassword,
  pendingNewEmail: initialPending,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { update: updateSession } = useSession();

  const [pendingNewEmail, setPendingNewEmail] = useState(initialPending);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resentFor, setResentFor] = useState('');

  const handleSave = useCallback(async () => {
    const errs: typeof errors = {};
    const emailErr = validateEmail(newEmail.trim().toLowerCase());
    if (emailErr) errs.email = emailErr;
    if (!currentPassword && hasPassword) errs.password = 'Current password is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase(), currentPassword }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        pendingEmailChange?: boolean;
        message?: string;
        error?: string;
      };

      if (res.ok && data.pendingEmailChange) {
        setPendingNewEmail(newEmail.trim().toLowerCase());
        setNewEmail('');
        setCurrentPassword('');
        toast.success(data.message ?? 'Confirmation email sent. Check your inbox.');
        await updateSession();
      } else if (res.ok) {
        await updateSession();
        toast.success('Email updated.');
        router.push('/settings');
      } else {
        if (data.error?.toLowerCase().includes('password')) {
          setErrors({ password: data.error });
        } else if (data.error) {
          setErrors({ email: data.error });
        } else {
          toast.error('Failed to update email.');
        }
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [newEmail, currentPassword, hasPassword, toast, updateSession, router]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelEmailChange: true }),
      });
      setPendingNewEmail(null);
      toast.success('Email change cancelled.');
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setCancelling(false);
    }
  }, [toast]);

  const handleResend = useCallback(async () => {
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' });
      setResentFor(pendingNewEmail ?? '');
      toast.success('Confirmation email resent.');
    } catch {
      toast.error('Something went wrong.');
    }
  }, [pendingNewEmail, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Email Address</h1>
      </div>

      {/* Current email */}
      <div className="glass-card settings-email-current" style={{ marginBottom: 20 }}>
        <p className="settings-form-label" style={{ marginBottom: 4 }}>Current email</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{currentEmail}</p>
      </div>

      {/* Pending-change notice */}
      {pendingNewEmail && (
        <div
          className="glass-card"
          style={{
            marginBottom: 20,
            padding: '14px 16px',
            borderLeft: '3px solid var(--accent)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={16} style={{ color: 'var(--accent)' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Pending confirmation
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            A confirmation link was sent to <strong>{pendingNewEmail}</strong>.
            Your current email stays active until you confirm the new one.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={handleResend}
              disabled={resentFor === pendingNewEmail}
            >
              {resentFor === pendingNewEmail ? 'Sent ✓' : 'Resend link'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 13, padding: '6px 12px', color: 'var(--red)' }}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel change'}
            </button>
          </div>
        </div>
      )}

      {/* OAuth-only accounts cannot change email this way */}
      {!hasPassword ? (
        <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Your account uses Google sign-in. To change your email address you must
            remove and re-add Google with a different account.
          </p>
        </div>
      ) : (
        <div className="settings-section" style={{ marginBottom: 24 }}>
          <div className="settings-form-field">
            <label className="settings-form-label" htmlFor="new-email">
              New email address
            </label>
            <input
              id="new-email"
              className={`input-field${errors.email ? ' input-field--error' : ''}`}
              type="email"
              placeholder="new@email.com"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setErrors((e2) => ({ ...e2, email: undefined })); }}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'new-email-err' : undefined}
            />
            {errors.email && (
              <p id="new-email-err" className="field-error" role="alert" style={{ marginTop: 4 }}>
                {errors.email}
              </p>
            )}
          </div>

          <div className="settings-form-field" style={{ marginBottom: 0 }}>
            <label className="settings-form-label" htmlFor="current-pw">
              Current password
            </label>
            <input
              id="current-pw"
              className={`input-field${errors.password ? ' input-field--error' : ''}`}
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setErrors((e2) => ({ ...e2, password: undefined })); }}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'current-pw-err' : undefined}
            />
            {errors.password && (
              <p id="current-pw-err" className="field-error" role="alert" style={{ marginTop: 4 }}>
                {errors.password}
              </p>
            )}
          </div>
        </div>
      )}

      {hasPassword && (
        <button
          className="btn-accent"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sending…' : 'Send confirmation email'}
        </button>
      )}
    </div>
  );
}
