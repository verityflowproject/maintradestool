'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  Lightbulb,
  Bug,
  MessageSquare,
  LifeBuoy,
  Mail,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactType = 'feature_request' | 'bug_report' | 'feedback' | 'support' | 'other';

interface CardDef {
  type: ContactType;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  featured?: boolean;
}

// ── Device info hook ──────────────────────────────────────────────────────────

function useDeviceInfo() {
  const [info, setInfo] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}×${window.screen.height}`;
    // simple browser sniff for display
    let browser = 'Unknown browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    setInfo(`${browser} · ${screen} · ${os}`);
  }, []);
  return info;
}

// ── Success state SVG (reused from CompletionScreen, 48px) ────────────────────

function CheckSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 72 72" fill="none" aria-hidden>
      <circle
        cx="36" cy="36" r="30"
        stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round"
        className="check-circle"
      />
      <path
        d="M20 36 L30 46 L52 26"
        stroke="white" strokeWidth="2.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        className="check-mark"
      />
    </svg>
  );
}

// ── Char counter ──────────────────────────────────────────────────────────────

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const color =
    len >= 95 ? 'var(--danger)' :
    len >= 80 ? 'var(--warning)' :
    'var(--text-muted)';
  return (
    <span className="contact-char-counter" style={{ color }}>
      {len}/{max}
    </span>
  );
}

// ── Priority pills (bug report) ───────────────────────────────────────────────

const PRIORITIES: { value: string; label: string; color: string; filled?: true }[] = [
  { value: 'low', label: 'Minor', color: 'var(--text-muted)' },
  { value: 'medium', label: 'Annoying', color: 'var(--warning)' },
  { value: 'high', label: 'Blocking my work', color: 'var(--danger)' },
  { value: 'critical', label: 'Critical 🔥', color: 'var(--danger)', filled: true },
];

function PriorityPills({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
      {PRIORITIES.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            className={`contact-priority-pill${active ? ' active' : ''}${p.filled ? ' filled' : ''}`}
            style={
              active
                ? { borderColor: p.color, color: p.filled ? '#fff' : p.color, background: p.filled ? p.color : `${p.color}22` }
                : { borderColor: 'var(--quartz-border)', color: p.color }
            }
            onClick={() => onChange(p.value)}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Emoji rating (feedback) ───────────────────────────────────────────────────

const EMOJIS = ['😡', '😕', '😐', '😊', '🤩'];

function EmojiRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0' }}>
      {EMOJIS.map((emoji, i) => {
        const score = i + 1;
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            className={`contact-rating-emoji${selected ? ' selected' : ''}`}
            onClick={() => onChange(score)}
            aria-label={`Rating ${score}`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

// ── Toggle switch (reused .switch pattern from notifications) ─────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <div>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Helps us prioritize what to build.</p>
      </div>
      <button
        type="button"
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      />
    </div>
  );
}

// ── Shared form submit handler type ──────────────────────────────────────────

type Submitter = (body: Record<string, unknown>) => Promise<void>;

// ── Individual forms ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p style={{
      fontFamily: 'var(--font-dm-sans), sans-serif',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      margin: '0 0 6px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {children}
      {required && (
        <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span>
      )}
    </p>
  );
}

function FeatureRequestForm({ onSubmit, loading }: { onSubmit: Submitter; loading: boolean }) {
  const [title, setTitle] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [description, setDescription] = useState('');
  const [willingToPay, setWillingToPay] = useState(false);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: 'feature_request', title, problemSolved, description: description || problemSolved, willingToPay }); }}>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Feature name</FieldLabel>
        <input
          className="input-field"
          placeholder="e.g. Send invoices via WhatsApp"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <CharCounter value={title} max={100} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>What problem does this solve for you?</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 100, resize: 'vertical' }}
          placeholder="I lose customers because… / It takes too long when… / I waste 30 minutes a day on…"
          value={problemSolved}
          onChange={(e) => setProblemSolved(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Additional details (optional)</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="Specific examples, edge cases, or how you'd want this to work."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Toggle checked={willingToPay} onChange={() => setWillingToPay(v => !v)} label="I'd pay extra for this feature" />
      <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
        {loading ? <Loader2 size={18} className="spin" /> : 'Send Request'}
      </button>
    </form>
  );
}

function BugReportForm({ onSubmit, loading, deviceInfo }: { onSubmit: Submitter; loading: boolean; deviceInfo: string }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: 'bug_report', title, priority, description, stepsToReproduce }); }}>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Bug title</FieldLabel>
        <input
          className="input-field"
          placeholder="e.g. Voice recording cuts off after 30 seconds"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <CharCounter value={title} max={100} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>How bad is it?</FieldLabel>
        <PriorityPills value={priority} onChange={setPriority} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>What happened?</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 100, resize: 'vertical' }}
          placeholder="Describe what you tried to do and what went wrong."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Steps to reproduce (optional)</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="1. I went to… 2. I tapped… 3. Then…"
          value={stepsToReproduce}
          onChange={(e) => setStepsToReproduce(e.target.value)}
        />
      </div>
      {deviceInfo && (
        <div className="glass-card" style={{ padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          📱 Device info: {deviceInfo}
        </div>
      )}
      <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>
        {loading ? <Loader2 size={18} className="spin" /> : 'Send Bug Report'}
      </button>
    </form>
  );
}

function FeedbackForm({ onSubmit, loading }: { onSubmit: Submitter; loading: boolean }) {
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: 'feedback', description, rating: rating ?? undefined }); }}>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Your feedback</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 140, resize: 'vertical' }}
          placeholder="What's working, what's not, what you wish was different…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Overall rating (optional)</FieldLabel>
        <EmojiRating value={rating} onChange={setRating} />
      </div>
      <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>
        {loading ? <Loader2 size={18} className="spin" /> : 'Send Feedback'}
      </button>
    </form>
  );
}

function SupportForm({ onSubmit, loading }: { onSubmit: Submitter; loading: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: 'support', title, description }); }}>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>What do you need help with?</FieldLabel>
        <input
          className="input-field"
          placeholder="e.g. I can't send my invoice, my account won't load…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Describe the issue</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 100, resize: 'vertical' }}
          placeholder="What were you trying to do? What happened instead?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="glass-card" style={{ padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        💬 We typically respond within 24 hours during business hours.
      </div>
      <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>
        {loading ? <Loader2 size={18} className="spin" /> : 'Get Help'}
      </button>
    </form>
  );
}

function OtherForm({ onSubmit, loading }: { onSubmit: Submitter; loading: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type: 'other', title, description }); }}>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Subject</FieldLabel>
        <input
          className="input-field"
          placeholder="What's this about?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FieldLabel required>Message</FieldLabel>
        <textarea
          className="input-field"
          style={{ minHeight: 140, resize: 'vertical' }}
          placeholder="Your full message here…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-accent" style={{ width: '100%' }} disabled={loading}>
        {loading ? <Loader2 size={18} className="spin" /> : 'Send Message'}
      </button>
    </form>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

const SUCCESS_COPY: Record<ContactType, string> = {
  feature_request: "We'll review and add it to our roadmap. Track requests in your account.",
  bug_report: "Our team is on it. We'll email you when it's fixed.",
  feedback: 'Every word matters. Thank you.',
  support: "We'll get back to you within 24 hours.",
  other: 'Thanks for reaching out.',
};

function SuccessState({ type, firstName }: { type: ContactType; firstName: string }) {
  return (
    <div className="contact-success">
      <CheckSVG />
      <p style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>
        Got it{firstName ? `, ${firstName}` : ''}.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
        {SUCCESS_COPY[type]}
      </p>
      <a
        href="/contact/history"
        style={{ fontSize: 13, color: 'var(--accent-text)', marginTop: 4 }}
      >
        View your past requests →
      </a>
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────

function CategoryCard({
  def,
  expanded,
  onToggle,
  firstName,
  deviceInfo,
}: {
  def: CardDef;
  expanded: boolean;
  onToggle: () => void;
  firstName: string;
  deviceInfo: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll into view after expand
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
    return () => clearTimeout(timer);
  }, [expanded]);

  // Auto-collapse after success
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(() => {
      setSucceeded(false);
      onToggle(); // collapse
    }, 3000);
    return () => clearTimeout(timer);
  }, [succeeded, onToggle]);

  const handleSubmit: Submitter = useCallback(async (body) => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success("Sent! We'll be in touch.");
      setSucceeded(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const formProps = { onSubmit: handleSubmit, loading };

  return (
    <div
      ref={cardRef}
      className={`glass-card contact-card${def.featured ? ' contact-card--feature' : ''}`}
    >
      {/* Card header — always visible */}
      <button
        type="button"
        className="contact-card__header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div
          className="contact-card__icon"
          style={{ background: def.iconBg, color: def.iconColor }}
        >
          {def.icon}
        </div>
        <div className="contact-card__text">
          <p className="contact-card__title">{def.title}</p>
          <p className="contact-card__sub">{def.sub}</p>
        </div>
        <ChevronDown
          size={20}
          className={`contact-card__chevron${expanded ? ' rotated' : ''}`}
          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
        />
      </button>

      {/* Expandable form area */}
      <div className={`contact-card__expand${expanded ? ' open' : ''}`}>
        <div className="contact-card__divider" />
        <div className="contact-card__form">
          {succeeded ? (
            <SuccessState type={def.type} firstName={firstName} />
          ) : (
            <>
              {def.type === 'feature_request' && <FeatureRequestForm {...formProps} />}
              {def.type === 'bug_report' && <BugReportForm {...formProps} deviceInfo={deviceInfo} />}
              {def.type === 'feedback' && <FeedbackForm {...formProps} />}
              {def.type === 'support' && <SupportForm {...formProps} />}
              {def.type === 'other' && <OtherForm {...formProps} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card definitions ──────────────────────────────────────────────────────────

const CARDS: CardDef[] = [
  {
    type: 'feature_request',
    icon: <Lightbulb size={22} />,
    iconBg: 'var(--accent-dim)',
    iconColor: 'var(--accent)',
    title: 'Request a Feature',
    sub: "What would make your life easier? We're listening.",
    featured: true,
  },
  {
    type: 'bug_report',
    icon: <Bug size={22} />,
    iconBg: 'rgba(248,113,113,0.15)',
    iconColor: 'var(--danger)',
    title: 'Report a Bug',
    sub: 'Something broken or acting weird? Tell us.',
  },
  {
    type: 'feedback',
    icon: <MessageSquare size={22} />,
    iconBg: 'var(--accent-dim)',
    iconColor: 'var(--accent-text)',
    title: 'Share Feedback',
    sub: 'Likes, dislikes, ideas — pour it out.',
  },
  {
    type: 'support',
    icon: <LifeBuoy size={22} />,
    iconBg: 'rgba(103,232,249,0.15)',
    iconColor: '#67E8F9',
    title: 'Get Help',
    sub: "Stuck on something? We've got you.",
  },
  {
    type: 'other',
    icon: <Mail size={22} />,
    iconBg: 'var(--bg-glass)',
    iconColor: 'var(--text-secondary)',
    title: 'Something Else',
    sub: 'Partnerships, press, anything not above.',
  },
];

const QUERY_TYPE_MAP: Record<string, ContactType> = {
  feature: 'feature_request',
  bug: 'bug_report',
  feedback: 'feedback',
  support: 'support',
  other: 'other',
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  firstName: string;
  businessName: string;
}

export default function ContactClient({ firstName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceInfo = useDeviceInfo();
  const [expanded, setExpanded] = useState<ContactType | null>(null);

  // Query param auto-expand
  useEffect(() => {
    const qtype = searchParams.get('type');
    if (qtype && QUERY_TYPE_MAP[qtype]) {
      setExpanded(QUERY_TYPE_MAP[qtype]);
    }
  }, [searchParams]);

  const toggle = useCallback((type: ContactType) => {
    setExpanded((prev) => (prev === type ? null : type));
  }, []);

  return (
    <div
      className="app-shell"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-void)',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => router.push('/dashboard')}
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Get in touch
        </h1>
        <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
          We read every message. Pick what fits.
        </p>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CARDS.map((def) => (
          <CategoryCard
            key={def.type}
            def={def}
            expanded={expanded === def.type}
            onToggle={() => toggle(def.type)}
            firstName={firstName}
            deviceInfo={deviceInfo}
          />
        ))}
      </div>

      {/* Footer link */}
      <div style={{ textAlign: 'center', padding: '24px 20px 8px' }}>
        <a
          href="/contact/history"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: 'var(--accent-text)' }}
        >
          View your past submissions →
        </a>
      </div>

      {/* Email fallback */}
      <div style={{ padding: '12px 20px 0', textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid var(--quartz-border)', paddingTop: 16 }}>
          <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Or email us directly:{' '}
            <a href="mailto:contact@verityflow.io" style={{ color: 'var(--text-muted)' }}>
              contact@verityflow.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
