import { formatCurrency } from '@/lib/utils/formatCurrency';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Props {
  invoice: Record<string, unknown>;
  business: { name: string; region: string };
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(d: unknown): string {
  if (!d) return '—';
  return DATE_FMT.format(new Date(d as string));
}

function getDueClass(dueDate: unknown): string {
  if (!dueDate) return '';
  const due = new Date(dueDate as string);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'invoice-preview__due--danger';
  if (diffDays <= 3) return 'invoice-preview__due--warn';
  return '';
}

export default function InvoicePreview({ invoice, business }: Props) {
  const lineItems = (invoice.lineItems ?? []) as LineItem[];
  const taxRate = Number(invoice.taxRate) || 0;
  const dueClass = getDueClass(invoice.dueDate);

  return (
    <div className="invoice-preview glass-card">
      {/* ── Header ── */}
      <div className="invoice-preview__header">
        <div className="invoice-preview__header-left">
          <span className="invoice-preview__business-name">{business.name}</span>
          <span className="invoice-preview__business-region">{business.region}</span>
        </div>
        <div className="invoice-preview__header-right">
          <span className="invoice-preview__label">INVOICE</span>
          <span className="invoice-preview__number">
            {invoice.invoiceNumber as string}
          </span>
          <span className="invoice-preview__meta">
            Created: {formatDate(invoice.createdAt)}
          </span>
          <span className={`invoice-preview__meta ${dueClass}`}>
            Due: {formatDate(invoice.dueDate)}
          </span>
        </div>
      </div>

      {/* ── Bill To ── */}
      <div className="invoice-preview__billto">
        <span className="invoice-preview__section-label">Bill To</span>
        <span className="invoice-preview__customer-name">
          {invoice.customerName as string}
        </span>
        {Boolean(invoice.customerAddress) && (
          <span className="invoice-preview__customer-detail">
            {invoice.customerAddress as string}
          </span>
        )}
        {Boolean(invoice.customerPhone) && (
          <span className="invoice-preview__customer-detail">
            {invoice.customerPhone as string}
          </span>
        )}
        {Boolean(invoice.customerEmail) && (
          <span className="invoice-preview__customer-detail">
            {invoice.customerEmail as string}
          </span>
        )}
      </div>

      {/* ── Line Items ── */}
      <div className="invoice-preview__items">
        <div className="invoice-items-header">
          <span className="invoice-items-col invoice-items-col--desc">Description</span>
          <span className="invoice-items-col invoice-items-col--num">Qty</span>
          <span className="invoice-items-col invoice-items-col--num">Unit Price</span>
          <span className="invoice-items-col invoice-items-col--num">Total</span>
        </div>
        {lineItems.map((item, i) => (
          <div key={i} className="invoice-items-row">
            <span className="invoice-items-col invoice-items-col--desc">
              {item.description}
            </span>
            <span className="invoice-items-col invoice-items-col--num invoice-items-col--mono">
              {item.quantity}
            </span>
            <span className="invoice-items-col invoice-items-col--num invoice-items-col--mono">
              {formatCurrency(item.unitPrice)}
            </span>
            <span className="invoice-items-col invoice-items-col--num invoice-items-col--mono invoice-items-col--primary">
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Totals ── */}
      <div className="invoice-preview__totals">
        <div className="invoice-totals-block">
          <div className="invoice-totals-row">
            <span className="invoice-totals-label">Subtotal</span>
            <span className="invoice-totals-value">
              {formatCurrency(Number(invoice.subtotal))}
            </span>
          </div>
          {taxRate > 0 && (
            <div className="invoice-totals-row">
              <span className="invoice-totals-label">Tax ({taxRate}%)</span>
              <span className="invoice-totals-value">
                {formatCurrency(Number(invoice.taxTotal))}
              </span>
            </div>
          )}
          <div className="invoice-totals-divider" />
          <div className="invoice-totals-row">
            <span className="invoice-totals-total-label">Total</span>
            <span className="invoice-totals-total-value">
              {formatCurrency(Number(invoice.total))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      {Boolean(invoice.notes) && (
        <div className="invoice-preview__notes">
          <span className="invoice-preview__section-label">Notes</span>
          <p className="invoice-preview__notes-text">
            {invoice.notes as string}
          </p>
        </div>
      )}
    </div>
  );
}
