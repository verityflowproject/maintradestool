'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface PayrollRow {
  memberId: string;
  memberName: string;
  role: string;
  color: string;
  avatarInitials: string;
  hoursLogged: number;
  ratePerHour: number;
  gross: number;
  jobsCount: number;
  hasRate: boolean;
}

interface Props {
  defaultFrom: string;
  defaultTo: string;
}

const QUICK_PRESETS = [
  { label: 'This month', getRange: () => {
    const n = new Date();
    return {
      from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10),
      to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  }},
  { label: 'Last month', getRange: () => {
    const n = new Date();
    return {
      from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0, 10),
      to: new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0, 10),
    };
  }},
  { label: 'This year', getRange: () => {
    const n = new Date();
    return {
      from: new Date(n.getFullYear(), 0, 1).toISOString().slice(0, 10),
      to: new Date(n.getFullYear(), 11, 31).toISOString().slice(0, 10),
    };
  }},
];

function exportCSV(rows: PayrollRow[], from: string, to: string) {
  const header = 'Member,Role,Hours,Rate ($/hr),Gross ($),Jobs\n';
  const body = rows.map((r) => [
    `"${r.memberName}"`,
    r.role,
    r.hoursLogged.toFixed(2),
    r.ratePerHour.toFixed(2),
    r.gross.toFixed(2),
    r.jobsCount,
  ].join(',')).join('\n');

  const csv = header + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollClient({ defaultFrom, defaultTo }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll?from=${f}&to=${t}`);
      if (!res.ok) {
        setError('Failed to load payroll data.');
        return;
      }
      const data = await res.json() as { rows: PayrollRow[] };
      setRows(data.rows);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayroll(from, to);
  }, [from, to, fetchPayroll]);

  const totalHours = rows.reduce((s, r) => s + r.hoursLogged, 0);
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);

  return (
    <div className="settings-page page-padding" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div className="settings-page__header">
        <button
          className="icon-btn"
          onClick={() => router.back()}
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22 }}>
          Payroll Report
        </h1>
        {rows.length > 0 && (
          <button
            className="icon-btn"
            onClick={() => exportCSV(rows, from, to)}
            aria-label="Export CSV"
            title="Export CSV"
          >
            <Download size={20} />
          </button>
        )}
      </div>

      {/* Quick presets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {QUICK_PRESETS.map((p) => (
          <button
            key={p.label}
            className="jobs-filter-pill"
            onClick={() => {
              const { from: f, to: t } = p.getRange();
              setFrom(f);
              setTo(t);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date range pickers */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>FROM</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--quartz-border)', background: 'var(--quartz-bg)', fontSize: 13 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>TO</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--quartz-border)', background: 'var(--quartz-bg)', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
          <button
            className="icon-btn"
            onClick={() => void fetchPayroll(from, to)}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No time entries in this period.</p>
        </div>
      ) : (
        <>
          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {rows.map((row) => (
              <div key={row.memberId} className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: row.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {row.avatarInitials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: 14, textTransform: 'capitalize' }}>
                    {row.memberName}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>
                    {row.role} · {row.jobsCount} job{row.jobsCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 14, color: 'var(--accent-text)' }}>
                    {formatCurrency(row.gross)}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {row.hoursLogged.toFixed(1)}h{row.hasRate ? ` × $${row.ratePerHour}/hr` : ' (rate not set)'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, margin: '0 0 2px', fontSize: 16, color: 'var(--accent-text)' }}>
                {formatCurrency(totalGross)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {totalHours.toFixed(1)} hours
              </p>
            </div>
          </div>

          {/* Export button (secondary placement) */}
          <button
            className="btn-ghost"
            style={{ width: '100%', marginTop: 12, padding: '11px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => exportCSV(rows, from, to)}
          >
            <Download size={16} />
            Export CSV
          </button>
        </>
      )}
    </div>
  );
}
