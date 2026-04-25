'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Check, X } from 'lucide-react';

// ── Context ───────────────────────────────────────────────────────────

interface UpgradeGateCtx {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const UpgradeGateContext = createContext<UpgradeGateCtx>({
  open: false,
  show: () => {},
  hide: () => {},
});

export function useUpgradeGate(): UpgradeGateCtx {
  return useContext(UpgradeGateContext);
}

// ── Modal ─────────────────────────────────────────────────────────────

const FEATURES = [
  'Voice logging',
  'Unlimited invoices',
  'Customers',
  'Calendar',
  'Booking page',
];

function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  return (
    <>
      <div
        className={`signin-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`signin-sheet upgrade-gate-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal
        aria-label="Upgrade to Pro"
      >
        <button
          type="button"
          className="signin-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="upgrade-gate__lock">
          <Lock size={48} style={{ color: 'var(--accent)' }} />
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 22,
            margin: '16px 0 8px',
          }}
        >
          Trial Ended
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            margin: '0 0 24px',
            lineHeight: 1.6,
          }}
        >
          Upgrade to Pro to continue using TradesBrain.
        </p>

        <ul className="upgrade-gate__features">
          {FEATURES.map((f) => (
            <li key={f} className="upgrade-gate__feature">
              <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="btn-accent step-cta"
          style={{ marginTop: 24 }}
          onClick={() => {
            onClose();
            router.push('/settings/billing');
          }}
        >
          See Plans
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 12, width: '100%' }}
          onClick={onClose}
        >
          Not now
        </button>
      </div>
    </>
  );
}

// ── Provider ──────────────────────────────────────────────────────────

export function UpgradeGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const originalFetch = useRef<typeof fetch | null>(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  // Patch window.fetch to intercept 403 upgrade_required responses
  useEffect(() => {
    // Bind to window so native fetch receives the correct `this` when invoked
    // via a property access like `originalFetch.current(...)` (otherwise throws
    // "Illegal invocation" — see next-auth signOut).
    originalFetch.current = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch.current!(...args);

      if (response.status === 403) {
        // Clone so the original caller can still read the body
        const clone = response.clone();
        try {
          const json = (await clone.json()) as { error?: string };
          if (json.error === 'upgrade_required') {
            setOpen(true);
          }
        } catch {
          // Not JSON — ignore
        }
      }

      return response;
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, []);

  return (
    <UpgradeGateContext.Provider value={{ open, show, hide }}>
      {children}
      <UpgradeModal open={open} onClose={hide} />
    </UpgradeGateContext.Provider>
  );
}
