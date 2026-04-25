'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import InvoicePreview from './InvoicePreview';
import SendInvoiceSection from './SendInvoiceSection';

interface Props {
  jobId: string;
  jobTitle: string;
  invoice: Record<string, unknown> | null;
  business: { name: string; region: string };
}

export default function InvoiceClient({
  jobId,
  jobTitle,
  invoice,
  business,
}: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const status = invoice?.status as string | undefined;
  const invoiceId = invoice?._id as string | undefined;
  const invoiceNumber = invoice?.invoiceNumber as string | undefined;

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(json?.error ?? 'Generation failed');
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="invoice-page-wrap">
      <header className="job-form-header">
        <Link
          href={`/jobs/${jobId}`}
          className="job-form-back"
          aria-label="Back to job"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="job-form-title">Invoice</h1>
        {invoiceNumber && (
          <span className="invoice-number-badge">{invoiceNumber}</span>
        )}
      </header>

      {!invoice ? (
        <div className="glass-card invoice-empty-card">
          <p className="invoice-empty-text">No invoice yet for &ldquo;{jobTitle}&rdquo;.</p>
          {genError && <p className="invoice-empty-error">{genError}</p>}
          <button
            className="btn-accent"
            onClick={handleGenerate}
            disabled={generating || isPending}
          >
            {generating ? 'Generating…' : 'Generate Invoice'}
          </button>
        </div>
      ) : (
        <>
          <div className="invoice-status-row">
            <StatusBadge status={status ?? 'draft'} />
          </div>

          <InvoicePreview
            invoice={invoice}
            business={business}
          />

          {invoiceId && (
            <SendInvoiceSection
              invoiceId={invoiceId}
              invoiceNumber={invoiceNumber ?? ''}
              customerEmail={(invoice.customerEmail as string) ?? ''}
              customerPhone={(invoice.customerPhone as string) ?? ''}
              onSent={() => startTransition(() => router.refresh())}
            />
          )}

          {invoiceId &&
            (status === 'sent' || status === 'overdue') && (
              <MarkAsPaidButton
                invoiceId={invoiceId}
                onPaid={() => startTransition(() => router.refresh())}
              />
            )}
        </>
      )}
    </div>
  );
}

// ── Inline small components ────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="status-badge-invoice" data-status={status}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MarkAsPaidButton({
  invoiceId,
  onPaid,
}: {
  invoiceId: string;
  onPaid: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePaid() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paidDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? 'Failed to mark as paid');
      }
      onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mark-paid-wrap">
      {error && <p className="invoice-send-error">{error}</p>}
      <button className="btn-accent" onClick={handlePaid} disabled={loading}>
        {loading ? 'Updating…' : 'Mark as Paid'}
      </button>
    </div>
  );
}
