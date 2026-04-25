'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Mic } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

// ── Types ──────────────────────────────────────────────────────────────

export interface JobRow {
  _id: string;
  title?: string;
  status?: string;
  customerName?: string;
  customerAddress?: string;
  total?: number;
  laborHours?: number;
  createdAt?: string;
  aiParsed?: boolean;
  invoiceNumber?: string;
  invoiceId?: string;
}

type StatusFilter = 'all' | 'draft' | 'complete' | 'invoiced' | 'paid';

interface Props {
  initial: JobRow[];
  totalCount: number;
}

const STATUS_PILLS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'complete', label: 'Complete' },
  { key: 'invoiced', label: 'Invoiced' },
  { key: 'paid', label: 'Paid' },
];

// ── Date helper ────────────────────────────────────────────────────────

function formatJobDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── StatusBadge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  return <span className={`status-badge status-${s}`}>{s}</span>;
}

// ── JobCard (with swipe) ───────────────────────────────────────────────

function JobCard({
  job,
  onDelete,
  onMarkPaid,
}: {
  job: JobRow;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const status = job.status ?? 'draft';
  const showInvoice = status === 'complete';
  const showMarkPaid = status === 'invoiced';

  // Number of action buttons visible behind card
  const actionCount = (showInvoice ? 1 : 0) + (showMarkPaid ? 1 : 0) + 1; // +1 for delete
  const maxReveal = actionCount * 80;

  // Snap back when clicking outside
  useEffect(() => {
    if (offset === 0) return;
    function handleOutside(e: PointerEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOffset(0);
      }
    }
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [offset]);

  function onPointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    isDraggingRef.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 5) isDraggingRef.current = true;
    const next = Math.min(0, Math.max(-maxReveal, offset + dx));
    // Only allow leftward swipe (dx < 0) while dragging
    if (dx < 0 || offset < 0) {
      setOffset(next);
      startXRef.current = e.clientX;
    }
  }

  function onPointerUp() {
    startXRef.current = null;
    const abs = Math.abs(offset);
    if (abs < 40) {
      setOffset(0);
    } else if (abs < maxReveal * 0.75) {
      setOffset(-maxReveal);
    } else {
      setOffset(-maxReveal);
    }
  }

  function handleCardClick() {
    if (isDraggingRef.current || offset !== 0) {
      // tap when revealed → snap back
      setOffset(0);
      return;
    }
    router.push(`/jobs/${job._id}`);
  }

  async function handleMarkPaid() {
    if (!job.invoiceId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${job.invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (res.ok) {
        onMarkPaid(job._id);
        setOffset(0);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(job._id);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="job-card-swipe" ref={cardRef}>
      {/* Action buttons (behind card) */}
      <div className="job-card-actions">
        {showInvoice && (
          <button
            className="job-card-action job-card-action--invoice"
            onClick={() => router.push(`/jobs/${job._id}/invoice`)}
            disabled={busy}
          >
            Invoice
          </button>
        )}
        {showMarkPaid && (
          <button
            className="job-card-action job-card-action--paid"
            onClick={handleMarkPaid}
            disabled={busy}
          >
            Mark Paid
          </button>
        )}
        {/* Delete action */}
        {confirmDelete ? (
          <div className="job-card-action job-card-action--delete job-card-action--confirm">
            <button className="job-delete-confirm-yes" onClick={handleDelete} disabled={busy}>
              {busy ? '…' : 'Delete'}
            </button>
            <button className="job-delete-confirm-no" onClick={() => { setConfirmDelete(false); setOffset(0); }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="job-card-action job-card-action--delete"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete
          </button>
        )}
      </div>

      {/* Foreground card */}
      <div
        className="glass-card job-card"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleCardClick}
      >
        <div className="job-card__top">
          <span className="job-card__title">{job.title || 'Untitled Job'}</span>
          <StatusBadge status={status} />
        </div>
        <div className="job-card__meta">
          {job.customerName && (
            <span className="job-card__customer">{job.customerName}</span>
          )}
          {job.aiParsed && (
            <span className="ai-logged-badge-inline">AI</span>
          )}
        </div>
        <div className="job-card__bottom">
          <span className="job-card__date">{formatJobDate(job.createdAt)}</span>
          {job.total != null && job.total > 0 && (
            <span className="job-card__total">{formatCurrency(job.total)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── JobsClient ─────────────────────────────────────────────────────────

export default function JobsClient({ initial, totalCount: initialTotal }: Props) {
  const [jobs, setJobs] = useState<JobRow[]>(initial);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(
    () => (activeStatus === 'all' ? jobs : jobs.filter((j) => j.status === activeStatus)),
    [jobs, activeStatus],
  );

  const handleDelete = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j._id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  const handleMarkPaid = useCallback((id: string) => {
    setJobs((prev) => prev.map((j) => (j._id === id ? { ...j, status: 'paid' } : j)));
  }, []);

  return (
    <div className="jobs-page">
      {/* Header */}
      <header className="jobs-header">
        <h1 className="jobs-title">Jobs</h1>
        <span className="jobs-count-badge">{totalCount}</span>
      </header>

      {/* Filter pills */}
      {jobs.length > 0 && (
        <div className="jobs-filter-row">
          {STATUS_PILLS.map(({ key, label }) => (
            <button
              key={key}
              className={`jobs-filter-pill${activeStatus === key ? ' active' : ''}`}
              onClick={() => setActiveStatus(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* No jobs at all */}
      {jobs.length === 0 && (
        <div className="jobs-empty">
          <Briefcase className="jobs-empty__icon" size={48} />
          <p className="jobs-empty__heading">No jobs yet.</p>
          <p className="jobs-empty__sub">Tap the mic button to log your first job.</p>
          <Link href="/jobs/new/voice" className="btn-accent jobs-empty__mic">
            <Mic size={18} />
            Log a Job
          </Link>
        </div>
      )}

      {/* Filter active — no results */}
      {jobs.length > 0 && filtered.length === 0 && (
        <div className="jobs-empty-filtered">
          <p>No {activeStatus} jobs.</p>
          <button className="clear-filter-link" onClick={() => setActiveStatus('all')}>
            Clear filter
          </button>
        </div>
      )}

      {/* Jobs list */}
      {filtered.length > 0 && (
        <div className="jobs-list">
          {filtered.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onDelete={handleDelete}
              onMarkPaid={handleMarkPaid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
