'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import {
  sanitizeMoney,
  validateHourlyRate,
  validateMarkup,
  validateTaxRate,
  collectErrors,
} from '@/lib/utils/validators';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const errs = collectErrors({
      hourlyRate: validateHourlyRate(hourlyRate),
      partsMarkup: validateMarkup(partsMarkup),
      defaultTaxRate: validateTaxRate(defaultTaxRate),
    });
    if (errs) { setFieldErrors(errs); return; }
    setFieldErrors({});
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
              id="rate-hourly"
              aria-invalid={!!fieldErrors.hourlyRate || undefined}
              aria-describedby={fieldErrors.hourlyRate ? 'rate-hourly-err' : undefined}
              className={`input-field input-field--prefix${fieldErrors.hourlyRate ? ' input-field--error' : ''}`}
              type="number"
              min="0"
              max="2000"
              step="0.01"
              value={hourlyRate}
              onChange={(e) => {
                setHourlyRate(sanitizeMoney(e.target.value));
                if (fieldErrors.hourlyRate) setFieldErrors((p) => ({ ...p, hourlyRate: '' }));
              }}
              placeholder="85"
              inputMode="decimal"
            />
          </div>
          {fieldErrors.hourlyRate && (
            <p id="rate-hourly-err" className="field-error" role="alert">{fieldErrors.hourlyRate}</p>
          )}
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label">Parts markup</label>
          <div className="settings-input-wrap">
            <input
              id="rate-markup"
              aria-invalid={!!fieldErrors.partsMarkup || undefined}
              aria-describedby={fieldErrors.partsMarkup ? 'rate-markup-err' : undefined}
              className={`input-field input-field--suffix${fieldErrors.partsMarkup ? ' input-field--error' : ''}`}
              type="number"
              min="0"
              max="500"
              step="0.1"
              value={partsMarkup}
              onChange={(e) => {
                setPartsMarkup(sanitizeMoney(e.target.value));
                if (fieldErrors.partsMarkup) setFieldErrors((p) => ({ ...p, partsMarkup: '' }));
              }}
              placeholder="20"
              inputMode="decimal"
            />
            <span className="settings-input-suffix">%</span>
          </div>
          {fieldErrors.partsMarkup && (
            <p id="rate-markup-err" className="field-error" role="alert">{fieldErrors.partsMarkup}</p>
          )}
        </div>

        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Default tax rate</label>
          <div className="settings-input-wrap">
            <input
              id="rate-tax"
              aria-invalid={!!fieldErrors.defaultTaxRate || undefined}
              aria-describedby={fieldErrors.defaultTaxRate ? 'rate-tax-err' : undefined}
              className={`input-field input-field--suffix${fieldErrors.defaultTaxRate ? ' input-field--error' : ''}`}
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={defaultTaxRate}
              onChange={(e) => {
                setDefaultTaxRate(sanitizeMoney(e.target.value));
                if (fieldErrors.defaultTaxRate) setFieldErrors((p) => ({ ...p, defaultTaxRate: '' }));
              }}
              placeholder="0"
              inputMode="decimal"
            />
            <span className="settings-input-suffix">%</span>
          </div>
          {fieldErrors.defaultTaxRate && (
            <p id="rate-tax-err" className="field-error" role="alert">{fieldErrors.defaultTaxRate}</p>
          )}
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
