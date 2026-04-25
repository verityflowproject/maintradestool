'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Download } from 'lucide-react';

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string;
  customerPhone: string;
  onSent: () => void;
}

export default function SendInvoiceSection({
  invoiceId,
  invoiceNumber,
  customerEmail,
  customerPhone,
  onSent,
}: Props) {
  return (
    <div className="send-invoice-section">
      <h2 className="send-invoice-heading">Send Invoice</h2>
      <div className="send-invoice-grid">
        {customerEmail && (
          <EmailCard
            invoiceId={invoiceId}
            defaultEmail={customerEmail}
            onSent={onSent}
          />
        )}
        {customerPhone && (
          <SmsCard invoiceId={invoiceId} defaultPhone={customerPhone} />
        )}
        <DownloadCard invoiceId={invoiceId} invoiceNumber={invoiceNumber} />
      </div>
    </div>
  );
}

// ── Email card ─────────────────────────────────────────────────────────

function EmailCard({
  invoiceId,
  defaultEmail,
  onSent,
}: {
  invoiceId: string;
  defaultEmail: string;
  onSent: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? 'Failed to send');
      }
      setSuccess(true);
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="send-invoice-card glass-card">
      <div className="send-invoice-card__header">
        <Mail size={18} />
        <span className="send-invoice-card__title">Send via Email</span>
      </div>
      <p className="send-invoice-card__subtitle">
        PDF attached — arrives in the customer&apos;s inbox.
      </p>
      <input
        className="input-field"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="customer@email.com"
        disabled={loading || success}
      />
      {error && <p className="invoice-send-error">{error}</p>}
      {success ? (
        <p className="invoice-send-success">Sent!</p>
      ) : (
        <button
          className="btn-accent"
          onClick={handleSend}
          disabled={loading || !email}
        >
          {loading ? 'Sending…' : 'Send via Email'}
        </button>
      )}
    </div>
  );
}

// ── SMS card ───────────────────────────────────────────────────────────

function SmsCard({
  invoiceId,
  defaultPhone,
}: {
  invoiceId: string;
  defaultPhone: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? 'Failed to generate link');
      }
      const data = (await res.json()) as { link: string };
      setLink(data.link);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
    }
  }

  return (
    <div className="send-invoice-card glass-card">
      <div className="send-invoice-card__header">
        <MessageSquare size={18} />
        <span className="send-invoice-card__title">SMS Link</span>
      </div>
      <p className="send-invoice-card__subtitle">
        Generate a public link to share via text message.
      </p>
      <input
        className="input-field"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 555 000 0000"
        disabled={loading || !!link}
      />
      {error && <p className="invoice-send-error">{error}</p>}
      {link ? (
        <div className="copy-link-row">
          <input
            className="input-field copy-link-input"
            readOnly
            value={link}
          />
          <button className="btn-accent copy-link-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <button
          className="btn-accent"
          onClick={handleGenerate}
          disabled={loading || !phone}
        >
          {loading ? 'Generating…' : 'Generate Link'}
        </button>
      )}
      {link && (
        <p className="invoice-send-help">
          Share this link with your customer via text.
        </p>
      )}
    </div>
  );
}

// ── Download card ──────────────────────────────────────────────────────

function DownloadCard({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  return (
    <div className="send-invoice-card glass-card">
      <div className="send-invoice-card__header">
        <Download size={18} />
        <span className="send-invoice-card__title">Download PDF</span>
      </div>
      <p className="send-invoice-card__subtitle">
        Save a professional PDF to your device.
      </p>
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        download={`Invoice-${invoiceNumber}.pdf`}
        className="btn-accent"
        style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
      >
        Download PDF
      </a>
    </div>
  );
}
