'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Mic,
  Inbox,
  Phone,
  Calendar,
  Clock,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
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
  bookingRequestId?: string | null;
  scheduledDate?: string | null;
}

export interface RequestRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceNeeded: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: 'new' | 'viewed' | 'accepted' | 'declined' | 'converted';
  linkedJobId?: string | null;
  createdAt: string;
}

type MainTab = 'pipeline' | 'jobs' | 'requests';
type StatusFilter = 'all' | 'draft' | 'complete' | 'invoiced' | 'paid';
type PipelineFilter = 'all' | 'new' | 'active' | 'scheduled' | 'closed' | 'declined';

interface Props {
  initial: JobRow[];
  totalCount: number;
  initialRequests: RequestRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPreferredDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const REQUEST_STATUS_LABEL: Record<RequestRow['status'], string> = {
  new: 'New',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  converted: 'Converted',
};

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

// ── StatusBadge (jobs) ─────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  return <span className={`status-badge status-${s}`}>{s}</span>;
}

// ── RequestStatusBadge ─────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: RequestRow['status'] }) {
  return (
    <span className="status-badge-request" data-status={status}>
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
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
  const actionCount = (showInvoice ? 1 : 0) + (showMarkPaid ? 1 : 0) + 1;
  const maxReveal = actionCount * 80;

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
    if (dx < 0 || offset < 0) {
      setOffset(next);
      startXRef.current = e.clientX;
    }
  }

  function onPointerUp() {
    startXRef.current = null;
    const abs = Math.abs(offset);
    if (abs < 40) setOffset(0);
    else setOffset(-maxReveal);
  }

  function handleCardClick() {
    if (isDraggingRef.current || offset !== 0) {
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
      if (res.ok) { onMarkPaid(job._id); setOffset(0); }
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}`, { method: 'DELETE' });
      if (res.ok) onDelete(job._id);
    } finally { setBusy(false); }
  }

  return (
    <div className="job-card-swipe" ref={cardRef}>
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
          {job.aiParsed && <span className="ai-logged-badge-inline">AI</span>}
        </div>
        <div className="job-card__bottom">
          <span className="job-card__date">{formatDate(job.createdAt)}</span>
          {job.total != null && job.total > 0 && (
            <span className="job-card__total">{formatCurrency(job.total)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PipelineCard ──────────────────────────────────────────────────────

type PipelineItem =
  | ({ kind: 'request' } & RequestRow)
  | ({ kind: 'job' } & JobRow);

function PipelineCard({ item }: { item: PipelineItem }) {
  const router = useRouter();

  if (item.kind === 'request') {
    const r = item;
    return (
      <div
        className="glass-card pipeline-card pipeline-card--request"
        onClick={() => router.push(`/requests/${r._id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && router.push(`/requests/${r._id}`)}
      >
        <div className="pipeline-card__top">
          <div className="pipeline-card__badges">
            <span className="pipeline-source-pill pipeline-source-pill--request">Request</span>
            <RequestStatusBadge status={r.status} />
          </div>
          <span className="pipeline-card__date">{formatDate(r.createdAt)}</span>
        </div>

        <p className="pipeline-card__title">{r.serviceNeeded}</p>

        <div className="pipeline-card__meta-row">
          <span className="pipeline-card__customer">{r.name}</span>
          {r.phone && (
            <span className="pipeline-card__detail">
              <Phone size={11} />
              {r.phone}
            </span>
          )}
        </div>

        {(r.preferredDate || r.preferredTime) && (
          <div className="pipeline-card__meta-row">
            {r.preferredDate && (
              <span className="pipeline-card__detail">
                <Calendar size={11} />
                {formatPreferredDate(r.preferredDate)}
              </span>
            )}
            {r.preferredTime && (
              <span className="pipeline-card__detail">
                <Clock size={11} />
                {r.preferredTime}
              </span>
            )}
          </div>
        )}

        {r.status === 'converted' && r.linkedJobId && (
          <div className="pipeline-card__linked">
            <LinkIcon size={11} />
            <span>Job created</span>
            <ArrowRight size={11} />
          </div>
        )}
      </div>
    );
  }

  // kind === 'job'
  const j = item;
  return (
    <div
      className="glass-card pipeline-card pipeline-card--job"
      onClick={() => router.push(`/jobs/${j._id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/jobs/${j._id}`)}
    >
      <div className="pipeline-card__top">
        <div className="pipeline-card__badges">
          <span className="pipeline-source-pill pipeline-source-pill--job">Job</span>
          <StatusBadge status={j.status ?? 'draft'} />
          {j.aiParsed && <span className="ai-logged-badge-inline">AI</span>}
        </div>
        <span className="pipeline-card__date">{formatDate(j.createdAt)}</span>
      </div>

      <p className="pipeline-card__title">{j.title || 'Untitled Job'}</p>

      <div className="pipeline-card__meta-row">
        {j.customerName && (
          <span className="pipeline-card__customer">{j.customerName}</span>
        )}
        {j.customerAddress && (
          <span className="pipeline-card__detail pipeline-card__detail--addr">
            {j.customerAddress}
          </span>
        )}
      </div>

      <div className="pipeline-card__bottom-row">
        {j.scheduledDate && (
          <span className="pipeline-card__detail">
            <Calendar size={11} />
            {formatDate(j.scheduledDate)}
          </span>
        )}
        {j.invoiceNumber && (
          <span className="pipeline-card__detail">#{j.invoiceNumber}</span>
        )}
        {j.total != null && j.total > 0 && (
          <span className="pipeline-card__total">{formatCurrency(j.total)}</span>
        )}
        {j.bookingRequestId && (
          <span className="pipeline-card__linked">
            <LinkIcon size={11} />
            From request
          </span>
        )}
      </div>
    </div>
  );
}

// ── Inline Requests list (for Requests tab) ───────────────────────────

function InlineRequestsList({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) {
    return (
      <div className="requests-empty" style={{ paddingTop: 40 }}>
        <Inbox size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <p className="requests-empty__heading">No requests yet</p>
        <p className="requests-empty__sub">Share your booking link to start receiving job requests.</p>
      </div>
    );
  }

  return (
    <div className="requests-list">
      {requests.map((r) => (
        <Link key={r._id} href={`/requests/${r._id}`} className="request-card glass-card">
          <div className="request-card__top">
            <div>
              <p className="request-card__name">{r.name}</p>
              <p className="request-card__phone">{r.phone}</p>
            </div>
            <RequestStatusBadge status={r.status} />
          </div>
          <p className="request-card__body">{r.serviceNeeded}</p>
          <div className="request-card__meta">
            {r.preferredDate && <span>{formatPreferredDate(r.preferredDate)}</span>}
            <span>{DATE_FMT.format(new Date(r.createdAt))}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Pipeline filter logic ─────────────────────────────────────────────

function matchesPipelineFilter(item: PipelineItem, filter: PipelineFilter): boolean {
  if (filter === 'all') return true;

  if (item.kind === 'request') {
    const s = item.status;
    if (filter === 'new') return s === 'new';
    if (filter === 'active') return s === 'new' || s === 'viewed' || s === 'accepted';
    if (filter === 'closed') return s === 'converted';
    if (filter === 'declined') return s === 'declined';
    if (filter === 'scheduled') return !!(item.preferredDate);
    return false;
  }

  // job
  const s = item.status ?? 'draft';
  if (filter === 'new') return false;
  if (filter === 'active') return s === 'draft' || s === 'complete' || s === 'invoiced';
  if (filter === 'closed') return s === 'paid';
  if (filter === 'declined') return false;
  if (filter === 'scheduled') return !!(item.scheduledDate);
  return false;
}

// ── JobsClient ─────────────────────────────────────────────────────────

const JOB_STATUS_PILLS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'complete', label: 'Complete' },
  { key: 'invoiced', label: 'Invoiced' },
  { key: 'paid', label: 'Paid' },
];

const PIPELINE_PILLS: { key: PipelineFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New requests' },
  { key: 'active', label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'closed', label: 'Closed' },
  { key: 'declined', label: 'Declined' },
];

export default function JobsClient({ initial, totalCount: initialTotal, initialRequests }: Props) {
  const [jobs, setJobs] = useState<JobRow[]>(initial);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [requests] = useState<RequestRow[]>(initialRequests);
  const [mainTab, setMainTab] = useState<MainTab>('pipeline');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('all');

  const newRequestsCount = useMemo(
    () => requests.filter((r) => r.status === 'new').length,
    [requests],
  );

  // Unified pipeline items sorted by createdAt desc
  const pipelineItems = useMemo<PipelineItem[]>(() => {
    const reqItems: PipelineItem[] = requests.map((r) => ({ kind: 'request', ...r }));
    const jobItems: PipelineItem[] = jobs.map((j) => ({ kind: 'job', ...j }));
    const all = [...reqItems, ...jobItems];
    all.sort((a, b) => {
      const aDate = new Date(a.createdAt ?? 0).getTime();
      const bDate = new Date(b.createdAt ?? 0).getTime();
      return bDate - aDate;
    });
    return all;
  }, [requests, jobs]);

  const filteredPipeline = useMemo(
    () => pipelineItems.filter((item) => matchesPipelineFilter(item, pipelineFilter)),
    [pipelineItems, pipelineFilter],
  );

  const filteredJobs = useMemo(
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
        <span className="jobs-count-badge">{totalCount + requests.length}</span>
      </header>

      {/* Main tab row */}
      <div className="jobs-main-tabs">
        <button
          className={`jobs-main-tab${mainTab === 'pipeline' ? ' active' : ''}`}
          onClick={() => setMainTab('pipeline')}
        >
          Pipeline
          <span className="jobs-main-tab__count">{pipelineItems.length}</span>
        </button>
        <button
          className={`jobs-main-tab${mainTab === 'jobs' ? ' active' : ''}`}
          onClick={() => setMainTab('jobs')}
        >
          Jobs
          <span className="jobs-main-tab__count">{totalCount}</span>
        </button>
        <button
          className={`jobs-main-tab${mainTab === 'requests' ? ' active' : ''}`}
          onClick={() => setMainTab('requests')}
        >
          Requests
          {newRequestsCount > 0 && (
            <span className="jobs-main-tab__dot" aria-label={`${newRequestsCount} new`} />
          )}
          <span className="jobs-main-tab__count">{requests.length}</span>
        </button>
      </div>

      {/* ── Pipeline tab ─────────────────────────────────────────────── */}
      {mainTab === 'pipeline' && (
        <>
          <div className="jobs-filter-row">
            {PIPELINE_PILLS.map(({ key, label }) => (
              <button
                key={key}
                className={`jobs-filter-pill${pipelineFilter === key ? ' active' : ''}`}
                onClick={() => setPipelineFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredPipeline.length === 0 ? (
            <div className="jobs-empty-filtered">
              <p>Nothing here{pipelineFilter !== 'all' ? ` for "${PIPELINE_PILLS.find(p => p.key === pipelineFilter)?.label}"` : ''}.</p>
              {pipelineFilter !== 'all' && (
                <button className="clear-filter-link" onClick={() => setPipelineFilter('all')}>
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="pipeline-list">
              {filteredPipeline.map((item) => (
                <PipelineCard
                  key={item.kind === 'request' ? `req-${item._id}` : `job-${item._id}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Jobs tab ─────────────────────────────────────────────────── */}
      {mainTab === 'jobs' && (
        <>
          {jobs.length > 0 && (
            <div className="jobs-filter-row">
              {JOB_STATUS_PILLS.map(({ key, label }) => (
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

          {jobs.length > 0 && filteredJobs.length === 0 && (
            <div className="jobs-empty-filtered">
              <p>No {activeStatus} jobs.</p>
              <button className="clear-filter-link" onClick={() => setActiveStatus('all')}>
                Clear filter
              </button>
            </div>
          )}

          {filteredJobs.length > 0 && (
            <div className="jobs-list">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onDelete={handleDelete}
                  onMarkPaid={handleMarkPaid}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Requests tab ─────────────────────────────────────────────── */}
      {mainTab === 'requests' && (
        <div style={{ padding: '0 0 100px' }}>
          <InlineRequestsList requests={requests} />
        </div>
      )}
    </div>
  );
}
