'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Receipt, Mail, MessageSquare, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useToast } from '@/components/Toast/ToastProvider';
import type { InvoiceRow, InvoiceCounts, InvoiceSummary, InvoiceStatusFilter } from '@/lib/invoices/listInvoices';

// ── Types ──────────────────────────────────────────────────────────────

interface Props {
  initialInvoices: InvoiceRow[];
  initialCounts: InvoiceCounts;
  summary: InvoiceSummary;
  initialFilter: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

const VALID_FILTERS: InvoiceStatusFilter[] = ['all', 'draft', 'sent', 'paid', 'overdue'];

function toFilter(s: string): InvoiceStatusFilter {
  return (VALID_FILTERS.includes(s as InvoiceStatusFilter) ? s : 'all') as InvoiceStatusFilter;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATE_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return DATE_FMT.format(new Date(iso));
}

function fmtShort(iso: string | null): string {
  if (!iso) return '—';
  return DATE_SHORT.format(new Date(iso));
}

/** Compute the visual status of an invoice (sent + past due → overdue) */
function visualStatus(inv: InvoiceRow): string {
  if (inv.status === 'sent' && new Date(inv.dueDate) < new Date()) return 'overdue';
  return inv.status;
}

// ── Due-date text ──────────────────────────────────────────────────────

function DueDateText({ inv }: { inv: InvoiceRow }) {
  const vstatus = visualStatus(inv);

  if (vstatus === 'paid') {
    return (
      <span className="invoice-card__due" style={{ color: 'var(--success)' }}>
        Paid {fmtShort(inv.paidDate)}
      </span>
    );
  }

  if (vstatus === 'overdue') {
    const days = Math.floor(
      (new Date().getTime() - new Date(inv.dueDate).getTime()) / 86_400_000,
    );
    return (
      <span className="invoice-card__due" style={{ color: 'var(--danger)' }}>
        Overdue by {days} day{days !== 1 ? 's' : ''}
      </span>
    );
  }

  // Check due today
  const today = new Date().toISOString().slice(0, 10);
  const dueDay = inv.dueDate.slice(0, 10);
  if (dueDay === today) {
    return (
      <span className="invoice-card__due" style={{ color: 'var(--warning)' }}>
        Due today
      </span>
    );
  }

  return (
    <span className="invoice-card__due" style={{ color: 'var(--text-muted)' }}>
      Due {fmtDate(inv.dueDate)}
    </span>
  );
}

// ── Delivery icon ──────────────────────────────────────────────────────

function DeliveryIcon({ method }: { method: string }) {
  if (method === 'email') return <Mail size={14} />;
  if (method === 'sms') return <MessageSquare size={14} />;
  return <Download size={14} />;
}

// ── Copy-link modal ────────────────────────────────────────────────────

function CopyReminderModal({
  link,
  onClose,
}: {
  link: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  return (
    <div className="copy-reminder-overlay" onClick={onClose}>
      <div
        className="copy-reminder-modal glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="copy-reminder-modal__title">Share Reminder Link</p>
        <p className="copy-reminder-modal__sub">
          No email on file — share this link with your customer via text.
        </p>
        <div className="copy-link-row">
          <input className="input-field copy-link-input" readOnly value={link} />
          <button className="btn-accent copy-link-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button className="copy-reminder-modal__close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Invoice card (with swipe) ──────────────────────────────────────────

function InvoiceCard({
  inv,
  onMarkPaid,
}: {
  inv: InvoiceRow;
  onMarkPaid: (id: string, paidDate: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const vstatus = visualStatus(inv);

  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reminderLink, setReminderLink] = useState<string | null>(null);
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine which actions to show
  const showSend = vstatus === 'draft';
  const showMarkPaid = vstatus === 'sent' || vstatus === 'overdue';
  const showRemind = vstatus === 'sent' || vstatus === 'overdue';
  const showDownload = vstatus === 'paid';

  const actionCount =
    (showSend ? 1 : 0) +
    (showMarkPaid ? 1 : 0) +
    (showRemind ? 1 : 0) +
    (showDownload ? 1 : 0);
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
    } else {
      setOffset(-maxReveal);
    }
  }

  function handleCardClick() {
    if (isDraggingRef.current || offset !== 0) {
      setOffset(0);
      return;
    }
    router.push(`/jobs/${inv.jobId}/invoice`);
  }

  async function handleMarkPaid() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${inv._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { invoice?: { paidDate?: string } };
      const paidDate = data.invoice?.paidDate ?? new Date().toISOString();
      onMarkPaid(inv._id, paidDate);
      setOffset(0);
      toast.success(`Invoice ${inv.invoiceNumber} marked as paid.`);
    } catch {
      toast.error('Failed to mark invoice as paid.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemind() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${inv._id}/remind`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as {
        success: boolean;
        method: 'email' | 'link';
        publicLink?: string;
      };
      setOffset(0);
      if (data.method === 'email') {
        toast.success(`Reminder sent to ${inv.customerName}.`);
      } else {
        toast.info('No email on file — copy the link below.');
        setReminderLink(data.publicLink ?? '');
      }
    } catch {
      toast.error('Failed to send reminder.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="invoice-card-swipe" ref={cardRef}>
        {/* Action buttons behind card */}
        <div className="invoice-card-actions">
          {showSend && (
            <button
              className="invoice-card-action invoice-card-action--send"
              disabled={busy}
              onClick={() => router.push(`/jobs/${inv.jobId}/invoice`)}
            >
              Send
            </button>
          )}
          {showMarkPaid && (
            <button
              className="invoice-card-action invoice-card-action--paid"
              disabled={busy}
              onClick={handleMarkPaid}
            >
              {busy ? '…' : 'Mark Paid'}
            </button>
          )}
          {showRemind && (
            <button
              className="invoice-card-action invoice-card-action--remind"
              disabled={busy}
              onClick={handleRemind}
            >
              {busy ? '…' : 'Remind'}
            </button>
          )}
          {showDownload && (
            <a
              className="invoice-card-action invoice-card-action--download"
              href={`/api/invoices/${inv._id}/pdf`}
              download={`Invoice-${inv.invoiceNumber}.pdf`}
            >
              <Download size={16} />
              Download
            </a>
          )}
        </div>

        {/* Foreground card */}
        <div
          className="glass-card invoice-card"
          data-status={vstatus}
          style={{ transform: `translateX(${offset}px)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={handleCardClick}
        >
          {/* Top row */}
          <div className="invoice-card__top">
            <span className="invoice-card__num">{inv.invoiceNumber}</span>
            <span
              className="status-badge-invoice"
              data-status={vstatus}
            >
              {vstatus}
            </span>
          </div>

          {/* Mid row */}
          <div className="invoice-card__mid">
            <span className="invoice-card__customer">{inv.customerName}</span>
            <span className="invoice-card__total">{formatCurrency(inv.total)}</span>
          </div>

          {/* Bottom row */}
          <div className="invoice-card__bottom">
            <DueDateText inv={inv} />
            <span className="invoice-card__delivery">
              <DeliveryIcon method={inv.deliveryMethod} />
            </span>
          </div>
        </div>
      </div>

      {reminderLink !== null && (
        <CopyReminderModal
          link={reminderLink}
          onClose={() => setReminderLink(null)}
        />
      )}
    </>
  );
}

// ── Filter pills ───────────────────────────────────────────────────────

const PILLS: { key: InvoiceStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

// ── InvoicesClient ─────────────────────────────────────────────────────

export default function InvoicesClient({
  initialInvoices,
  initialCounts,
  summary,
  initialFilter,
}: Props) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [counts, setCounts] = useState<InvoiceCounts>(initialCounts);
  const [activeFilter, setActiveFilter] = useState<InvoiceStatusFilter>(
    toFilter(initialFilter),
  );
  const [loading, setLoading] = useState(false);

  const handleFilterChange = useCallback(async (f: InvoiceStatusFilter) => {
    setActiveFilter(f);
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?status=${f}`);
      if (res.ok) {
        const data = (await res.json()) as {
          invoices: InvoiceRow[];
          counts: InvoiceCounts;
        };
        setInvoices(data.invoices);
        setCounts(data.counts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkPaid = useCallback((id: string, paidDate: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv._id === id ? { ...inv, status: 'paid', paidDate } : inv,
      ),
    );
    setCounts((prev) => ({
      ...prev,
      sent: Math.max(0, prev.sent - 1),
      paid: prev.paid + 1,
      overdue: Math.max(0, prev.overdue - 1),
    }));
  }, []);

  // Keep the displayed list stable: if filter is 'all', show all; otherwise
  // filter client-side to avoid a flash (server data is already filtered on
  // API calls, but on initial load we receive all invoices).
  const displayed = useMemo(() => {
    if (activeFilter === 'all') return invoices;
    if (activeFilter === 'overdue') {
      return invoices.filter(
        (inv) => inv.status === 'sent' && new Date(inv.dueDate) < new Date(),
      );
    }
    return invoices.filter((inv) => inv.status === activeFilter);
  }, [invoices, activeFilter]);

  return (
    <div className="invoices-page">
      {/* Header */}
      <header className="invoices-header">
        <h1 className="invoices-title">Invoices</h1>
        {summary.totalPaidAllTime > 0 && (
          <span className="invoices-revenue-badge">
            {formatCurrency(summary.totalPaidAllTime)}
          </span>
        )}
      </header>

      {/* Summary strip */}
      <div className="invoice-summary-strip">
        <div className="summary-tile glass-card">
          <span
            className="summary-tile__value"
            style={{ color: summary.outstanding > 0 ? 'var(--warning)' : 'var(--text-muted)' }}
          >
            {summary.outstanding > 0 ? formatCurrency(summary.outstanding) : '$0'}
          </span>
          <span className="summary-tile__label">Outstanding</span>
        </div>
        <div className="summary-tile glass-card">
          <span
            className="summary-tile__value"
            style={{ color: counts.overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {counts.overdue}
          </span>
          <span className="summary-tile__label">Overdue</span>
        </div>
        <div className="summary-tile glass-card">
          <span
            className="summary-tile__value"
            style={{ color: 'var(--success)' }}
          >
            {formatCurrency(summary.collectedThisMonth)}
          </span>
          <span className="summary-tile__label">This Month</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="jobs-filter-row">
        {PILLS.map(({ key, label }) => {
          const count = counts[key];
          const isOverduePill = key === 'overdue';
          return (
            <button
              key={key}
              className={`jobs-filter-pill${activeFilter === key ? ' active' : ''}`}
              onClick={() => void handleFilterChange(key)}
            >
              {label}
              <span
                className={`jobs-filter-pill__badge${isOverduePill && count > 0 ? ' jobs-filter-pill__badge--overdue' : ''}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && initialInvoices.length === 0 && (
        <div className="invoices-empty">
          <Receipt size={48} className="invoices-empty__icon" />
          <p className="invoices-empty__heading">No invoices yet.</p>
          <p className="invoices-empty__sub">
            Generate your first invoice from a completed job.
          </p>
          <Link href="/jobs" className="invoices-empty__link">
            Go to Jobs →
          </Link>
        </div>
      )}

      {/* Filtered empty */}
      {!loading && initialInvoices.length > 0 && displayed.length === 0 && (
        <div className="invoices-empty">
          <p className="invoices-empty__sub">No {activeFilter} invoices.</p>
          <button
            className="invoices-empty__link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => void handleFilterChange('all')}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Invoice list */}
      {displayed.length > 0 && (
        <div className="invoice-list">
          {displayed.map((inv) => (
            <InvoiceCard key={inv._id} inv={inv} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}
    </div>
  );
}
