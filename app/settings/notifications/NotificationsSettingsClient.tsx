'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/components/Toast/ToastProvider';

type NotifKey = 'newBookingRequest' | 'invoicePaid' | 'invoiceOverdue' | 'weeklyReport' | 'productUpdates';

interface NotifPrefs {
  newBookingRequest: boolean;
  invoicePaid: boolean;
  invoiceOverdue: boolean;
  weeklyReport: boolean;
  productUpdates: boolean;
}

interface Props {
  initialPrefs: NotifPrefs;
}

const ROWS: { key: NotifKey; label: string; desc: string }[] = [
  {
    key: 'newBookingRequest',
    label: 'New job requests',
    desc: 'Email when someone submits a booking request',
  },
  {
    key: 'invoicePaid',
    label: 'Invoice paid',
    desc: 'Email when a customer marks an invoice paid',
  },
  {
    key: 'invoiceOverdue',
    label: 'Invoice overdue',
    desc: 'Email 1 day after due date passes',
  },
  {
    key: 'weeklyReport',
    label: 'Weekly summary',
    desc: 'Every Sunday, a snapshot of your week',
  },
  {
    key: 'productUpdates',
    label: 'Product updates',
    desc: 'Occasional updates from the TradesBrain team',
  },
];

export default function NotificationsSettingsClient({ initialPrefs }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs);
  const [saving, setSaving] = useState<NotifKey | null>(null);

  const handleToggle = useCallback(
    async (key: NotifKey) => {
      const newVal = !prefs[key];
      const prevPrefs = { ...prefs };
      setPrefs((p) => ({ ...p, [key]: newVal }));
      setSaving(key);

      try {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifications: { [key]: newVal } }),
        });
        if (res.ok) {
          toast.success('Preference updated.');
        } else {
          setPrefs(prevPrefs);
          toast.error('Failed to update preference.');
        }
      } catch {
        setPrefs(prevPrefs);
        toast.error('Something went wrong.');
      } finally {
        setSaving(null);
      }
    },
    [prefs, toast],
  );

  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <button className="icon-btn" onClick={() => router.push('/settings')} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Notifications</h1>
      </div>

      <div className="glass-card" style={{ padding: '4px 20px' }}>
        {ROWS.map((row) => (
          <div key={row.key} className="settings-toggle-row">
            <div className="settings-toggle-row__text">
              <p className="settings-toggle-row__label">{row.label}</p>
              <p className="settings-toggle-row__desc">{row.desc}</p>
            </div>
            <button
              className={`switch${prefs[row.key] ? ' is-on' : ''}`}
              onClick={() => handleToggle(row.key)}
              disabled={saving === row.key}
              role="switch"
              aria-checked={prefs[row.key]}
              aria-label={row.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
