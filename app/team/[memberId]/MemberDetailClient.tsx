'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Archive, X, Mail, CheckCircle } from 'lucide-react';
import { TEAM_MEMBER_ROLES } from '@/lib/team/roles';
import type { SerializedMember } from '../TeamListClient';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  sanitizePhone,
  formatPhoneAsYouType,
  sanitizeMoney,
  validatePhone,
  validateEmail,
  validateHourlyRate,
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

interface WorkloadData {
  activeJobs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  hoursThisMonth: number;
}

interface RecentJob {
  _id: string;
  title: string;
  status: string;
  total: number;
  createdAt: string;
  customerName: string;
}

interface Props {
  member: SerializedMember;
  workload: WorkloadData;
  recentJobs: RecentJob[];
}

function getRoleLabel(role: string): string {
  return TEAM_MEMBER_ROLES.find((r) => r.id === role)?.label ?? role;
}

function AvatarCircle({ member }: { member: SerializedMember }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: member.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 700,
        color: '#fff',
        fontFamily: 'var(--font-syne), sans-serif',
        flexShrink: 0,
      }}
    >
      {member.avatarInitials || '?'}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-card" style={{ flex: 1, padding: '14px 12px', textAlign: 'center', minWidth: 0 }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-text)', margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{label}</p>
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MemberDetailClient({ member: initialMember, workload, recentJobs }: Props) {
  const router = useRouter();
  const [member, setMember] = useState<SerializedMember>(initialMember);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Invite state
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(member.name);
  const [editRole, setEditRole] = useState(member.role);
  const [editEmail, setEditEmail] = useState(member.email);
  const [editPhone, setEditPhone] = useState(member.phone);
  const [editColor, setEditColor] = useState(member.color);
  const [editHourlyRate, setEditHourlyRate] = useState<string>(
    member.hourlyRate != null ? String(member.hourlyRate) : '',
  );
  const [editNotes, setEditNotes] = useState(member.notes);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});

  function openEdit() {
    setEditName(member.name);
    setEditRole(member.role);
    setEditEmail(member.email);
    setEditPhone(member.phone);
    setEditColor(member.color);
    setEditHourlyRate(member.hourlyRate != null ? String(member.hourlyRate) : '');
    setEditNotes(member.notes);
    setEditError(null);
    setEditFieldErrors({});
    setEditOpen(true);
  }

  async function handleSave() {
    if (!editName.trim()) {
      setEditError('Name is required.');
      return;
    }
    const errs = collectErrors({
      phone: validatePhone(editPhone),
      email: validateEmail(editEmail),
      hourlyRate: validateHourlyRate(editHourlyRate),
    });
    if (errs) {
      setEditFieldErrors(errs);
      return;
    }
    setEditFieldErrors({});
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/team/${member._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole,
          email: editEmail.trim(),
          phone: editPhone.trim(),
          color: editColor,
          hourlyRate: editHourlyRate === '' ? null : Number(editHourlyRate),
          notes: editNotes,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setEditError(json?.error ?? 'Failed to save');
        return;
      }
      setMember((prev) => ({
        ...prev,
        name: editName.trim(),
        role: editRole,
        email: editEmail.trim(),
        phone: editPhone.trim(),
        color: editColor,
        hourlyRate: editHourlyRate === '' ? null : Number(editHourlyRate),
        notes: editNotes,
        // Derive new initials client-side (server will persist correct value)
        avatarInitials: (() => {
          const parts = editName.trim().split(/\s+/).filter(Boolean);
          return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
        })(),
      }));
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive ${member.name}? They'll no longer appear in assignments but their job history is preserved.`)) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/team/${member._id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/team');
        router.refresh();
      }
    } finally {
      setArchiving(false);
    }
  }

  async function handleSendInvite() {
    setInviteSending(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/team/${member._id}/invite`, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (res.ok) {
        setInviteSuccess(true);
        setInviteConfirmOpen(false);
        setMember((prev) => ({
          ...prev,
          inviteSentAt: new Date().toISOString(),
        }));
      } else if (json?.error === 'email_in_use') {
        setInviteError(
          json.message ??
            'This email is already registered. Ask the person to use a different email.',
        );
        setInviteConfirmOpen(false);
      } else {
        setInviteError(json?.error ?? 'Failed to send invite. Please try again.');
        setInviteConfirmOpen(false);
      }
    } finally {
      setInviteSending(false);
    }
  }

  // Determine invite UI state
  const inviteSentRecently =
    member.inviteSentAt &&
    !member.linkedUserId &&
    Date.now() - new Date(member.inviteSentAt).getTime() < 7 * 86_400_000;

  return (
    <div className="settings-page page-padding">
      {/* Header */}
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <AvatarCircle member={member} />
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: 18,
                margin: 0,
              }}
            >
              {member.name}
            </h1>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: 'var(--quartz-bg)',
                border: '1px solid var(--quartz-border)',
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              {getRoleLabel(member.role)}
            </span>
          </div>
        </div>
        <button className="icon-btn" onClick={openEdit} aria-label="Edit member">
          <Pencil size={18} />
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <StatCard label="Active Jobs" value={workload.activeJobs} />
        <StatCard label="Done This Mo." value={workload.completedThisMonth} />
        <StatCard label="Revenue" value={formatCurrency(workload.revenueThisMonth)} />
        <StatCard label="Hours" value={workload.hoursThisMonth.toFixed(1)} />
      </div>

      {/* Contact info */}
      {(member.email || member.phone) && (
        <div style={{ marginBottom: 20 }}>
          <p className="settings-section-heading">CONTACT</p>
          <div className="glass-card settings-nav-card" style={{ padding: '12px 16px' }}>
            {member.email && (
              <div className="detail-row">
                <span className="totals-label">Email</span>
                <span style={{ fontSize: 14 }}>{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="detail-row">
                <span className="totals-label">Phone</span>
                <span style={{ fontSize: 14 }}>{member.phone}</span>
              </div>
            )}
            {member.hourlyRate != null && (
              <div className="detail-row">
                <span className="totals-label">Rate</span>
                <span style={{ fontSize: 14 }}>${member.hourlyRate}/hr</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {member.notes && (
        <div style={{ marginBottom: 20 }}>
          <p className="settings-section-heading">NOTES</p>
          <div className="glass-card" style={{ padding: '12px 16px' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {member.notes}
            </p>
          </div>
        </div>
      )}

      {/* Access / invite section */}
      <div style={{ marginBottom: 20 }}>
        <p className="settings-section-heading">ACCESS</p>
        <div className="glass-card settings-nav-card" style={{ padding: '12px 16px' }}>
          {member.linkedUserId ? (
            /* Member already has a login */
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="var(--success, #22c55e)" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Has login</p>
                {member.inviteAcceptedAt && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Joined {formatDate(member.inviteAcceptedAt)}
                  </p>
                )}
              </div>
            </div>
          ) : !member.email ? (
            /* No email — can't invite */
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
              <Mail size={18} />
              <div>
                <p style={{ fontSize: 14, margin: 0 }}>Send login invite</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Add an email to invite this member
                </p>
              </div>
            </div>
          ) : (
            /* Has email, no login yet */
            <div>
              {inviteError && (
                <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, marginBottom: 10 }}>
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p style={{ color: 'var(--success, #22c55e)', fontSize: 13, marginBottom: 10 }}>
                  Invite sent to {member.email}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, margin: 0 }}>
                    {inviteSentRecently ? 'Invite sent' : 'No login yet'}
                  </p>
                  {inviteSentRecently && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      Sent {formatDate(member.inviteSentAt!)}
                    </p>
                  )}
                </div>
                <button
                  className="btn-accent"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                  onClick={() => { setInviteConfirmOpen(true); setInviteError(null); }}
                  disabled={inviteSending}
                >
                  <Mail size={14} style={{ marginRight: 6 }} />
                  {inviteSentRecently ? 'Resend invite' : 'Send login invite'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite confirmation modal */}
      {inviteConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={(e) => e.target === e.currentTarget && setInviteConfirmOpen(false)}
        >
          <div
            style={{
              background: 'var(--quartz-bg)',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              padding: '24px 20px 40px',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
              Send login invite?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              We&apos;ll email <strong>{member.email}</strong> a 7-day link to set up their account.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setInviteConfirmOpen(false)}
                disabled={inviteSending}
              >
                Cancel
              </button>
              <button
                className="btn-accent"
                style={{ flex: 1 }}
                onClick={handleSendInvite}
                disabled={inviteSending}
              >
                {inviteSending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="settings-section-heading">RECENT JOBS</p>
          <div className="glass-card settings-nav-card">
            {recentJobs.map((job) => (
              <Link
                key={job._id}
                href={`/jobs/${job._id}`}
                className="settings-nav-row"
                style={{ textDecoration: 'none' }}
              >
                <span className="settings-nav-row__left">
                  <span className="settings-nav-row__label-wrap">
                    <span className="settings-nav-row__label">{job.title || 'Untitled'}</span>
                    <span className="settings-nav-row__sublabel">
                      {job.customerName && `${job.customerName} · `}
                      {formatDate(job.createdAt)}
                    </span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {job.total > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>
                      {formatCurrency(job.total)}
                    </span>
                  )}
                  <span className={`status-badge status-${job.status}`}>{job.status}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Archive button */}
      {member.active && (
        <button
          className="settings-nav-row settings-nav-row--danger"
          style={{ width: '100%', marginBottom: 40 }}
          onClick={handleArchive}
          disabled={archiving}
        >
          <span className="settings-nav-row__left">
            <span className="settings-nav-row__icon">
              <Archive size={18} />
            </span>
            <span className="settings-nav-row__label-wrap">
              <span className="settings-nav-row__label">
                {archiving ? 'Archiving…' : 'Archive member'}
              </span>
              <span className="settings-nav-row__sublabel">Preserves all job history</span>
            </span>
          </span>
        </button>
      )}

      {/* Edit slide-up sheet */}
      {editOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div
            style={{
              background: 'var(--quartz-bg)',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px 20px 40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18, margin: 0 }}>
                Edit member
              </h2>
              <button className="icon-btn" onClick={() => setEditOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {editError && (
              <p style={{ color: 'var(--danger, #ef4444)', fontSize: 13, marginBottom: 12 }}>{editError}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="section-label">Name *</label>
                <input
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="section-label">Role</label>
                <select
                  className="input-field"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {TEAM_MEMBER_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="section-label">Email</label>
                <input
                  className={`input-field${editFieldErrors.email ? ' input-field--error' : ''}`}
                  type="email"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (editFieldErrors.email) setEditFieldErrors((p) => ({ ...p, email: '' }));
                  }}
                  placeholder="email@example.com"
                  maxLength={254}
                  inputMode="email"
                />
                {editFieldErrors.email && <p className="field-error">{editFieldErrors.email}</p>}
              </div>

              <div>
                <label className="section-label" htmlFor="edit-member-phone">Phone</label>
                <input
                  id="edit-member-phone"
                  aria-invalid={!!editFieldErrors.phone || undefined}
                  aria-describedby={editFieldErrors.phone ? 'edit-member-phone-err' : undefined}
                  className={`input-field${editFieldErrors.phone ? ' input-field--error' : ''}`}
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(formatPhoneAsYouType(sanitizePhone(e.target.value)));
                    if (editFieldErrors.phone) setEditFieldErrors((p) => ({ ...p, phone: '' }));
                  }}
                  placeholder="(555) 123-4567"
                  maxLength={25}
                  inputMode="tel"
                />
                {editFieldErrors.phone && (
                  <p id="edit-member-phone-err" className="field-error" role="alert">{editFieldErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="section-label" htmlFor="edit-member-rate">Hourly Rate Override (optional)</label>
                <input
                  id="edit-member-rate"
                  aria-invalid={!!editFieldErrors.hourlyRate || undefined}
                  aria-describedby={editFieldErrors.hourlyRate ? 'edit-member-rate-err' : undefined}
                  className={`input-field${editFieldErrors.hourlyRate ? ' input-field--error' : ''}`}
                  type="number"
                  value={editHourlyRate}
                  onChange={(e) => {
                    setEditHourlyRate(sanitizeMoney(e.target.value));
                    if (editFieldErrors.hourlyRate) setEditFieldErrors((p) => ({ ...p, hourlyRate: '' }));
                  }}
                  placeholder="Inherits owner default"
                  min="0"
                  max="2000"
                  step="0.01"
                  inputMode="decimal"
                />
                {editFieldErrors.hourlyRate && (
                  <p id="edit-member-rate-err" className="field-error" role="alert">{editFieldErrors.hourlyRate}</p>
                )}
              </div>

              <div>
                <label className="section-label">Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {MEMBER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: c,
                        border: editColor === c ? '3px solid var(--accent-text)' : '3px solid transparent',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="section-label">Notes</label>
                <textarea
                  className="input-field"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes about this team member"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                className="btn-accent"
                onClick={handleSave}
                disabled={saving}
                style={{ marginTop: 4 }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
