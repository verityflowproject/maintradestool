'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, ChevronLeft, X, Eye } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

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
  initialSlug: string | null;
  initialEnabled: boolean;
  initialPhone: string;
  initialEmail: string;
  initialProfile: BookingProfile;
}

export default function BookingSettingsClient({
  initialSlug,
  initialEnabled,
  initialPhone,
  initialEmail,
  initialProfile,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug ?? '');
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<BookingProfile>({
    ...initialProfile,
  });
  const [tagInput, setTagInput] = useState('');

  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const APP_URL = 'tradesbrain.com';

  const handleToggle = useCallback(async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);

    const body: Record<string, unknown> = { bookingEnabled: newEnabled };

    const res = await fetch('/api/user/booking-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as { slug: string };
      if (data.slug && !slug) {
        setSlug(data.slug);
        setSlugInput(data.slug);
      }
    } else {
      setEnabled(!newEnabled);
      toast.error('Failed to update booking status.');
    }
  }, [enabled, slug, toast]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`https://${APP_URL}/book/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slug]);

  const handleSlugBlur = useCallback(async () => {
    const candidate = slugInput.toLowerCase().trim();
    if (!candidate || candidate === slug) {
      setSlugStatus('idle');
      return;
    }
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    const res = await fetch(`/api/booking/check-slug?slug=${encodeURIComponent(candidate)}`);
    if (res.ok) {
      const data = (await res.json()) as { available: boolean };
      setSlugStatus(data.available ? 'ok' : 'err');
    }
  }, [slugInput, slug]);

  const handleAddTag = useCallback(
    (val: string) => {
      const tag = val.trim();
      if (!tag || profile.services.includes(tag)) return;
      setProfile((p) => ({ ...p, services: [...p.services, tag] }));
      setTagInput('');
    },
    [profile.services],
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setProfile((p) => ({ ...p, services: p.services.filter((s) => s !== tag) }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        bookingEnabled: enabled,
        bookingProfile: {
          ...profile,
          showPhone: profile.showPhone,
          showEmail: profile.showEmail,
        },
        phone,
      };

      if (slugStatus === 'ok' && slugInput !== slug) {
        body.bookingSlug = slugInput;
      }

      const res = await fetch('/api/user/booking-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { slug: string };
        if (data.slug) {
          setSlug(data.slug);
          setSlugInput(data.slug);
        }
        setSlugStatus('idle');
        setEditingSlug(false);
        toast.success('Booking profile saved!');
      } else {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? 'Failed to save changes.');
      }
    } finally {
      setSaving(false);
    }
  }, [enabled, profile, phone, slug, slugInput, slugStatus, toast]);

  return (
    <div className="settings-page page-padding">
      {/* Header */}
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title">Your Booking Link</h1>
      </div>

      {/* Enable toggle */}
      <div className="settings-section">
        <div className="booking-toggle-row">
          <div>
            <p className="booking-toggle-row__label">Enable booking page</p>
            <p className="booking-toggle-row__sub">Customers can discover and book you online</p>
          </div>
          <button
            className={`switch${enabled ? ' is-on' : ''}`}
            onClick={handleToggle}
            aria-label="Toggle booking page"
            role="switch"
            aria-checked={enabled}
          />
        </div>
      </div>

      {/* URL Block */}
      {enabled && slug && (
        <div className="settings-section">
          <p className="settings-section__label">Your public link</p>
          <div className="booking-url-row">
            {editingSlug ? (
              <div className="slug-edit-wrap">
                <span className="slug-prefix">{APP_URL}/book/</span>
                <input
                  className={`slug-input${slugStatus === 'ok' ? ' slug-ok' : slugStatus === 'err' ? ' slug-err' : ''}`}
                  value={slugInput}
                  onChange={(e) => {
                    setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugStatus('idle');
                  }}
                  onBlur={handleSlugBlur}
                  autoFocus
                />
                {slugStatus === 'ok' && <span className="slug-status-ok">✓ Available</span>}
                {slugStatus === 'err' && <span className="slug-status-err">✗ Taken</span>}
              </div>
            ) : (
              <span className="booking-url-text">
                {APP_URL}/book/<strong>{slug}</strong>
              </span>
            )}
            <div className="booking-url-actions">
              {!editingSlug && (
                <button
                  className="copy-btn-ghost"
                  onClick={() => setEditingSlug(true)}
                >
                  Edit
                </button>
              )}
              <button className="copy-btn-ghost" onClick={handleCopy} aria-label="Copy link">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile editor */}
      <div className="settings-section">
        <p className="settings-section__label">Profile</p>

        <div className="profile-form-field">
          <label className="profile-form-field__label">Headline</label>
          <input
            className="input-field"
            maxLength={80}
            placeholder="Licensed Plumber · Fort Worth, TX"
            value={profile.headline}
            onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))}
          />
        </div>

        <div className="profile-form-field">
          <label className="profile-form-field__label">
            About <span className="char-counter">{profile.bio.length}/300</span>
          </label>
          <textarea
            className="input-field"
            rows={4}
            maxLength={300}
            placeholder="Tell customers about your experience and approach."
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
          />
        </div>

        <div className="profile-form-field">
          <label className="profile-form-field__label">Services offered</label>
          <div className="tag-input-row">
            {profile.services.map((tag) => (
              <span key={tag} className="tag-pill">
                {tag}
                <button
                  className="tag-pill__remove"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove ${tag}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              className="tag-input-field"
              placeholder="Add service + Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
            />
          </div>
        </div>

        <div className="profile-form-field">
          <label className="profile-form-field__label">Service area</label>
          <input
            className="input-field"
            placeholder="Fort Worth & surrounding areas"
            value={profile.serviceArea}
            onChange={(e) => setProfile((p) => ({ ...p, serviceArea: e.target.value }))}
          />
        </div>

        <div className="profile-form-field">
          <label className="profile-form-field__label">Response time</label>
          <input
            className="input-field"
            placeholder="Usually responds within 2 hours"
            value={profile.responseTime}
            onChange={(e) => setProfile((p) => ({ ...p, responseTime: e.target.value }))}
          />
        </div>
      </div>

      {/* Visibility toggles */}
      <div className="settings-section">
        <p className="settings-section__label">Contact visibility</p>

        <div className="booking-toggle-row">
          <span className="booking-toggle-row__label">Show phone number</span>
          <button
            className={`switch${profile.showPhone ? ' is-on' : ''}`}
            onClick={() => setProfile((p) => ({ ...p, showPhone: !p.showPhone }))}
            role="switch"
            aria-checked={profile.showPhone}
          />
        </div>
        {profile.showPhone && (
          <input
            className="input-field"
            style={{ marginTop: 8 }}
            type="tel"
            placeholder="Your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}

        <div className="booking-toggle-row" style={{ marginTop: 12 }}>
          <span className="booking-toggle-row__label">Show email</span>
          <button
            className={`switch${profile.showEmail ? ' is-on' : ''}`}
            onClick={() => setProfile((p) => ({ ...p, showEmail: !p.showEmail }))}
            role="switch"
            aria-checked={profile.showEmail}
          />
        </div>
        {profile.showEmail && (
          <p className="settings-sub-note" style={{ marginTop: 6 }}>
            Your account email ({initialEmail}) will be shown.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          className="btn-accent"
          style={{ flex: 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px' }}
          onClick={() => router.push('/settings/booking/preview')}
          type="button"
          title="Preview your booking page as clients see it"
        >
          <Eye size={15} />
          Preview
        </button>
      </div>
    </div>
  );
}
