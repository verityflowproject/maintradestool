'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { TEAM_MEMBER_ROLES } from '@/lib/team/roles';

interface Props {
  showAvatarsOnJobs: boolean;
  requireAssignmentBeforeInvoice: boolean;
}

function ToggleRow({
  label,
  sublabel,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        cursor: disabled ? 'default' : 'pointer',
        borderBottom: '1px solid var(--quartz-border)',
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{sublabel}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 20, height: 20, flexShrink: 0 }}
      />
    </label>
  );
}

export default function SettingsTeamClient({
  showAvatarsOnJobs: initialShowAvatars,
  requireAssignmentBeforeInvoice: initialRequireAssignment,
}: Props) {
  const router = useRouter();

  const [showAvatars, setShowAvatars] = useState(initialShowAvatars);
  const [requireAssignment, setRequireAssignment] = useState(initialRequireAssignment);
  const [saving, setSaving] = useState(false);

  async function patchPref(patch: Record<string, boolean>) {
    setSaving(true);
    try {
      await fetch('/api/user/team-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button
          className="icon-btn"
          onClick={() => router.push('/settings')}
          aria-label="Back to settings"
        >
          <ChevronLeft size={22} />
        </button>
        <h1
          className="settings-page__title"
          style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22 }}
        >
          Team Management
        </h1>
      </div>

      {/* Roles & Permissions section */}
      <div style={{ marginBottom: 24 }}>
        <p className="settings-section-heading">ROLES &amp; PERMISSIONS</p>
        <div className="glass-card settings-nav-card" style={{ overflow: 'hidden' }}>
          {TEAM_MEMBER_ROLES.map((r, i) => (
            <div
              key={r.id}
              style={{
                padding: '12px 16px',
                borderBottom: i < TEAM_MEMBER_ROLES.length - 1 ? '1px solid var(--quartz-border)' : undefined,
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{r.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{r.sub}</p>
            </div>
          ))}
          <div style={{ padding: '10px 16px', background: 'var(--accent-dim)' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--accent-text)' }}>
              Role-based permission enforcement is coming in a future update. Roles are advisory metadata for now — they help you organise your team.
            </p>
          </div>
        </div>
      </div>

      {/* Team defaults section */}
      <div style={{ marginBottom: 24 }}>
        <p className="settings-section-heading">TEAM DEFAULTS</p>
        <div className="glass-card settings-nav-card" style={{ overflow: 'hidden' }}>
          <ToggleRow
            label="Show avatars on job cards"
            sublabel="Display assigned-member chips on the jobs list"
            checked={showAvatars}
            disabled={saving}
            onChange={(v) => {
              setShowAvatars(v);
              void patchPref({ showAvatarsOnJobs: v });
            }}
          />
          <ToggleRow
            label="Require assignment before invoicing"
            sublabel="Block invoice generation for jobs with no assigned team members"
            checked={requireAssignment}
            disabled={saving}
            onChange={(v) => {
              setRequireAssignment(v);
              void patchPref({ requireAssignmentBeforeInvoice: v });
            }}
          />
        </div>
      </div>
    </div>
  );
}
