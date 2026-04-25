import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="settings-page page-padding">
      <div className="settings-page__header">
        <Link href="/settings" className="icon-btn" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="settings-page__title" style={{ fontSize: 22 }}>Terms &amp; Privacy</h1>
      </div>
      <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Terms of service and privacy policy coming soon.
        </p>
      </div>
    </div>
  );
}
