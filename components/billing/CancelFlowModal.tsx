'use client';

import { useState, useCallback } from 'react';
import { X, PauseCircle, Tag, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

type Feedback = 'too_expensive' | 'not_using' | 'missing_feature' | 'switching_tools' | 'other';

interface Props {
  onClose: () => void;
  onCancelled: () => void;
  subscriptionPlan: 'monthly' | 'annual' | null;
}

type Step = 'why' | 'offer' | 'confirm';

interface Offer {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: 'pause' | 'discount' | 'downgrade_to_annual';
  cta: string;
}

const FEEDBACK_OPTIONS: Array<{ id: Feedback; label: string }> = [
  { id: 'too_expensive', label: "It's too expensive" },
  { id: 'not_using', label: "I'm not using it enough" },
  { id: 'missing_feature', label: "It's missing a feature I need" },
  { id: 'switching_tools', label: "I'm switching to a different tool" },
  { id: 'other', label: 'Other reason' },
];

function getOffer(feedback: Feedback, plan: 'monthly' | 'annual' | null): Offer | null {
  switch (feedback) {
    case 'too_expensive':
      if (plan === 'monthly') {
        return {
          icon: <ArrowDownCircle size={22} style={{ color: '#1E90FF' }} />,
          title: 'Switch to annual — save $58/yr',
          description: 'Lock in $24/mo billed annually instead of $29/mo monthly. No extra commitments.',
          action: 'downgrade_to_annual',
          cta: 'Switch to Annual',
        };
      }
      return {
        icon: <Tag size={22} style={{ color: '#1E90FF' }} />,
        title: '50% off your next 2 months',
        description: "We'll apply a discount to your next two billing cycles — no action needed on your card.",
        action: 'discount',
        cta: 'Apply 50% Discount',
      };
    case 'not_using':
      return {
        icon: <PauseCircle size={22} style={{ color: '#1E90FF' }} />,
        title: 'Pause for 30 days — free',
        description: "We'll pause billing for 30 days. Your account resumes automatically. No charge during the pause.",
        action: 'pause',
        cta: 'Pause for 30 Days',
      };
    case 'missing_feature':
      return {
        icon: <Tag size={22} style={{ color: '#1E90FF' }} />,
        title: "Stay on 50% off while we build it",
        description: "We're actively building new features. Stay for 2 months at half price and tell us what you need.",
        action: 'discount',
        cta: 'Apply 50% Discount',
      };
    default:
      return {
        icon: <PauseCircle size={22} style={{ color: '#1E90FF' }} />,
        title: 'Pause for 30 days — free',
        description: "Take a break and come back when you're ready. No charge during the pause.",
        action: 'pause',
        cta: 'Pause for 30 Days',
      };
  }
}

export default function CancelFlowModal({ onClose, onCancelled, subscriptionPlan }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('why');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const offer = selectedFeedback ? getOffer(selectedFeedback, subscriptionPlan) : null;

  const callApi = useCallback(async (action: string, extra?: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback: selectedFeedback, comment, ...extra }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Something went wrong. Please try again.');
        return false;
      }
      return true;
    } catch {
      toast.error('Something went wrong. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedFeedback, comment, toast]);

  const handleAcceptOffer = useCallback(async () => {
    if (!offer) return;
    const ok = await callApi(offer.action);
    if (ok) {
      const msgs: Record<string, string> = {
        pause: 'Billing paused for 30 days. See you soon!',
        discount: '50% discount applied to your next 2 months.',
        downgrade_to_annual: "Switched to annual — you're saving $58/yr!",
      };
      toast.success(msgs[offer.action] ?? 'Done!');
      onClose();
    }
  }, [offer, callApi, toast, onClose]);

  const handleFinalCancel = useCallback(async () => {
    const ok = await callApi('cancel');
    if (ok) {
      toast.info('Subscription cancelled. Access continues until the end of your billing period.');
      onCancelled();
    }
  }, [callApi, toast, onCancelled]);

  return (
    <div className="copy-reminder-overlay" onClick={onClose}>
      <div
        className="glass-card copy-reminder-modal"
        style={{ maxWidth: 420, gap: 0, padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-syne)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {step === 'why' && 'Before you go…'}
            {step === 'offer' && 'How about this instead?'}
            {step === 'confirm' && 'Confirm cancellation'}
          </h2>
          <button
            type="button"
            className="trial-banner__dismiss"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step A: Why ────────────────────────────────────────────────── */}
        {step === 'why' && (
          <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your feedback helps us improve. What's the main reason?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEEDBACK_OPTIONS.map(({ id, label }) => (
                <label
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selectedFeedback === id ? 'var(--accent)' : 'var(--quartz-border)'}`,
                    background: selectedFeedback === id ? 'rgba(30,144,255,0.08)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={id}
                    checked={selectedFeedback === id}
                    onChange={() => setSelectedFeedback(id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              placeholder="Anything else you'd like us to know? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                background: 'var(--quartz-bg)',
                border: '1px solid var(--quartz-border)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--text-primary)',
                resize: 'none',
                fontFamily: 'var(--font-dm-sans)',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn-ghost"
                style={{ flex: 1, padding: '10px 0' }}
                onClick={onClose}
              >
                Keep Subscription
              </button>
              <button
                className="btn-accent"
                style={{ flex: 1, padding: '10px 0' }}
                disabled={!selectedFeedback}
                onClick={() => setStep(offer ? 'offer' : 'confirm')}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step B: Offer ──────────────────────────────────────────────── */}
        {step === 'offer' && offer && (
          <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '16px',
              borderRadius: 10,
              border: '1px solid rgba(30,144,255,0.3)',
              background: 'rgba(30,144,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {offer.icon}
                <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{offer.title}</strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {offer.description}
              </p>
            </div>
            <button
              className="btn-accent"
              style={{ width: '100%', padding: '12px 0' }}
              onClick={handleAcceptOffer}
              disabled={loading}
            >
              {loading ? 'Applying…' : offer.cta}
            </button>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                textAlign: 'center',
              }}
              onClick={() => setStep('confirm')}
            >
              No thanks, I still want to cancel
            </button>
          </div>
        )}

        {/* ── Step C: Final confirm ──────────────────────────────────────── */}
        {step === 'confirm' && (
          <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              display: 'flex',
              gap: 10,
              padding: '14px',
              borderRadius: 8,
              border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.06)',
            }}>
              <AlertTriangle size={18} style={{ color: '#F87171', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  You'll lose Pro access at the end of your billing period.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Your data stays safe — jobs, invoices, and customers are kept. You can resubscribe any time to restore access instantly.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-ghost"
                style={{ flex: 1, padding: '10px 0' }}
                onClick={onClose}
              >
                Keep Subscription
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: '1px solid rgba(248,113,113,0.5)',
                  borderRadius: 8,
                  color: '#F87171',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
                onClick={handleFinalCancel}
                disabled={loading}
              >
                {loading ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
