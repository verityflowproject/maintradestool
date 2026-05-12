'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { TEAM_MEMBER_ROLES } from '@/lib/team/roles';
import {
  sanitizePhone,
  formatPhoneAsYouType,
  validatePhone,
  validateEmail,
  validateHourlyRate,
  sanitizeMoney,
  collectErrors,
} from '@/lib/utils/validators';

const MEMBER_COLORS = [
  '#4A9EFF',
  '#FBBF24',
  '#67E8F9',
  '#A78BFA',
  '#34D399',
  '#FB923C',
];

interface Props {
  defaultRate: number;
}

export default function AddMemberClient({ defaultRate }: Props) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [role, setRole] = useState('tech');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [sendInvite, setSendInvite] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const errs = collectErrors({
      phone: validatePhone(phone),
      email: validateEmail(email),
      hourlyRate: validateHourlyRate(hourlyRate),
    });
    if (errs) {
      setFieldErrors(errs);
      return;
    }
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          email: email.trim(),
          phone: phone.trim(),
          hourlyRate: hourlyRate === '' ? null : Number(hourlyRate),
          color,
          notes,
          sendInvite: sendInvite && !!email.trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { memberId?: string; error?: string } | null;
      if (!res.ok || !json?.memberId) {
        setError(json?.error ?? 'Failed to create member');
        return;
      }
      router.push(`/team/${json.memberId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button
          className="icon-btn"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1
          className="settings-page__title"
          style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22 }}
        >
          Add crew member
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {error && (
          <p style={{ color: 'var(--danger, #ef4444)', fontSize: 14, margin: 0 }}>{error}</p>
        )}

        <div>
          <label className="section-label">Name *</label>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            maxLength={80}
            autoFocus
          />
        </div>

        <div>
          <label className="section-label">Role</label>
          <select
            className="input-field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {TEAM_MEMBER_ROLES.filter((r) => r.id !== 'owner').map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} — {r.sub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="section-label" htmlFor="member-email">Email</label>
          <input
            id="member-email"
            aria-invalid={!!fieldErrors.email || undefined}
            aria-describedby={fieldErrors.email ? 'member-email-err' : undefined}
            className={`input-field${fieldErrors.email ? ' input-field--error' : ''}`}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
            }}
            placeholder="optional"
            maxLength={254}
            inputMode="email"
          />
          {fieldErrors.email && (
            <p id="member-email-err" className="field-error" role="alert">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="section-label" htmlFor="member-phone">Phone</label>
          <input
            id="member-phone"
            aria-invalid={!!fieldErrors.phone || undefined}
            aria-describedby={fieldErrors.phone ? 'member-phone-err' : undefined}
            className={`input-field${fieldErrors.phone ? ' input-field--error' : ''}`}
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneAsYouType(sanitizePhone(e.target.value)));
              if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
            }}
            placeholder="(555) 123-4567 — optional"
            maxLength={25}
            inputMode="tel"
          />
          {fieldErrors.phone && (
            <p id="member-phone-err" className="field-error" role="alert">{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <label className="section-label" htmlFor="member-rate">
            Hourly Rate Override (optional)
          </label>
          <input
            id="member-rate"
            aria-invalid={!!fieldErrors.hourlyRate || undefined}
            aria-describedby={fieldErrors.hourlyRate ? 'member-rate-err' : undefined}
            className={`input-field${fieldErrors.hourlyRate ? ' input-field--error' : ''}`}
            type="number"
            value={hourlyRate}
            onChange={(e) => {
              setHourlyRate(sanitizeMoney(e.target.value));
              if (fieldErrors.hourlyRate) setFieldErrors((p) => ({ ...p, hourlyRate: '' }));
            }}
            placeholder={`Default: $${defaultRate}/hr`}
            min="0"
            max="2000"
            step="0.01"
            inputMode="decimal"
          />
          {fieldErrors.hourlyRate && (
            <p id="member-rate-err" className="field-error" role="alert">{fieldErrors.hourlyRate}</p>
          )}
        </div>

        <div>
          <label className="section-label">Color</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--accent-text)' : '3px solid transparent',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="section-label">Notes (internal)</label>
          <textarea
            className="input-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional internal notes"
            rows={3}
            maxLength={1000}
            style={{ resize: 'vertical' }}
          />
        </div>

        {email.trim() && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              padding: '12px 16px',
              background: 'var(--quartz-bg)',
              border: '1px solid var(--quartz-border)',
              borderRadius: 12,
            }}
          >
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Send invite email</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Lets {name.trim() || 'them'} know they&apos;ve been added to your team.
              </p>
            </div>
          </label>
        )}

        <button
          type="submit"
          className="btn-accent"
          disabled={submitting}
          style={{ marginTop: 4 }}
        >
          {submitting ? 'Adding…' : 'Add crew member'}
        </button>
      </form>
    </div>
  );
}
