'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, X, Eye, EyeOff, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdminUnlockModal({ open, onClose }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens, reset state when it closes
  useEffect(() => {
    if (open) {
      setCode('');
      setError('');
      setShowCode(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) {
        setError('Please enter the admin code.');
        return;
      }
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/admin/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });

        if (res.ok) {
          onClose();
          router.push('/admin');
        } else if (res.status === 429) {
          setError('Too many attempts. Wait 15 minutes and try again.');
        } else {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? 'Incorrect code. Try again.');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [code, onClose, router],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="signin-backdrop open"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="signin-sheet open"
        role="dialog"
        aria-modal
        aria-label="Admin unlock"
        style={{ maxWidth: 400 }}
      >
        <button
          type="button"
          className="signin-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: 'rgba(30, 144, 255,0.12)',
            border: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <ShieldCheck size={26} style={{ color: 'var(--accent)' }} />
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 20,
            textAlign: 'center',
            marginBottom: 6,
          }}
        >
          Admin Access
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Enter the admin code to unlock the admin panel.
          Access expires after 4 hours.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              ref={inputRef}
              className="input-field"
              type={showCode ? 'text' : 'password'}
              placeholder="Admin code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              autoComplete="off"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              aria-label={showCode ? 'Hide code' : 'Show code'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 12,
                color: 'var(--danger)',
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-accent"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            disabled={loading}
          >
            {loading ? (
              'Verifying…'
            ) : (
              <>
                <Lock size={14} />
                Unlock Admin Panel
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-ghost"
            style={{ width: '100%', marginTop: 10 }}
            onClick={onClose}
          >
            Cancel
          </button>
        </form>
      </div>
    </>
  );
}
