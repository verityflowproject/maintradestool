'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import { TRADES, TEAM_SIZES, EXPERIENCE_YEARS } from '@/lib/constants';

interface Props {
  initialFirstName: string;
  initialTrade: string;
  initialTeamSize: string;
  initialExperienceYears: string;
}

export default function ProfileSettingsClient({
  initialFirstName,
  initialTrade,
  initialTeamSize,
  initialExperienceYears,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [teamSize, setTeamSize] = useState(initialTeamSize);
  const [experienceYears, setExperienceYears] = useState(initialExperienceYears);
  const [saving, setSaving] = useState(false);

  const trade = TRADES.find((t) => t.id === initialTrade);

  const handleSave = useCallback(async () => {
    if (!firstName.trim()) {
      toast.error('First name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), teamSize, experienceYears }),
      });
      if (res.ok) {
        toast.success('Profile updated.');
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [firstName, teamSize, experienceYears, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Profile</h1>
      </div>

      {/* First name */}
      <div className="settings-section" style={{ marginBottom: 16 }}>
        <div className="settings-form-field">
          <label className="settings-form-label">First name</label>
          <input
            className="input-field"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
          />
        </div>

        {/* Trade — read-only */}
        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Trade</label>
          <div className="settings-trade-chip">
            <span className="settings-trade-chip__emoji">{trade?.emoji ?? '🛠️'}</span>
            <span>{trade?.label ?? initialTrade}</span>
          </div>
        </div>
      </div>

      {/* Team size */}
      <p className="settings-section-heading">Team size</p>
      <div style={{ marginBottom: 16 }}>
        {TEAM_SIZES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`glass-card team-card${teamSize === opt.id ? ' selected' : ''}`}
            onClick={() => setTeamSize(opt.id)}
            aria-pressed={teamSize === opt.id}
            style={{ marginBottom: 8 }}
          >
            <span className="team-text">
              <span className="team-label">{opt.label}</span>
              <span className="team-sub">{opt.sub}</span>
            </span>
            <span className="team-radio" aria-hidden />
          </button>
        ))}
      </div>

      {/* Experience years */}
      <p className="settings-section-heading">Years in trade</p>
      <div style={{ marginBottom: 24 }}>
        {EXPERIENCE_YEARS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`glass-card team-card${experienceYears === opt.id ? ' selected' : ''}`}
            onClick={() => setExperienceYears(opt.id)}
            aria-pressed={experienceYears === opt.id}
            style={{ marginBottom: 8 }}
          >
            <span className="team-text">
              <span className="team-label">{opt.label}</span>
              <span className="team-sub">{opt.sub}</span>
            </span>
            <span className="team-radio" aria-hidden />
          </button>
        ))}
      </div>

      <button
        className="btn-accent"
        style={{ width: '100%' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
