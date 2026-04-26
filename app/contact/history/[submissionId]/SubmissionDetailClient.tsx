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
  problemSolved?: string;
  priority?: string;
  rating?: number;
  stepsToReproduce?: string;
  willingToPay?: boolean;
  createdAt: string;
  updatedAt: string;
  adminReplyAt?: string;
}

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
  shipped: 'Shipped',
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

interface Props {
  submissionId: string;
}

export default function SubmissionDetailClient({ submissionId }: Props) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/contact/${submissionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => setSubmission(data.submission))
      .catch(() => setError('Submission not found.'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Not found.'}</p>
        <button onClick={() => router.back()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
          ← Go back
        </button>
      </div>
    );
  }

  const isShipped = submission.status === 'shipped';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '1.25rem 1rem',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            ←
          </button>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '1.1rem' }}>
            {TYPE_LABEL[submission.type]}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
        {/* Shipped celebration banner */}
        {isShipped && (
          <div className="submission-detail-celebration">
            <div style={{ fontSize: 36, marginBottom: '0.5rem' }}>🚀</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
              This idea shipped!
            </p>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: 0 }}>
              Thank you for helping shape VerityFlow.
            </p>
          </div>
        )}

        {/* Main card */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 16, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span className={`feature-status-pill ${STATUS_CLASS[submission.status]}`}>
              {STATUS_LABEL[submission.status]}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(submission.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {submission.title && (
            <h2 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
              {submission.title}
            </h2>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {submission.description}
            </p>
          </div>

          {submission.problemSolved && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Problem it solves
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {submission.problemSolved}
              </p>
            </div>
          )}

          {submission.stepsToReproduce && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Steps to reproduce
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {submission.stepsToReproduce}
              </p>
            </div>
          )}

          {submission.rating && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rating
              </p>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>{'⭐'.repeat(submission.rating)}</p>
            </div>
          )}
        </div>

        {/* Reply card */}
        {submission.publicReply && (
          <div
            style={{
              borderLeft: '3px solid var(--accent)',
              background: 'var(--surface)',
              borderRadius: '0 14px 14px 0',
              padding: '1rem 1.25rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>
              Team Reply
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {submission.publicReply}
            </p>
            {submission.adminReplyAt && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                {new Date(submission.adminReplyAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Feature board CTA */}
        {submission.type === 'feature_request' && (
          <Link
            href="/feature-board"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: 'var(--surface)',
              borderRadius: 14,
              textDecoration: 'none',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Vote on Public Board</p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem' }}>See other ideas and upvote your favourites</p>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
