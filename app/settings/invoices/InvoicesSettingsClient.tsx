'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import { sanitizeMoney, validateLateFee } from '@/lib/utils/validators';

const INVOICE_METHODS = [
  {
    id: 'email',
    emoji: '📧',
    title: 'PDF via Email',
    sub: 'Professional PDF sent to client\'s inbox',
  },
  {
    id: 'sms',
    emoji: '💬',
    title: 'Text Message Link',
    sub: 'Send a payment link via SMS — fastest',
  },
  {
    id: 'download',
    emoji: '📥',
    title: "I'll Download It",
    sub: "Generate the PDF, I'll send it myself",
  },
];

const PAYMENT_TERMS = [
  { id: 'due_on_receipt', label: 'Due on receipt' },
  { id: 'net_7', label: 'Net 7 days' },
  { id: 'net_14', label: 'Net 14 days' },
  { id: 'net_30', label: 'Net 30 days' },
];

interface Props {
  initialInvoiceMethod: string;
  initialPaymentTerms: string;
  initialDefaultInvoiceNote: string;
  initialLateFeePercent: number;
}

export default function InvoicesSettingsClient({
  initialInvoiceMethod,
  initialPaymentTerms,
  initialDefaultInvoiceNote,
  initialLateFeePercent,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [invoiceMethod, setInvoiceMethod] = useState(initialInvoiceMethod);
  const [paymentTerms, setPaymentTerms] = useState(initialPaymentTerms);
  const [defaultInvoiceNote, setDefaultInvoiceNote] = useState(initialDefaultInvoiceNote);
  const [lateFeePercent, setLateFeePercent] = useState(String(initialLateFeePercent));
  const [lateFeeError, setLateFeeError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const lateErr = validateLateFee(lateFeePercent);
    if (lateErr) { setLateFeeError(lateErr); return; }
    setLateFeeError('');
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceMethod,
          paymentTerms,
          defaultInvoiceNote: defaultInvoiceNote.trim() || null,
          lateFeePercent: Number(lateFeePercent) || 0,
        }),
      });
      if (res.ok) {
        toast.success('Invoice defaults updated.');
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [invoiceMethod, paymentTerms, defaultInvoiceNote, lateFeePercent, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Invoice Defaults</h1>
      </div>

      {/* Default delivery method */}
      <p className="settings-section-heading">Default delivery method</p>
      <div className="invoice-list" style={{ marginBottom: 16 }}>
        {INVOICE_METHODS.map((m) => {
          const selected = invoiceMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`glass-card invoice-card${selected ? ' selected' : ''}`}
              onClick={() => setInvoiceMethod(m.id)}
              aria-pressed={selected}
            >
              <span className="invoice-emoji">{m.emoji}</span>
              <span className="invoice-text">
                <span className="invoice-title">{m.title}</span>
                <span className="invoice-sub">{m.sub}</span>
              </span>
              <span className={`invoice-check${selected ? ' on' : ''}`} aria-hidden>
                <CheckCircle size={20} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        {/* Payment terms */}
        <div className="settings-form-field">
          <label className="settings-form-label">Default payment terms</label>
          <select
            className="input-field"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
          >
            {PAYMENT_TERMS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Invoice message */}
        <div className="settings-form-field">
          <label className="settings-form-label">Invoice message</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Thank you for your business!"
            value={defaultInvoiceNote}
            onChange={(e) => setDefaultInvoiceNote(e.target.value)}
          />
        </div>

        {/* Late fee */}
        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label" htmlFor="invoice-latefee">Late fee (%)</label>
          <div className="settings-input-wrap">
            <input
              id="invoice-latefee"
              aria-invalid={!!lateFeeError || undefined}
              aria-describedby={lateFeeError ? 'invoice-latefee-err' : undefined}
              className={`input-field input-field--suffix${lateFeeError ? ' input-field--error' : ''}`}
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={lateFeePercent}
              onChange={(e) => {
                setLateFeePercent(sanitizeMoney(e.target.value));
                if (lateFeeError) setLateFeeError('');
              }}
              placeholder="0"
              inputMode="decimal"
            />
            <span className="settings-input-suffix">%</span>
          </div>
          {lateFeeError && (
            <p id="invoice-latefee-err" className="field-error" role="alert">{lateFeeError}</p>
          )}
        </div>
      </div>

      <button
        className="btn-accent"
        style={{ width: '100%' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
