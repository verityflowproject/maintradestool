'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail, MapPin, Mic, Pencil, Phone } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { initials, pickColor } from '@/lib/utils/customerAvatar';
import EditCustomerModal from './EditCustomerModal';

// ── Types ──────────────────────────────────────────────────────────────

export interface CustomerData {
  _id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  jobCount?: number;
  totalBilled?: number;
}

export interface JobRow {
  _id: string;
  title?: string;
  status?: string;
  total?: number;
  laborHours?: number;
  createdAt?: string;
  completedDate?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  aiParsed?: boolean;
}

interface Props {
  customer: CustomerData;
  initialJobs: JobRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatAddress(c: CustomerData): string {
  if (c.city && c.state) return `${c.city}, ${c.state}`;
  return c.address ?? '';
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 14) return `${days} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── CustomerHeaderCard ─────────────────────────────────────────────────

function CustomerHeaderCard({
  customer,
  onEdit,
}: {
  customer: CustomerData;
  onEdit: () => void;
}) {
  const color = pickColor(customer.fullName);
  const ini = initials(customer);
  const addr = formatAddress(customer);
  const showBusiness =
    customer.businessName &&
    customer.businessName.toLowerCase() !== customer.fullName.toLowerCase();

  return (
    <div className="glass-card customer-header-card">
      <button className="customer-header-edit btn-ghost" onClick={onEdit} aria-label="Edit customer">
        <Pencil size={16} />
      </button>
      <div className="customer-header-avatar" style={{ background: color }}>
        {ini}
      </div>
      <div className="customer-header-info">
        <span className="customer-header-name">{customer.fullName}</span>
        {showBusiness && (
          <span className="customer-header-business">{customer.businessName}</span>
        )}
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="customer-header-row customer-header-link">
            <Phone size={14} />
            {customer.phone}
          </a>
        )}
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="customer-header-row customer-header-link">
            <Mail size={14} />
            {customer.email}
          </a>
        )}
        {addr && (
          <span className="customer-header-row">
            <MapPin size={14} />
            {addr}
          </span>
        )}
      </div>
    </div>
  );
}

// ── StatsGrid ──────────────────────────────────────────────────────────

function StatsGrid({ customer, jobs }: { customer: CustomerData; jobs: JobRow[] }) {
  const jobCount = customer.jobCount ?? jobs.length;
  const totalBilled = customer.totalBilled ?? 0;
  const mostRecent = jobs[0];
  const avgValue = jobCount > 0 ? totalBilled / jobCount : null;

  return (
    <div className="stats-grid">
      <div className="glass-card stat-tile">
        <span className="stat-label">Total Jobs</span>
        <span className="stat-value">{jobCount}</span>
      </div>
      <div className="glass-card stat-tile">
        <span className="stat-label">Total Billed</span>
        <span className="stat-value stat-value--accent">{formatCurrency(totalBilled)}</span>
      </div>
      <div className="glass-card stat-tile">
        <span className="stat-label">Last Job</span>
        <span className="stat-value stat-value--sm">{formatRelative(mostRecent?.createdAt)}</span>
      </div>
      <div className="glass-card stat-tile">
        <span className="stat-label">Avg Job Value</span>
        <span className="stat-value">{avgValue !== null ? formatCurrency(avgValue) : '—'}</span>
      </div>
    </div>
  );
}

// ── NotesCard ──────────────────────────────────────────────────────────

function NotesCard({
  customerId,
  initialNotes,
  onSaved,
}: {
  customerId: string;
  initialNotes?: string;
  onSaved: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draft }),
      });
      if (res.ok) {
        setNotes(draft);
        onSaved(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card notes-card">
      <div className="notes-header">
        <span className="notes-label">NOTES</span>
        {!editing && (
          <button className="btn-ghost" onClick={() => { setDraft(notes); setEditing(true); }} aria-label="Edit notes">
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            className="notes-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Add notes about this customer…"
          />
          <div className="notes-actions">
            <button className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button className="notes-save btn-accent" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : notes ? (
        <p className="notes-text">{notes}</p>
      ) : (
        <p className="notes-empty">No notes yet.</p>
      )}
    </div>
  );
}

// ── JobHistoryCard ─────────────────────────────────────────────────────

function JobHistoryCard({ job }: { job: JobRow }) {
  const title = job.title || 'Untitled Job';
  const status = job.status ?? 'draft';
  const date = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <Link href={`/jobs/${job._id}`} className="job-history-card glass-card">
      <div className="job-history-card__top">
        <span className="job-history-card__title">{title}</span>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>
      <div className="job-history-card__meta">
        <span className="job-history-card__date">{date}</span>
        {job.total != null && job.total > 0 && (
          <span className="job-history-card__total">{formatCurrency(job.total)}</span>
        )}
        {job.aiParsed && <span className="ai-logged-badge-inline">AI Logged</span>}
      </div>
    </Link>
  );
}

// ── JobHistoryList ─────────────────────────────────────────────────────

function JobHistoryList({ jobs }: { jobs: JobRow[] }) {
  return (
    <section>
      <div className="job-history-heading">
        <h2>Job History</h2>
        <span className="job-history-count">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
      </div>
      {jobs.length === 0 ? (
        <div className="job-history-empty">
          <p>No jobs logged for this customer yet.</p>
          <Link href="/jobs/new/voice" className="accent-link">
            Log a Job →
          </Link>
        </div>
      ) : (
        <div className="job-history-list">
          {jobs.map((j) => (
            <JobHistoryCard key={j._id} job={j} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── QuickLogJobButton ──────────────────────────────────────────────────

function QuickLogJobButton({ customer }: { customer: CustomerData }) {
  const router = useRouter();
  const label = customer.firstName ? `Log a Job for ${customer.firstName}` : 'Log a Job';

  function handleClick() {
    try {
      sessionStorage.setItem(
        'tradesbrain_prefill_customer',
        JSON.stringify({
          _id: customer._id,
          fullName: customer.fullName,
          phone: customer.phone,
          address: customer.address,
        }),
      );
    } catch {
      // ignore
    }
    router.push('/jobs/new/voice');
  }

  return (
    <div className="quick-log-cta">
      <button className="btn-accent quick-log-btn" onClick={handleClick}>
        <Mic size={18} />
        {label}
      </button>
    </div>
  );
}

// ── DeleteCustomerRow ──────────────────────────────────────────────────

function DeleteCustomerRow({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
      if (res.ok) router.push('/customers');
    } finally {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="delete-confirm-inline">
        <span>This will not delete their job history. Continue?</span>
        <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={deleting}>
          Cancel
        </button>
        <button className="delete-confirm-yes" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    );
  }

  return (
    <div className="delete-customer-row">
      <button className="delete-customer-link" onClick={() => setConfirming(true)}>
        Delete customer
      </button>
    </div>
  );
}

// ── CustomerDetailClient ───────────────────────────────────────────────

export default function CustomerDetailClient({ customer: initialCustomer, initialJobs }: Props) {
  const [customer, setCustomer] = useState<CustomerData>(initialCustomer);
  const [editOpen, setEditOpen] = useState(false);

  function handleNotesSaved(notes: string) {
    setCustomer((prev) => ({ ...prev, notes }));
  }

  function handleCustomerSaved(updated: CustomerData) {
    setCustomer(updated);
    setEditOpen(false);
  }

  return (
    <div className="customer-detail-wrap">
      {/* Back */}
      <Link href="/customers" className="customer-detail-back">
        <ChevronLeft size={20} />
        Customers
      </Link>

      {/* Header */}
      <CustomerHeaderCard customer={customer} onEdit={() => setEditOpen(true)} />

      {/* Stats */}
      <StatsGrid customer={customer} jobs={initialJobs} />

      {/* Notes */}
      <NotesCard
        customerId={customer._id}
        initialNotes={customer.notes}
        onSaved={handleNotesSaved}
      />

      {/* Job History */}
      <JobHistoryList jobs={initialJobs} />

      {/* Quick Log */}
      <QuickLogJobButton customer={customer} />

      {/* Delete */}
      <DeleteCustomerRow customerId={customer._id} />

      {/* Edit modal */}
      {editOpen && (
        <EditCustomerModal
          customer={customer}
          onSaved={handleCustomerSaved}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
