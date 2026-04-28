'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, TrendingUp } from 'lucide-react';

const SHOWN_KEY = 'cardCaptureNudgeShown';

interface Props {
  /** Only rendered for trial plan users who have logged at least one job */
  jobsLogged: number;
  planIsTrial: boolean;
}

export default function CardCaptureNudge({ jobsLogged, planIsTrial }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!planIsTrial || jobsLogged < 1) return;
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
    } catch {
      return;
    }
    // Small delay so it doesn't pop immediately on load
    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [planIsTrial, jobsLogged]);

  function handleClose() {
    try {
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
    // Mark in DB so we never show again across sessions
    fetch('/api/user/card-capture-prompt-shown', { method: 'POST' }).catch(() => {});
  }

  if (!mounted || !visible) return null;

  return (
    <div
      className="copy-reminder-overlay"
      style={{ alignItems: 'flex-end', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      onClick={handleClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="trial-banner__dismiss"
          style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32 }}
          onClick={handleClose}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={20} style={{ color: '#1E90FF', flexShrink: 0 }} />
          <strong style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            Lock in 20% savings before your trial ends
          </strong>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          You've already logged {jobsLogged} job{jobsLogged !== 1 ? 's' : ''} — VerityFlow is working.
          Switch to annual for <strong>$24/mo</strong> (save $58/yr) and never think about billing again.
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ flex: 1, padding: '10px 0', fontSize: 14 }}
            onClick={handleClose}
          >
            Remind Me Later
          </button>
          <Link
            href="/settings/billing"
            className="btn-accent"
            style={{ flex: 1, padding: '10px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none', display: 'block', borderRadius: 8 }}
            onClick={handleClose}
          >
            Save 20% — Annual
          </Link>
        </div>
      </div>
    </div>
  );
}
