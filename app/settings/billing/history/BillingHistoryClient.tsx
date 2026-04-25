'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import type { BillingInvoiceItem } from '@/app/api/billing/invoices/route';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(unixTs: number): string {
  return DATE_FMT.format(new Date(unixTs * 1000));
}

function formatAmount(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

function StatusPill({ status }: { status: string | null }) {
  const s = status ?? 'open';
  const cls =
    s === 'paid' ? 'billing-status-pill--paid' :
    s === 'void' ? 'billing-status-pill--void' :
    s === 'open' ? 'billing-status-pill--open' :
    'billing-status-pill--open';
  return <span className={`billing-status-pill ${cls}`}>{s}</span>;
}

export default function BillingHistoryClient() {
  const [invoices, setInvoices] = useState<BillingInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/invoices')
      .then((r) => r.json())
      .then((data: { invoices?: BillingInvoiceItem[]; error?: string }) => {
        if (data.invoices) setInvoices(data.invoices);
        else setError(data.error ?? 'Failed to load invoices.');
      })
      .catch(() => setError('Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <Link href="/settings/billing" className="icon-btn" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Billing History</h1>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading invoices…</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No invoices yet.</p>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="billing-invoice-list">
          {invoices.map((inv) => (
            <div key={inv.id} className="glass-card billing-invoice-row">
              <div className="billing-invoice-row__left">
                <span className="billing-invoice-row__number">
                  {inv.number ?? inv.id}
                </span>
                <span className="billing-invoice-row__date">
                  {formatDate(inv.created)}
                  {inv.periodStart && inv.periodEnd
                    ? ` · ${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`
                    : ''}
                </span>
                <StatusPill status={inv.status} />
              </div>
              <div className="billing-invoice-row__right">
                <span className="billing-invoice-row__amount">
                  {formatAmount(inv.total)}
                </span>
                {inv.invoicePdf && (
                  <a
                    className="billing-invoice-download"
                    href={inv.invoicePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download invoice"
                  >
                    <Download size={13} />
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
