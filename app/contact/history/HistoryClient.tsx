'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ContactType = 'feature_request' | 'bug_report' | 'feedback' | 'support' | 'partnership' | 'other';
type ContactStatus = 'new' | 'reviewing' | 'planned' | 'shipped' | 'closed' | 'wont_fix';

interface Submission {
  _id: string;
  type: ContactType;
  title?: string;
  description: string;
  status: ContactStatus;
  publicReply?: string;
  createdAt: string;
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'feature_request', label: '💡 Features' },
  { id: 'bug_report', label: '🐛 Bugs' },
  { id: 'feedback', label: '⭐ Feedback' },
  { id: 'support', label: '🙋 Support' },
  { id: 'other', label: '📬 Other' },
];

const TYPE_ICON: Record<ContactType, string> = {
  feature_request: '💡',
  bug_report: '🐛',
  feedback: '⭐',
  support: '🙋',
  partnership: '🤝',
  other: '📬',
};

const TYPE_LABEL: Record<ContactType, string> = {
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  feedback: 'Feedback',
  support: 'Support',
  partnership: 'Partnership',
  other: 'Other',
};

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  planned: 'Planned',
  shipped: 'Shipped ✅',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

const STATUS_CLASS: Record<ContactStatus, string> = {
  new: 'feature-status-pill--new',
  reviewing: 'feature-status-pill--reviewing',
  planned: 'feature-status-pill--planned',
  shipped: 'feature-status-pill--shipped',
  closed: 'feature-status-pill--closed',
  wont_fix: 'feature-status-pill--wont_fix',
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function HistoryClient() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/contact/my-submissions')
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'all' ? submissions : submissions.filter((s) => s.type === filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '2rem' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '1.25rem 1rem 1rem',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button
              onClick={() => router.push('/contact')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ←
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Your Submissions
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Track your requests and feedback
              </p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="history-filter-row">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                className={`filter-pill${filter === f.id ? ' active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {filter === 'all' ? "You haven't submitted anything yet." : 'No submissions in this category.'}
            </p>
            <Link
              href="/contact"
              style={{
                display: 'inline-block',
                background: 'var(--accent)',
                color: '#000',
                fontWeight: 700,
                padding: '0.625rem 1.25rem',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Send a Message
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map((s) => (
              <div
                key={s._id}
                className="glass-card"
                onClick={() => router.push(`/contact/history/${s._id}`)}
                style={{ padding: '1rem', cursor: 'pointer', borderRadius: 14, position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '1rem' }}>{TYPE_ICON[s.type]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {TYPE_LABEL[s.type]}
                    </span>
                  </div>
                  <span className={`feature-status-pill ${STATUS_CLASS[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>

                {s.title && (
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.25rem', lineHeight: 1.3 }}>
                    {s.title}
                  </p>
                )}
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {s.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{relativeTime(s.createdAt)}</span>
                  {s.publicReply && (
                    <>
                      <span>·</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✨ Team replied</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
