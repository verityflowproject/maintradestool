'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

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
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
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
            className="input-field"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
          />
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label">State / Region</label>
          <input
            className="input-field"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Texas, CA, NSW"
          />
        </div>

        <div className="settings-form-field">
          <label className="settings-form-label">Phone</label>
          <input
            className="input-field"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your business phone number"
          />
        </div>

        <div className="settings-form-field" style={{ marginBottom: 0 }}>
          <label className="settings-form-label">Email (for customers)</label>
          <input
            className="input-field"
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="billing@yourbusiness.com"
          />
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
