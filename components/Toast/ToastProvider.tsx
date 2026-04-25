'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** true while entering, false after dismiss triggered */
  visible: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

// ── Context ────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Individual toast card ──────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Trigger enter animation one frame after mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Trigger exit animation when visible flips to false
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (!item.visible && mounted) {
      setExiting(true);
    }
  }, [item.visible, mounted]);

  const style: React.CSSProperties = {
    opacity: mounted && !exiting ? 1 : 0,
    transform: mounted && !exiting ? 'translateY(0)' : 'translateY(20px)',
    transition: exiting
      ? 'opacity 200ms ease, transform 200ms ease'
      : 'opacity 250ms ease, transform 250ms ease',
  };

  return (
    <div
      className={`toast glass-card toast--${item.type}`}
      style={style}
      onTransitionEnd={() => {
        if (exiting) onDismiss(item.id);
      }}
    >
      <span className={`toast__icon toast__icon--${item.type}`}>
        {ICONS[item.type]}
      </span>
      <span className="toast__message">{item.message}</span>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timerRefs.current.delete(id);
  }, []);

  const startExiting = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => {
        let next = [...prev, { id, type, message, visible: true }];
        // evict oldest if over limit
        while (next.length > MAX_TOASTS) {
          const oldest = next.shift()!;
          // clear its timer
          const timer = timerRefs.current.get(oldest.id);
          if (timer) {
            clearTimeout(timer);
            timerRefs.current.delete(oldest.id);
          }
        }
        return next;
      });

      const timer = setTimeout(() => startExiting(id), AUTO_DISMISS_MS);
      timerRefs.current.set(id, timer);
    },
    [startExiting],
  );

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timerRefs.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const toast: ToastContextValue['toast'] = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite" aria-atomic="false">
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
