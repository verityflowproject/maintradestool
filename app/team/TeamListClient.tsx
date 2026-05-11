'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Users } from 'lucide-react';
import { TEAM_MEMBER_ROLES } from '@/lib/team/roles';

export interface SerializedMember {
  _id: string;
  ownerUserId: string;
  linkedUserId: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  hourlyRate: number | null;
  color: string;
  avatarInitials: string;
  active: boolean;
  notes: string;
  inviteSentAt: string | null;
  inviteAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkloadData {
  activeJobs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  hoursThisMonth: number;
}

interface Props {
  members: SerializedMember[];
}

function getRoleLabel(role: string): string {
  return TEAM_MEMBER_ROLES.find((r) => r.id === role)?.label ?? role;
}

function AvatarCircle({ member }: { member: SerializedMember }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: member.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        fontFamily: 'var(--font-syne), sans-serif',
      }}
    >
      {member.avatarInitials || '?'}
    </div>
  );
}

function MemberRow({ member }: { member: SerializedMember }) {
  const [workload, setWorkload] = useState<WorkloadData | null>(null);

  useEffect(() => {
    fetch(`/api/team/${member._id}/workload`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setWorkload(d as WorkloadData);
      })
      .catch(() => null);
  }, [member._id]);

  return (
    <Link href={`/team/${member._id}`} className="settings-nav-row" style={{ textDecoration: 'none' }}>
      <span className="settings-nav-row__left" style={{ gap: 12 }}>
        <AvatarCircle member={member} />
        <span className="settings-nav-row__label-wrap">
          <span className="settings-nav-row__label">{member.name}</span>
          <span className="settings-nav-row__sublabel">
            {getRoleLabel(member.role)}
            {workload !== null
              ? ` · ${workload.activeJobs} active job${workload.activeJobs !== 1 ? 's' : ''}`
              : ' · …'}
          </span>
        </span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="settings-nav-row__arrow">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function ArchivedRow({ member, onRestore }: { member: SerializedMember; onRestore: (id: string) => void }) {
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      const res = await fetch(`/api/team/${member._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      });
      if (res.ok) onRestore(member._id);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="settings-nav-row" style={{ opacity: 0.6 }}>
      <span className="settings-nav-row__left" style={{ gap: 12 }}>
        <AvatarCircle member={member} />
        <span className="settings-nav-row__label-wrap">
          <span className="settings-nav-row__label">{member.name}</span>
          <span className="settings-nav-row__sublabel">{getRoleLabel(member.role)} · Archived</span>
        </span>
      </span>
      <button
        onClick={handleRestore}
        disabled={restoring}
        style={{
          background: 'none',
          border: '1px solid var(--quartz-border)',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 12,
          color: 'var(--accent-text)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {restoring ? '…' : 'Restore'}
      </button>
    </div>
  );
}

export default function TeamListClient({ members: initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<SerializedMember[]>(initialMembers);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const active = members.filter((m) => m.active);
  const archived = members.filter((m) => !m.active);

  function handleRestore(id: string) {
    setMembers((prev) =>
      prev.map((m) => (m._id === id ? { ...m, active: true } : m)),
    );
  }

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button
          className="icon-btn"
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={22} />
        </button>
        <h1
          className="settings-page__title"
          style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22, flex: 1 }}
        >
          Team
        </h1>
        <Link href="/team/new" className="icon-btn" aria-label="Add team member">
          <Plus size={22} />
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>No crew members yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 16px' }}>
            Add your first crew member to start assigning jobs.
          </p>
          <Link href="/team/new" className="btn-accent" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Add crew member
          </Link>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div className="glass-card settings-nav-card">
            {active.map((m) => (
              <MemberRow key={m._id} member={m} />
            ))}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              padding: '0 0 8px',
            }}
          >
            {archivedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Archived ({archived.length})
          </button>
          {archivedOpen && (
            <div className="glass-card settings-nav-card">
              {archived.map((m) => (
                <ArchivedRow key={m._id} member={m} onRestore={handleRestore} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
