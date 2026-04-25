'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

interface Props {
  initialHourlyRate: number;
  initialPartsMarkup: number;
  initialDefaultTaxRate: number;
}

export default function RatesSettingsClient({
  initialHourlyRate,
  initialPartsMarkup,
  initialDefaultTaxRate,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [hourlyRate, setHourlyRate] = useState(String(initialHourlyRate));
  const [partsMarkup, setPartsMarkup] = useState(String(initialPartsMarkup));
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(initialDefaultTaxRate));
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourlyRate: Number(hourlyRate) || 0,
          partsMarkup: Number(partsMarkup) || 0,
          defaultTaxRate: Number(defaultTaxRate) || 0,
        }),
      });
      if (res.ok) {
        toast.success('Rates updated.');
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [hourlyRate, partsMarkup, defaultTaxRate, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Rates &amp; Pricing</h1>
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <div className="settings-form-field">
          <label className="settings-form-label">Hourly labor rate</label>
          <div className="settings-input-wrap">
            <span className="settings-input-prefix">$</span>
            <input
              className="input-field input-field--prefix"
              type="number"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="85"
            />
          </div>
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label">Parts markup</label>
          <div className="settings-input-wrap">
            <input
              className="input-field input-field--suffix"
              type="number"
              min="0"
              value={partsMarkup}
              onChange={(e) => setPartsMarkup(e.target.value)}
              placeholder="20"
            />
            <span className="settings-input-suffix">%</span>
          </div>
        </div>

        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Default tax rate</label>
          <div className="settings-input-wrap">
            <input
              className="input-field input-field--suffix"
              type="number"
              min="0"
              value={defaultTaxRate}
              onChange={(e) => setDefaultTaxRate(e.target.value)}
              placeholder="0"
            />
            <span className="settings-input-suffix">%</span>
          </div>
        </div>
      </div>

      <div className="settings-info-card">
        These are your defaults. You can override them on any individual job.
      </div>

      <button
        className="btn-accent"
        style={{ width: '100%', marginTop: 20 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
