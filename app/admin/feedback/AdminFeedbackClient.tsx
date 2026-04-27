'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type ContactType = 'feature_request' | 'bug_report' | 'feedback' | 'support' | 'partnership' | 'other';
type ContactStatus = 'new' | 'reviewing' | 'planned' | 'shipped' | 'closed' | 'wont_fix';

interface Submission {
  _id: string;
  type: ContactType;
  title?: string;
  description: string;
  status: ContactStatus;
  adminNotes?: string;
  publicReply?: string;
  userEmail: string;
  userFirstName: string;
  userBusinessName: string;
  priority?: string;
  rating?: number;
  upvotes?: number;
  createdAt: string;
  adminReplyAt?: string;
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'feature_request', label: '💡 Features' },
  { id: 'bug_report', label: '🐛 Bugs' },
  { id: 'feedback', label: '⭐ Feedback' },
  { id: 'support', label: '🙋 Support' },
  { id: 'other', label: '📬 Other' },
];

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'planned', label: 'Planned' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'closed', label: 'Closed' },
  { value: 'wont_fix', label: "Won't Fix" },
];

const STATUS_CLASS: Record<ContactStatus, string> = {
  new: 'feature-status-pill--new',
  reviewing: 'feature-status-pill--reviewing',
  planned: 'feature-status-pill--planned',
  shipped: 'feature-status-pill--shipped',
  closed: 'feature-status-pill--closed',
  wont_fix: 'feature-status-pill--wont_fix',
};

const TYPE_LABEL: Record<ContactType, string> = {
  feature_request: 'Feature Request',
  bug_report: 'Bug Report',
  feedback: 'Feedback',
  support: 'Support',
  partnership: 'Partnership',
  other: 'Other',
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

export default function AdminFeedbackClient() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [replyTarget, setReplyTarget] = useState<Submission | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  const focusRef = useRef<HTMLDivElement | null>(null);

  const fetchItems = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/admin/feedback?type=${typeFilter}&status=${statusFilter}&page=${p}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setPage(p);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [typeFilter, statusFilter]
  );

  useEffect(() => {
    fetchItems(1, false);
  }, [fetchItems]);

  // Scroll to focused row
  useEffect(() => {
    if (focusId && focusRef.current) {
      setTimeout(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [focusId, items]);

  async function patchSubmission(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update');
  }

  async function handleStatusChange(item: Submission, newStatus: ContactStatus) {
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, status: newStatus } : i))
    );
    try {
      await patchSubmission(item._id, { status: newStatus });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, status: item.status } : i))
      );
    }
  }

  async function handleReplySubmit() {
    if (!replyTarget || !replyText.trim()) return;
    setReplySaving(true);
    try {
      await patchSubmission(replyTarget._id, { publicReply: replyText.trim() });
      setItems((prev) =>
        prev.map((i) =>
          i._id === replyTarget._id
            ? { ...i, publicReply: replyText.trim(), adminReplyAt: new Date().toISOString() }
            : i
        )
      );
      setReplyTarget(null);
      setReplyText('');
    } catch {
      alert('Failed to save reply.');
    } finally {
      setReplySaving(false);
    }
  }

  const hasMore = items.length < total;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <Link
            href="/admin"
            aria-label="Back to admin"
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              Feedback &amp; Submissions
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {total} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                className={`filter-pill${typeFilter === f.id ? ' active' : ''}`}
                onClick={() => setTypeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button
              className={`filter-pill${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All statuses
            </button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                className={`filter-pill${statusFilter === s.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No submissions found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item) => {
              const isFocused = item._id === focusId;
              return (
                <div
                  key={item._id}
                  ref={isFocused ? focusRef : null}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    borderRadius: 14,
                    outline: isFocused ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 2,
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {TYPE_LABEL[item.type]}
                        </span>
                        {item.upvotes ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>· ▲ {item.upvotes}</span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.userFirstName || item.userEmail}
                        {item.userBusinessName ? ` · ${item.userBusinessName}` : ''}
                        {' · '}
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Status dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value as ContactStatus)}
                      className={`feature-status-pill ${STATUS_CLASS[item.status]}`}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        paddingRight: '0.25rem',
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {item.title && (
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.25rem', lineHeight: 1.3 }}>
                      {item.title}
                    </p>
                  )}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                    {item.description}
                  </p>

                  {item.publicReply && (
                    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', display: 'block', marginBottom: '0.2rem' }}>
                        Your reply
                      </span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: 0 }}>{item.publicReply}</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setReplyTarget(item);
                      setReplyText(item.publicReply ?? '');
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {item.publicReply ? 'Edit reply' : 'Reply'}
                  </button>
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => fetchItems(page + 1, true)}
                disabled={loadingMore}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply modal */}
      {replyTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setReplyTarget(null); setReplyText(''); } }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px 20px 0 0',
              padding: '1.5rem',
              width: '100%',
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-syne)', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              Reply to {replyTarget.userFirstName || replyTarget.userEmail}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              This reply will be visible to the user.
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
              placeholder="Write your reply…"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                onClick={() => { setReplyTarget(null); setReplyText(''); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReplySubmit}
                disabled={replySaving || !replyText.trim()}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#000',
                  opacity: replySaving || !replyText.trim() ? 0.6 : 1,
                }}
              >
                {replySaving ? 'Saving…' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
