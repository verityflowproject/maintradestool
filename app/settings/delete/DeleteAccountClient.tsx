'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

interface Props {
  userEmail: string;
}

export default function DeleteAccountClient({ userEmail }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isMatch = confirmEmail === userEmail;

  const handleDelete = useCallback(async () => {
    if (!isMatch) return;
    setDeleting(true);

    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });

      if (res.ok) {
        toast.success('Account deleted.');
        await signOut({ callbackUrl: '/onboarding' });
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to delete account.');
        setDeleting(false);
      }
    } catch {
      toast.error('Something went wrong.');
      setDeleting(false);
    }
  }, [isMatch, confirmEmail, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22, color: 'var(--danger)' }}>
          Delete Account
        </h1>
      </div>

      <div className="delete-warning-card">
        <p className="delete-warning-card__title">⚠ This action is permanent</p>
        <p className="delete-warning-card__body">
          Deleting your account will remove all jobs, customers, invoices, and booking
          requests. This cannot be undone.
        </p>
      </div>

      <div className="settings-section" style={{ marginBottom: 24 }}>
        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Type your email to confirm</label>
          <input
            className="input-field"
            type="email"
            placeholder={userEmail}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            autoComplete="off"
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Must match: {userEmail}
          </p>
        </div>
      </div>

      <button
        className="btn-danger"
        onClick={handleDelete}
        disabled={!isMatch || deleting}
      >
        {deleting ? 'Deleting…' : 'Permanently Delete Account'}
      </button>
    </div>
  );
}
