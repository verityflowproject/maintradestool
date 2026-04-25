'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

interface Props {
  currentEmail: string;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailSettingsClient({ currentEmail }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { update: updateSession } = useSession();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const errs: typeof errors = {};
    if (!EMAIL_RX.test(newEmail)) errs.email = 'Enter a valid email address.';
    if (!currentPassword) errs.password = 'Current password is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase(), currentPassword }),
      });

      if (res.ok) {
        await updateSession();
        toast.success('Email updated.');
        router.push('/settings');
      } else {
        const data = (await res.json()) as { error?: string };
        if (data.error?.includes('password')) {
          setErrors({ password: data.error });
        } else if (data.error?.includes('email') || data.error?.includes('use')) {
          setErrors({ email: data.error });
        } else {
          toast.error(data.error ?? 'Failed to update email.');
        }
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [newEmail, currentPassword, toast, updateSession, router]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Email Address</h1>
      </div>

      {/* Current email display */}
      <div className="glass-card settings-email-current" style={{ marginBottom: 20 }}>
        <p className="settings-form-label" style={{ marginBottom: 4 }}>Current email</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{currentEmail}</p>
      </div>

      <div className="settings-section" style={{ marginBottom: 24 }}>
        <div className="settings-form-field">
          <label className="settings-form-label">New email address</label>
          <input
            className="input-field"
            type="email"
            placeholder="new@email.com"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setErrors((e2) => ({ ...e2, email: undefined })); }}
            autoComplete="email"
          />
          {errors.email && <p className="field-error" style={{ marginTop: 4 }}>{errors.email}</p>}
        </div>

        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Current password</label>
          <input
            className="input-field"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setErrors((e2) => ({ ...e2, password: undefined })); }}
            autoComplete="current-password"
          />
          {errors.password && <p className="field-error" style={{ marginTop: 4 }}>{errors.password}</p>}
        </div>
      </div>

      <button
        className="btn-accent"
        style={{ width: '100%' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Updating…' : 'Update Email'}
      </button>
    </div>
  );
}
