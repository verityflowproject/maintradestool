'use client';

import { useState, useCallback } from 'react';
import { MapPin, Phone, Mail, Clock, Eye } from 'lucide-react';

interface BookingProfile {
  headline: string;
  bio: string;
  services: string[];
  serviceArea: string;
  responseTime: string;
  showPhone: boolean;
  showEmail: boolean;
}

interface Props {
  slug: string;
  firstName: string;
  businessName: string;
  tradeEmoji: string;
  bookingProfile: BookingProfile;
  phone: string | null;
  email: string | null;
  previewMode?: boolean;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceNeeded: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  serviceNeeded: '',
  preferredDate: '',
  preferredTime: '',
  message: '',
};

// ── Placeholder helpers ───────────────────────────────────────────────

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', margin: '4px 0 0' }}>
      {children}
    </p>
  );
}

export default function PublicBookingClient({
  slug,
  firstName,
  businessName,
  tradeEmoji,
  bookingProfile,
  phone,
  email,
  previewMode = false,
}: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = useCallback(
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        setError('');
      },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (previewMode) return;
      if (!form.name.trim() || !form.phone.trim() || !form.serviceNeeded.trim()) {
        setError('Please fill in your name, phone, and what you need done.');
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        const res = await fetch(`/api/booking/${slug}/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          setSubmitted(true);
        } else {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? 'Something went wrong. Please try again.');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [form, slug, previewMode],
  );

  const displayName = businessName || (previewMode ? 'Your Business Name' : '');

  return (
    <div className="booking-public">
      {/* Preview banner */}
      {previewMode && (
        <div
          style={{
            background: 'rgba(30, 144, 255,0.12)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Eye size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--accent-text)' }}>
            Preview — this is how your booking link looks to clients. Submissions are disabled.
          </span>
        </div>
      )}

      {/* Hero */}
      <div className="booking-public__hero">
        <span className="booking-public__emoji" aria-hidden="true">
          {tradeEmoji}
        </span>
        <h1 className="booking-public__bizname">
          {displayName || <span style={{ color: 'var(--text-muted)' }}>Your Business Name</span>}
        </h1>
        {bookingProfile.headline ? (
          <p className="booking-public__headline">{bookingProfile.headline}</p>
        ) : previewMode ? (
          <EmptyHint>Add a headline in Settings → Booking Page</EmptyHint>
        ) : null}
        {bookingProfile.serviceArea ? (
          <p className="booking-public__area">
            <MapPin size={13} />
            {bookingProfile.serviceArea}
          </p>
        ) : previewMode ? (
          <EmptyHint>Add a service area in Settings → Booking Page</EmptyHint>
        ) : null}
        <div className="booking-public__contact-row">
          {phone && (
            <a href={`tel:${phone}`} className="booking-public__contact">
              <Phone size={14} />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="booking-public__contact">
              <Mail size={14} />
              {email}
            </a>
          )}
          {previewMode && !phone && !email && (
            <EmptyHint>Enable phone/email visibility in Settings → Booking Page</EmptyHint>
          )}
        </div>
      </div>

      {/* Services */}
      {bookingProfile.services.length > 0 ? (
        <div className="booking-section">
          <h2 className="booking-section__title">Services Offered</h2>
          <div className="booking-services-row">
            {bookingProfile.services.map((s) => (
              <span key={s} className="booking-service-pill">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : previewMode ? (
        <div className="booking-section">
          <h2 className="booking-section__title">Services Offered</h2>
          <EmptyHint>Add services in Settings → Booking Page</EmptyHint>
        </div>
      ) : null}

      {/* Bio */}
      {bookingProfile.bio ? (
        <div className="booking-section booking-bio-section">
          <h2 className="booking-section__title">About</h2>
          <p className="booking-bio-text">{bookingProfile.bio}</p>
        </div>
      ) : previewMode ? (
        <div className="booking-section booking-bio-section">
          <h2 className="booking-section__title">About</h2>
          <EmptyHint>Add a bio in Settings → Booking Page</EmptyHint>
        </div>
      ) : null}

      {/* Response time */}
      {bookingProfile.responseTime ? (
        <div className="booking-section" style={{ textAlign: 'center' }}>
          <span className="booking-response-badge">
            <Clock size={14} />
            {bookingProfile.responseTime}
          </span>
        </div>
      ) : previewMode ? (
        <div className="booking-section">
          <EmptyHint>Add a response time in Settings → Booking Page</EmptyHint>
        </div>
      ) : null}

      {/* Request form */}
      <div className="booking-section booking-form">
        <h2 className="booking-form__title">Request a Job</h2>

        {submitted ? (
          <div className="booking-success">
            <svg className="check-circle" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="check-circle__bg" cx="26" cy="26" r="25" fill="none" />
              <path className="check-mark" fill="none" d="M14 27 l8 8 l16-16" />
            </svg>
            <h3 className="booking-success__heading">{firstName} will be in touch soon!</h3>
            <p className="booking-success__sub">Your request has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {previewMode && (
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                  padding: '8px 10px',
                  background: 'var(--bg-glass)',
                  borderRadius: 6,
                  border: '1px dashed var(--quartz-border)',
                }}
              >
                Fields below are interactive but submissions are disabled in preview mode.
              </p>
            )}
            {error && <p className="booking-form__error">{error}</p>}

            <div className="booking-form__field">
              <input
                className="input-field"
                type="text"
                placeholder="Your name *"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div className="booking-form__field">
              <input
                className="input-field"
                type="tel"
                placeholder="Phone number *"
                value={form.phone}
                onChange={set('phone')}
                required
              />
            </div>
            <div className="booking-form__field">
              <input
                className="input-field"
                type="email"
                placeholder="Email (optional)"
                value={form.email}
                onChange={set('email')}
              />
            </div>
            <div className="booking-form__field">
              <input
                className="input-field"
                type="text"
                placeholder="Address (optional)"
                value={form.address}
                onChange={set('address')}
              />
            </div>
            <div className="booking-form__field">
              <textarea
                className="input-field"
                style={{ minHeight: 100 }}
                placeholder="What do you need done? *"
                value={form.serviceNeeded}
                onChange={set('serviceNeeded')}
                required
              />
            </div>
            <div className="booking-form__field">
              <input
                className="input-field"
                type="date"
                placeholder="Preferred date"
                value={form.preferredDate}
                onChange={set('preferredDate')}
              />
            </div>
            <div className="booking-form__field">
              <select
                className="input-field"
                value={form.preferredTime}
                onChange={set('preferredTime')}
              >
                <option value="">Preferred time</option>
                <option value="Morning (8am–12pm)">Morning (8am–12pm)</option>
                <option value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</option>
                <option value="Evening (5pm–8pm)">Evening (5pm–8pm)</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>
            <div className="booking-form__field">
              <textarea
                className="input-field"
                rows={3}
                placeholder="Anything else? Access instructions, details about the issue…"
                value={form.message}
                onChange={set('message')}
              />
            </div>

            <button
              type="submit"
              className={previewMode ? 'btn-ghost booking-form__submit' : 'btn-accent booking-form__submit'}
              disabled={previewMode || submitting}
              style={previewMode ? { opacity: 0.55, cursor: 'not-allowed', width: '100%' } : undefined}
            >
              {previewMode ? 'Preview Mode · Submissions Disabled' : submitting ? 'Sending…' : 'Send Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
