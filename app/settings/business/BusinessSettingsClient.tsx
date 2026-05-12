'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';
import {
  sanitizePhone,
  formatPhoneAsYouType,
  validatePhone,
  validateEmail,
  validateBusinessName,
  collectErrors,
} from '@/lib/utils/validators';

interface Props {
  initialBusinessName: string;
  initialRegion: string;
  initialPhone: string;
  initialBusinessEmail: string;
}

export default function BusinessSettingsClient({
  initialBusinessName,
  initialRegion,
  initialPhone,
  initialBusinessEmail,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [region, setRegion] = useState(initialRegion);
  const [phone, setPhone] = useState(initialPhone);
  const [businessEmail, setBusinessEmail] = useState(initialBusinessEmail);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const errs = collectErrors({
      businessName: validateBusinessName(businessName),
      phone: validatePhone(phone),
      businessEmail: validateEmail(businessEmail),
    });
    if (errs) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          region: region.trim(),
          phone: phone.trim() || null,
          businessEmail: businessEmail.trim() || null,
        }),
      });
      if (res.ok) {
        toast.success('Business info updated.');
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to save.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [businessName, region, phone, businessEmail, toast]);

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Business Info</h1>
      </div>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <div className="settings-form-field">
          <label className="settings-form-label">Business name</label>
          <input
            className={`input-field${fieldErrors.businessName ? ' input-field--error' : ''}`}
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              if (fieldErrors.businessName) setFieldErrors((p) => ({ ...p, businessName: '' }));
            }}
            placeholder="Your business name"
            maxLength={100}
          />
          {fieldErrors.businessName && <p className="field-error">{fieldErrors.businessName}</p>}
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label">State / Region</label>
          <input
            className="input-field"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Texas, CA, NSW"
            maxLength={100}
          />
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label" htmlFor="biz-phone">Phone</label>
          <input
            id="biz-phone"
            aria-invalid={!!fieldErrors.phone || undefined}
            aria-describedby={fieldErrors.phone ? 'biz-phone-err' : undefined}
            className={`input-field${fieldErrors.phone ? ' input-field--error' : ''}`}
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(formatPhoneAsYouType(sanitizePhone(e.target.value)));
              if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
            }}
            placeholder="(555) 123-4567"
            maxLength={25}
            inputMode="tel"
          />
          {fieldErrors.phone && (
            <p id="biz-phone-err" className="field-error" role="alert">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label" htmlFor="biz-email">Email (for customers)</label>
          <input
            id="biz-email"
            aria-invalid={!!fieldErrors.businessEmail || undefined}
            aria-describedby={fieldErrors.businessEmail ? 'biz-email-err' : undefined}
            className={`input-field${fieldErrors.businessEmail ? ' input-field--error' : ''}`}
            type="email"
            value={businessEmail}
            onChange={(e) => {
              setBusinessEmail(e.target.value);
              if (fieldErrors.businessEmail) setFieldErrors((p) => ({ ...p, businessEmail: '' }));
            }}
            placeholder="billing@yourbusiness.com"
            maxLength={254}
            inputMode="email"
          />
          {fieldErrors.businessEmail && (
            <p id="biz-email-err" className="field-error" role="alert">{fieldErrors.businessEmail}</p>
          )}
        </div>
      </div>

      <div className="settings-info-card">
        💡 This info appears on every invoice and your booking page.
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
