'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type FeatureStatus = 'new' | 'reviewing' | 'planned' | 'shipped' | 'closed' | 'wont_fix';

interface FeatureItem {
  _id: string;
  title?: string;
  problemSolved?: string;
  description: string;
  status: FeatureStatus;
  upvotes: number;
  createdAt: string;
  publicReply?: string;
  submitterFirstName?: string;
  submitterTrade?: string;
  hasUpvoted: boolean;
}

interface ApiResponse {
  items: FeatureItem[];
  page: number;
  total: number;
  shippedCount: number;
  totalCount: number;
}

const STATUS_LABELS: Record<FeatureStatus, string> = {
  new: 'New',
  reviewing: 'Under Review',
  planned: 'Planned',
  shipped: 'Shipped ✅',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

const STATUS_CLASS: Record<FeatureStatus, string> = {
  new: 'feature-status-pill--new',
  reviewing: 'feature-status-pill--reviewing',
  planned: 'feature-status-pill--planned',
  shipped: 'feature-status-pill--shipped',
  closed: 'feature-status-pill--closed',
  wont_fix: 'feature-status-pill--wont_fix',
};

const TRADE_EMOJI: Record<string, string> = {
  plumber: '🔧',
  electrician: '⚡',
  carpenter: '🪚',
  painter: '🎨',
  landscaper: '🌿',
  builder: '🏗️',
  hvac: '❄️',
  cleaner: '🧹',
  other: '🔨',
};

function tradeEmoji(trade?: string) {
  if (!trade) return '🔨';
  return TRADE_EMOJI[trade.toLowerCase()] ?? '🔨';
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'planned', label: 'Planned' },
  { id: 'shipped', label: 'Shipped' },
];

export default function FeatureBoardClient() {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'top' | 'recent'>('top');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [shippedCount, setShippedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [scaleIds, setScaleIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/features?status=${status}&sort=${sort}&page=${p}`
        );
        if (!res.ok) return;
        const data: ApiResponse = await res.json();
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotal(data.total);
        setShippedCount(data.shippedCount);
        setTotalCount(data.totalCount);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, sort]
  );

  useEffect(() => {
    setPage(1);
    fetchItems(1, false);
  }, [fetchItems]);

  async function handleUpvote(item: FeatureItem) {
    if (votingId) return;
    setVotingId(item._id);
    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? {
              ...i,
              hasUpvoted: !i.hasUpvoted,
              upvotes: i.hasUpvoted ? i.upvotes - 1 : i.upvotes + 1,
            }
          : i
      )
    );
    // trigger scale animation
    setScaleIds((prev) => new Set(prev).add(item._id));
    setTimeout(() => {
      setScaleIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }, 400);

    try {
      await fetch(`/api/features/${item._id}/upvote`, { method: 'POST' });
    } catch {
      // revert on error
      setItems((prev) =>
        prev.map((i) =>
          i._id === item._id
            ? {
                ...i,
                hasUpvoted: item.hasUpvoted,
                upvotes: item.upvotes,
              }
            : i
        )
      );
    } finally {
      setVotingId(null);
    }
  }

  const hasMore = items.length < total;

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
            <Link
              href="/dashboard"
              style={{
                color: 'var(--text-muted)',
                fontSize: '1.25rem',
                textDecoration: 'none',
                lineHeight: 1,
              }}
            >
              ←
            </Link>
            <div>
              <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Feature Board
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Vote on ideas. See what's planned and shipped.
              </p>
            </div>
          </div>

          {/* Filters row */}
          <div className="history-filter-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.375rem', flex: 1, overflowX: 'auto' }}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`filter-pill${status === f.id ? ' active' : ''}`}
                  onClick={() => setStatus(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
              <button
                className={`filter-pill${sort === 'top' ? ' active' : ''}`}
                onClick={() => setSort('top')}
              >
                🔥 Top
              </button>
              <button
                className={`filter-pill${sort === 'recent' ? ' active' : ''}`}
                onClick={() => setSort('recent')}
              >
                🕐 Recent
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1rem' }}>
        {/* Stats banner */}
        {!loading && totalCount > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              padding: '0.75rem 1rem',
              background: 'var(--surface)',
              borderRadius: 12,
              margin: '1rem 0',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{totalCount}</strong> ideas
            </span>
            <span>
              <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>{shippedCount}</strong> shipped
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>💡</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              No features here yet.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Be the first to suggest an idea for VerityFlow.
            </p>
            <Link
              href="/contact?type=feature"
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
              Submit Idea
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem' }}>
            {items.map((item) => (
              <div key={item._id} className="feature-card">
                {/* Vote column */}
                <button
                  className={`feature-card__vote${item.hasUpvoted ? ' upvoted' : ''}${scaleIds.has(item._id) ? ' vote-scale' : ''}`}
                  onClick={() => handleUpvote(item)}
                  disabled={votingId === item._id}
                  aria-label={item.hasUpvoted ? 'Remove upvote' : 'Upvote'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span>{item.upvotes}</span>
                </button>

                {/* Content */}
                <div className="feature-card__content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {item.title || '(Untitled)'}
                    </span>
                    <span className={`feature-status-pill ${STATUS_CLASS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {item.problemSolved && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: '0.25rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.problemSolved}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.submitterFirstName && (
                      <>
                        <span>{tradeEmoji(item.submitterTrade)}</span>
                        <span>{item.submitterFirstName}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{relativeTime(item.createdAt)}</span>
                  </div>

                  {item.publicReply && (
                    <div className="feature-card__reply">
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', display: 'block', marginBottom: '0.25rem' }}>
                        Team Reply
                      </span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: 0 }}>
                        {item.publicReply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

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
                  marginTop: '0.5rem',
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/contact?type=feature"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: 'var(--accent)',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.9rem',
          padding: '0.75rem 1.25rem',
          borderRadius: 24,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 20,
        }}
      >
        + Submit Idea
      </Link>
    </div>
  );
}
