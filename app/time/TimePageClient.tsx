'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, Square, Clock, Pencil, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

// ── Types ──────────────────────────────────────────────────────────────

interface JobRef {
  _id: string;
  title?: string;
}

interface MemberRef {
  _id: string;
  name: string;
  color: string;
  avatarInitials: string;
}

interface TimeEntryRow {
  _id: string;
  jobId: JobRef | string;
  teamMemberId: MemberRef | string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  hourlyRate: number;
  notes: string;
}

interface AssignedJob {
  _id: string;
  title?: string;
  customerName?: string;
}

interface Props {
  mode: 'member' | 'owner';
  openEntry: TimeEntryRow | null;
  weekEntries: TimeEntryRow[] | null;
  assignedJobs: AssignedJob[] | null;
  allEntries: TimeEntryRow[] | null;
  members: MemberRef[] | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function jobTitle(entry: TimeEntryRow): string {
  const j = entry.jobId;
  if (typeof j === 'object' && j !== null) return (j as JobRef).title ?? 'Unknown Job';
  return 'Unknown Job';
}

function memberName(entry: TimeEntryRow): string {
  const m = entry.teamMemberId;
  if (typeof m === 'object' && m !== null) return (m as MemberRef).name;
  return 'Unknown';
}

function memberColor(entry: TimeEntryRow): string {
  const m = entry.teamMemberId;
  if (typeof m === 'object' && m !== null) return (m as MemberRef).color;
  return '#888';
}

function memberInitials(entry: TimeEntryRow): string {
  const m = entry.teamMemberId;
  if (typeof m === 'object' && m !== null) return (m as MemberRef).avatarInitials;
  return '??';
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function elapsedSince(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeRange(started: string, ended: string | null): string {
  const s = new Date(started);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  if (!ended) return `${s.toLocaleTimeString('en-US', opts)} → running`;
  const e = new Date(ended);
  return `${s.toLocaleTimeString('en-US', opts)} → ${e.toLocaleTimeString('en-US', opts)}`;
}

// ── Member View ────────────────────────────────────────────────────────

function MemberTimeView({
  initialOpenEntry,
  initialWeekEntries,
  assignedJobs,
}: {
  initialOpenEntry: TimeEntryRow | null;
  initialWeekEntries: TimeEntryRow[];
  assignedJobs: AssignedJob[];
}) {
  const [openEntry, setOpenEntry] = useState<TimeEntryRow | null>(initialOpenEntry);
  const [weekEntries, setWeekEntries] = useState<TimeEntryRow[]>(initialWeekEntries);
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cloningJobId, setCloningJobId] = useState<string | null>(null);

  // Live ticker for the elapsed timer
  useEffect(() => {
    if (!openEntry) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [openEntry]);

  const clockIn = useCallback(async (jobId: string) => {
    setError(null);
    setCloningJobId(jobId);
    try {
      const res = await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { entry?: { _id: string }; error?: string; openJobId?: string };
      if (res.status === 409 && data.error === 'already_clocked_in') {
        setError(`You're already clocked in${data.openJobId ? ' on another job' : ''}. Clock out first.`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Failed to clock in');
        return;
      }
      // Reload the page data by creating a stub entry for the timer
      setOpenEntry({
        _id: data.entry!._id,
        jobId: assignedJobs.find((j) => j._id === jobId) ?? jobId,
        teamMemberId: '',
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationMinutes: 0,
        hourlyRate: 0,
        notes: '',
      });
    } finally {
      setCloningJobId(null);
    }
  }, [assignedJobs]);

  const clockOut = useCallback(async () => {
    if (!openEntry) return;
    setError(null);
    const res = await fetch(`/api/time/${openEntry._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    });
    const data = await res.json() as { ok?: boolean; durationMinutes?: number; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Failed to clock out');
      return;
    }
    const stopped: TimeEntryRow = {
      ...openEntry,
      endedAt: new Date().toISOString(),
      durationMinutes: data.durationMinutes ?? 0,
    };
    setOpenEntry(null);
    setWeekEntries((prev) => [stopped, ...prev]);
  }, [openEntry]);

  const weekTotal = weekEntries.reduce((s, e) => s + e.durationMinutes, 0);

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {error && (
        <div style={{
          background: 'var(--warning-dim, #fff3cd)',
          border: '1px solid var(--warning)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--warning)',
        }}>
          {error}
        </div>
      )}

      {openEntry ? (
        <div className="glass-card" style={{ padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--error, #ef4444)', flexShrink: 0,
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--error, #ef4444)' }}>
              CLOCKED IN
            </span>
          </div>
          <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: 15 }}>
            {jobTitle(openEntry)}
          </p>
          <p style={{
            fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-syne)',
            letterSpacing: '0.04em', margin: '8px 0 14px',
            color: 'var(--accent-text)',
          }}>
            {elapsedSince(openEntry.startedAt)}
          </p>
          <button
            className="btn-danger"
            style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 600 }}
            onClick={() => void clockOut()}
          >
            <Square size={16} style={{ marginRight: 6 }} />
            Clock Out
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Select a job to clock in:
          </p>
          {assignedJobs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No active jobs assigned to you.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {assignedJobs.map((job) => (
                <div key={job._id} className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{job.title ?? 'Untitled Job'}</p>
                    {job.customerName && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{job.customerName}</p>
                    )}
                  </div>
                  <button
                    className="btn-accent"
                    style={{ padding: '8px 14px', fontSize: 13 }}
                    disabled={cloningJobId === job._id}
                    onClick={() => void clockIn(job._id)}
                  >
                    <Play size={14} style={{ marginRight: 4 }} />
                    {cloningJobId === job._id ? 'Clocking in…' : 'Clock In'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* This week's entries */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0 }}>
            This Week
          </h2>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-text)' }}>
            Total: {formatDuration(weekTotal)}
          </span>
        </div>
        {weekEntries.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No entries yet this week.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekEntries.map((e) => (
              <div key={e._id} className="glass-card" style={{ padding: '12px 14px' }}>
                <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: 14 }}>{jobTitle(e)}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  {formatTimeRange(e.startedAt, e.endedAt)} · {e.endedAt ? formatDuration(e.durationMinutes) : 'in progress'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Owner/Manager Edit Modal ───────────────────────────────────────────

function EditModal({
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry: TimeEntryRow;
  onClose: () => void;
  onSaved: (updated: TimeEntryRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [startedAt, setStartedAt] = useState(
    entry.startedAt ? new Date(entry.startedAt).toISOString().slice(0, 16) : '',
  );
  const [endedAt, setEndedAt] = useState(
    entry.endedAt ? new Date(entry.endedAt).toISOString().slice(0, 16) : '',
  );
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/time/${entry._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startedAt: startedAt ? new Date(startedAt).toISOString() : undefined,
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        notes,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({
        ...entry,
        startedAt: startedAt ? new Date(startedAt).toISOString() : entry.startedAt,
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        notes,
      });
      onClose();
    }
  };

  const del = async () => {
    setDeleting(true);
    const res = await fetch(`/api/time/${entry._id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      onDeleted(entry._id);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: 480,
        padding: '20px 20px 36px',
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Time Entry</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          {memberName(entry)} · {jobTitle(entry)}
        </p>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Started</label>
        <input
          type="datetime-local"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: '8px', borderRadius: 8, border: '1px solid var(--quartz-border)', background: 'var(--quartz-bg)', fontSize: 14 }}
        />
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ended</label>
        <input
          type="datetime-local"
          value={endedAt}
          onChange={(e) => setEndedAt(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: '8px', borderRadius: 8, border: '1px solid var(--quartz-border)', background: 'var(--quartz-bg)', fontSize: 14 }}
        />
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ width: '100%', marginBottom: 16, padding: '8px', borderRadius: 8, border: '1px solid var(--quartz-border)', background: 'var(--quartz-bg)', fontSize: 14, resize: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-accent" style={{ flex: 1, padding: '10px' }} onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            style={{ padding: '10px 14px', background: 'none', border: '1px solid var(--error, #ef4444)', color: 'var(--error, #ef4444)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            onClick={() => void del()}
            disabled={deleting}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Owner/Manager View ────────────────────────────────────────────────

function OwnerTimeView({
  initialEntries,
  members,
}: {
  initialEntries: TimeEntryRow[];
  members: MemberRef[];
}) {
  const [entries, setEntries] = useState<TimeEntryRow[]>(initialEntries);
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [editEntry, setEditEntry] = useState<TimeEntryRow | null>(null);

  const visible = memberFilter === 'all'
    ? entries
    : entries.filter((e) => {
        const m = e.teamMemberId;
        const id = typeof m === 'object' ? (m as MemberRef)._id : m;
        return id === memberFilter;
      });

  const totalHours = visible.reduce((s, e) => s + e.durationMinutes / 60, 0);
  const totalGross = visible.reduce((s, e) => s + (e.durationMinutes / 60) * e.hourlyRate, 0);

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Member filter */}
      {members.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
          <button
            className={`jobs-filter-pill${memberFilter === 'all' ? ' active' : ''}`}
            onClick={() => setMemberFilter('all')}
          >
            All
          </button>
          {members.map((m) => (
            <button
              key={m._id}
              className={`jobs-filter-pill${memberFilter === m._id ? ' active' : ''}`}
              style={memberFilter === m._id ? { borderColor: m.color, background: `${m.color}22`, color: m.color } : {}}
              onClick={() => setMemberFilter(m._id)}
            >
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Totals */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="glass-card stat-tile-dash" style={{ flex: 1 }}>
          <span className="stat-tile-dash__value">{totalHours.toFixed(1)}h</span>
          <span className="stat-tile-dash__label">Hours</span>
        </div>
        <div className="glass-card stat-tile-dash" style={{ flex: 1 }}>
          <span className="stat-tile-dash__value">{formatCurrency(totalGross)}</span>
          <span className="stat-tile-dash__label">Est. Labor Cost</span>
        </div>
      </div>

      {/* Entries list */}
      {visible.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No time entries for this period.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((e) => (
            <div key={e._id} className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: memberColor(e),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {memberInitials(e)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, margin: '0 0 1px', fontSize: 14 }}>{jobTitle(e)}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 1px' }}>
                  {memberName(e)} · {formatTimeRange(e.startedAt, e.endedAt)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--accent-text)', margin: 0 }}>
                  {e.endedAt ? formatDuration(e.durationMinutes) : 'In progress'} · {formatCurrency((e.durationMinutes / 60) * e.hourlyRate)}
                </p>
              </div>
              <button onClick={() => setEditEntry(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editEntry && (
        <EditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={(updated) => {
            setEntries((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
            setEditEntry(null);
          }}
          onDeleted={(id) => {
            setEntries((prev) => prev.filter((e) => e._id !== id));
            setEditEntry(null);
          }}
        />
      )}
    </div>
  );
}

// ── TimePageClient ─────────────────────────────────────────────────────

export default function TimePageClient({
  mode,
  openEntry,
  weekEntries,
  assignedJobs,
  allEntries,
  members,
}: Props) {
  const router = useRouter();

  return (
    <div style={{ paddingTop: 0 }}>
      {/* Header */}
      <div className="settings-page__header" style={{ padding: '16px 16px 0' }}>
        <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={20} />
          {mode === 'member' ? 'My Time' : 'Team Time'}
        </h1>
      </div>

      <div style={{ paddingTop: 16 }}>
        {mode === 'member' ? (
          <MemberTimeView
            initialOpenEntry={openEntry}
            initialWeekEntries={weekEntries ?? []}
            assignedJobs={assignedJobs ?? []}
          />
        ) : (
          <OwnerTimeView
            initialEntries={allEntries ?? []}
            members={members ?? []}
          />
        )}
      </div>
    </div>
  );
}
