'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lightbulb, Bug, MessageSquare, LifeBuoy, Mail } from 'lucide-react';

type ContactType = 'feature_request' | 'bug_report' | 'feedback' | 'support' | 'partnership' | 'other';
type ContactStatus = 'new' | 'reviewing' | 'planned' | 'shipped' | 'closed' | 'wont_fix';

interface Submission {
  _id: string;
  type: ContactType;
  status: ContactStatus;
  title?: string;
  description: string;
  publicReply?: string;
  createdAt: string;
}

const TYPE_ICON: Record<ContactType, React.ReactNode> = {
  feature_request: <Lightbulb size={16} />,
  bug_report: <Bug size={16} />,
  feedback: <MessageSquare size={16} />,
  support: <LifeBuoy size={16} />,
  partnership: <Mail size={16} />,
  other: <Mail size={16} />,
};

const TYPE_LABEL: Record<ContactType, string> = {
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  feedback: 'Feedback',
  support: 'Support',
  partnership: 'Partnership',
  other: 'Other',
};

const STATUS_COLOR: Record<ContactStatus, string> = {
  new: 'var(--accent-text)',
  reviewing: 'var(--warning)',
  planned: 'var(--warning)',
  shipped: '#4ade80',
  closed: 'var(--text-muted)',
  wont_fix: 'var(--text-muted)',
};

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  planned: 'Planned',
  shipped: 'Shipped',
  closed: 'Closed',
  wont_fix: "Won't fix",
};

function StatusPill({ status }: { status: ContactStatus }) {
  return (
    <span style={{
      fontSize: 11,
      color: STATUS_COLOR[status],
      background: `${STATUS_COLOR[status]}22`,
      border: `1px solid ${STATUS_COLOR[status]}44`,
      borderRadius: 20,
      padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function HistoryClient() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contact/my-submissions')
      .then((r) => r.json())
      .then((d) => setSubmissions(d.submissions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="app-shell"
      style={{ minHeight: '100dvh', background: 'var(--bg-void)', paddingBottom: 40 }}
    >
      <div style={{ padding: 'calc(20px + env(safe-area-inset-top)) 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button type="button" className="icon-btn" onClick={() => router.push('/contact')} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Your Submissions
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
          Everything you&apos;ve sent us.
        </p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>Loading…</p>
        )}
        {!loading && submissions.length === 0 && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>No submissions yet.</p>
            <a href="/contact" style={{ fontSize: 13, color: 'var(--accent-text)', marginTop: 8, display: 'inline-block' }}>
              Get in touch →
            </a>
          </div>
        )}
        {submissions.map((s) => (
          <div key={s._id} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                {TYPE_ICON[s.type]}
                <span>{TYPE_LABEL[s.type]}</span>
              </div>
              <StatusPill status={s.status} />
            </div>
            {s.title && (
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {s.title}
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {s.description}
            </p>
            {s.publicReply && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 8, borderLeft: '2px solid var(--accent)' }}>
                <p style={{ fontSize: 11, color: 'var(--accent-text)', margin: '0 0 4px', fontWeight: 600 }}>Reply from VerityFlow</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{s.publicReply}</p>
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
