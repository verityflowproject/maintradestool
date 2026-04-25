'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import { computePasswordScore, STRENGTH_LABELS } from '@/lib/utils/passwordStrength';

export default function PasswordSettingsClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  const score = useMemo(() => computePasswordScore(newPassword), [newPassword]);

  const handleSave = useCallback(async () => {
    const errs: typeof errors = {};
    if (!currentPassword) errs.current = 'Current password is required.';
    if (newPassword.length < 8) errs.new = 'At least 8 characters required.';
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match.';

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast.success('Password updated.');
        router.push('/settings');
      } else {
        const data = (await res.json()) as { error?: string };
        if (data.error === 'Current password is incorrect') {
          setErrors({ current: 'Incorrect password.' });
        } else {
          toast.error(data.error ?? 'Failed to update password.');
        }
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, toast, router]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Change Password</h1>
      </div>

      <div className="settings-section" style={{ marginBottom: 24 }}>
        {/* Current password */}
        <div className="settings-form-field">
          <label className="settings-form-label">Current password</label>
          <input
            className="input-field"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setErrors((e2) => ({ ...e2, current: undefined })); }}
            autoComplete="current-password"
          />
          {errors.current && <p className="field-error" style={{ marginTop: 4 }}>{errors.current}</p>}
        </div>

        {/* New password */}
        <div className="settings-form-field">
          <label className="settings-form-label">New password</label>
          <input
            className="input-field"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setErrors((e2) => ({ ...e2, new: undefined })); }}
            autoComplete="new-password"
          />
          <div className="strength-row" data-score={score} style={{ marginTop: 8 }}>
            <span className="strength-seg" />
            <span className="strength-seg" />
            <span className="strength-seg" />
            <span className="strength-seg" />
            {score > 0 && (
              <span className="strength-label">{STRENGTH_LABELS[score]}</span>
            )}
          </div>
          {errors.new && <p className="field-error" style={{ marginTop: 4 }}>{errors.new}</p>}
        </div>

        {/* Confirm password */}
        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Confirm new password</label>
          <input
            className="input-field"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((e2) => ({ ...e2, confirm: undefined })); }}
            autoComplete="new-password"
          />
          {errors.confirm && <p className="field-error" style={{ marginTop: 4 }}>{errors.confirm}</p>}
        </div>
      </div>

      <button
        className="btn-accent"
        style={{ width: '100%' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Updating…' : 'Update Password'}
      </button>
    </div>
  );
}
