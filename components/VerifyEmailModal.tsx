'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

interface Props {
  onClose: () => void;
  /** Custom message shown below the heading. Defaults to a generic unlock copy. */
  message?: string;
}

export default function VerifyEmailModal({ onClose, message }: Props) {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }, []);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
    >
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-sheet__header">
          <div className="verify-modal-icon">
            <Mail size={22} />
          </div>
          <h2 id="verify-modal-title" className="modal-sheet__title">
            Confirm your email first
          </h2>
        </div>

        <p className="modal-sheet__body">
          {message ??
            'This feature is unlocked once you confirm your email address.'}
        </p>

        <div className="modal-sheet__actions">
          {resent ? (
            <div className="btn-accent" style={{ opacity: 0.8, cursor: 'default' }}>
              Email sent ✓
            </div>
          ) : (
            <button
              type="button"
              className="btn-accent"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend confirmation email'}
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { onClose(); router.push('/settings/email'); }}
          >
            Use a different email → settings
          </button>
          <button
            type="button"
            className="modal-sheet__cancel"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
