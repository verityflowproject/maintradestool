'use client';

import { useState } from 'react';
import { Timer } from 'lucide-react';

interface TimeEntryItem {
  _id: string;
  memberName: string;
  memberColor: string;
  memberInitials: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
}

interface Props {
  jobId: string;
  entries: TimeEntryItem[];
  canApplyLabor: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function JobTimeSectionClient({ jobId, entries, canApplyLabor }: Props) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);
  const totalHours = +(totalMinutes / 60).toFixed(2);

  const apply = async () => {
    setApplying(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laborHours: totalHours }),
    });
    setApplying(false);
    if (res.ok) {
      setApplied(true);
    } else {
      setError('Failed to apply. Try again.');
    }
  };

  if (entries.length === 0) return null;

  return (
    <section className="job-form-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="section-label" style={{ margin: 0 }}>Time Logged</p>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-text)' }}>
          {formatDuration(totalMinutes)}
        </span>
      </div>
      <div className="detail-card glass-card">
        {entries.map((e, i) => (
          <div
            key={e._id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i > 0 ? '1px solid var(--quartz-border)' : undefined,
              paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: e.memberColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {e.memberInitials}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{e.memberName}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                {formatTime(e.startedAt)}{e.endedAt ? ` → ${formatTime(e.endedAt)}` : ' (running)'}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>
              {e.endedAt ? formatDuration(e.durationMinutes) : <Timer size={12} />}
            </span>
          </div>
        ))}

        {canApplyLabor && !applied && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--quartz-border)' }}>
            {error && <p style={{ color: 'var(--error, #ef4444)', fontSize: 12, marginBottom: 6 }}>{error}</p>}
            <button
              className="btn-ghost"
              style={{ width: '100%', fontSize: 13, padding: '8px' }}
              onClick={() => void apply()}
              disabled={applying}
            >
              {applying ? 'Applying…' : `Apply ${totalHours}h to labor hours`}
            </button>
          </div>
        )}
        {applied && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--accent-text)', textAlign: 'center' }}>
            ✓ Labor hours updated to {totalHours}h
          </p>
        )}
      </div>
    </section>
  );
}
