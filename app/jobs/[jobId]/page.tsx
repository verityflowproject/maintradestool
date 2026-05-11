import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Link as LinkIcon, Mic, Pencil } from 'lucide-react';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Job, { type IJob } from '@/lib/models/Job';
import TeamMember from '@/lib/models/TeamMember';
import TimeEntry from '@/lib/models/TimeEntry';
import User from '@/lib/models/User';
import { isTeamSize } from '@/lib/team/hasTeam';
import JobTimeSectionClient from './JobTimeSectionClient';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  complete: 'Complete',
  invoiced: 'Invoiced',
  paid: 'Paid',
};

export default async function JobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId, memberId: getMId } = await import('@/lib/auth/scope');

  const perm = requirePerm(session, 'read', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();

  const ownerId = getEOId(session);

  const [job, userDoc] = await Promise.all([
    Job.findOne({
      _id: params.jobId,
      userId: ownerId,
    }).lean<IJob | null>(),
    User.findById(ownerId).select('teamSize').lean<{ teamSize?: string } | null>(),
  ]);

  if (!job) notFound();

  // own-scope: member must be assigned to this job
  if (perm.scope === 'own') {
    const mid = getMId(session);
    const assignedIds = (job.assignedMemberIds ?? []).map(String);
    if (!mid || !assignedIds.includes(mid)) notFound();
  }

  const hasTeam = isTeamSize(userDoc?.teamSize);
  const assignedMembers =
    hasTeam && (job.assignedMemberIds ?? []).length > 0
      ? await TeamMember.find({
          _id: { $in: job.assignedMemberIds },
          ownerUserId: ownerId,
        })
          .select('_id name color avatarInitials role')
          .lean<{ _id: Types.ObjectId; name: string; color: string; avatarInitials: string; role: string }[]>()
      : [];

  // Fetch time entries for this job
  const rawTimeEntries = await TimeEntry.find({
    ownerUserId: ownerId,
    jobId: job._id,
  })
    .populate('teamMemberId', 'name color avatarInitials')
    .sort({ startedAt: -1 })
    .lean<{
      _id: Types.ObjectId;
      teamMemberId: { _id: Types.ObjectId; name: string; color: string; avatarInitials: string } | Types.ObjectId;
      startedAt: Date;
      endedAt: Date | null;
      durationMinutes: number;
    }[]>();

  // For own-scope: filter to this member's entries only
  const memberObjId = perm.scope === 'own'
    ? (getMId(session) ? new Types.ObjectId(getMId(session)!) : null)
    : null;

  const filteredTimeEntries = memberObjId
    ? rawTimeEntries.filter((e) => {
        const m = e.teamMemberId;
        const mid = typeof m === 'object' && '_id' in m ? String(m._id) : String(m);
        return mid === String(memberObjId);
      })
    : rawTimeEntries;

  const timeEntries = filteredTimeEntries.map((e) => {
    const m = e.teamMemberId as { _id: Types.ObjectId; name: string; color: string; avatarInitials: string } | Types.ObjectId;
    const memberData = typeof m === 'object' && 'name' in m
      ? { name: (m as { name: string }).name, color: (m as { color: string }).color, initials: (m as { avatarInitials: string }).avatarInitials }
      : { name: 'Unknown', color: '#888', initials: '??' };
    return {
      _id: String(e._id),
      memberName: memberData.name,
      memberColor: memberData.color,
      memberInitials: memberData.initials,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt ? e.endedAt.toISOString() : null,
      durationMinutes: e.durationMinutes,
    };
  });

  const canApplyLabor = perm.scope === 'all';

  const jobId = params.jobId;
  const status = job.status ?? 'draft';

  return (
    <div className="job-detail-wrap">
      {/* ── Header ── */}
      <header className="job-form-header">
        <Link href="/jobs" className="job-form-back" aria-label="Back to jobs">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="job-form-title" style={{ flex: 1 }}>{job.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-badge status-${status}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
          {job.aiParsed && (
            <span className="ai-logged-badge">AI Logged</span>
          )}
        </div>
      </header>

      {/* ── Booking request backlink ── */}
      {job.bookingRequestId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <LinkIcon size={13} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 12,
              color: 'var(--accent-text)',
              flex: 1,
            }}
          >
            Created from a booking request
          </span>
          <Link
            href={`/requests/${job.bookingRequestId.toString()}`}
            style={{
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-text)',
              textDecoration: 'none',
            }}
          >
            View request →
          </Link>
        </div>
      )}

      {/* ── Assigned team members ── */}
      {assignedMembers.length > 0 && (
        <section className="job-form-section">
          <p className="section-label">Assigned to</p>
          <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {assignedMembers.map((m) => (
              <Link
                key={String(m._id)}
                href={`/team/${String(m._id)}`}
                style={{ textDecoration: 'none' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1.5px solid ${m.color}`,
                    background: `${m.color}22`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: m.color,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {m.avatarInitials}
                  </span>
                  {m.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Time logged ── */}
      <JobTimeSectionClient
        jobId={jobId}
        entries={timeEntries}
        canApplyLabor={canApplyLabor}
      />

      {/* ── Customer ── */}
      {(job.customerName || job.customerPhone || job.customerAddress) && (
        <section className="job-form-section">
          <p className="section-label">Customer</p>
          <div className="detail-card glass-card">
            {job.customerName && (
              <div className="detail-row">
                <span className="totals-label">Name</span>
                <span>{job.customerName}</span>
              </div>
            )}
            {job.customerPhone && (
              <div className="detail-row">
                <span className="totals-label">Phone</span>
                <span>{job.customerPhone}</span>
              </div>
            )}
            {job.customerAddress && (
              <div className="detail-row">
                <span className="totals-label">Address</span>
                <span>{job.customerAddress}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Labor ── */}
      <section className="job-form-section">
        <p className="section-label">Labor</p>
        <div className="detail-card glass-card">
          <div className="detail-row">
            <span className="totals-label">Hours</span>
            <span className="money-display">{job.laborHours}</span>
          </div>
          <div className="detail-row">
            <span className="totals-label">Rate</span>
            <span className="money-display">${fmt(job.laborRate)}/hr</span>
          </div>
          <div className="detail-row">
            <span className="totals-label">Labor Total</span>
            <span className="money-display">${fmt(job.laborTotal)}</span>
          </div>
        </div>
      </section>

      {/* ── Parts ── */}
      {job.parts && job.parts.length > 0 && (
        <section className="job-form-section">
          <p className="section-label">Parts &amp; Materials</p>
          <div className="detail-card glass-card">
            {job.parts.map((p, i) => (
              <div key={i} className="detail-row" style={{ borderTop: i > 0 ? '1px solid var(--quartz-border)' : undefined, paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
                <span className="totals-label">{p.name} ×{p.quantity}</span>
                <span className="money-display">${fmt(p.total)}</span>
              </div>
            ))}
            <hr className="totals-divider" />
            <div className="detail-row">
              <span className="totals-label">Parts Total</span>
              <span className="money-display">${fmt(job.partsTotal)}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Totals ── */}
      <section className="job-form-section">
        <p className="section-label">Totals</p>
        <div className="detail-card glass-card">
          <div className="detail-row">
            <span className="totals-label">Subtotal</span>
            <span className="money-display">${fmt(job.subtotal)}</span>
          </div>
          {job.taxRate > 0 && (
            <div className="detail-row">
              <span className="totals-label">Tax ({job.taxRate}%)</span>
              <span className="money-display">${fmt(job.taxTotal)}</span>
            </div>
          )}
          <hr className="totals-divider" />
          <div className="detail-row">
            <span className="totals-label totals-label--total">Total</span>
            <span className="money-display money-display--total">${fmt(job.total)}</span>
          </div>
        </div>
      </section>

      {/* ── Description ── */}
      {job.description && (
        <section className="job-form-section">
          <p className="section-label">Description</p>
          <div className="detail-card glass-card">
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {job.description}
            </p>
          </div>
        </section>
      )}

      {/* ── Internal Notes ── */}
      {job.internalNotes && (
        <section className="job-form-section">
          <p className="section-label">Internal Notes</p>
          <div className="detail-card glass-card">
            <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {job.internalNotes}
            </p>
          </div>
        </section>
      )}

      {/* ── Actions ── */}
      <div className="job-form-actions">
        {status !== 'paid' && (
          <>
            <Link
              href={`/jobs/${jobId}/edit`}
              className="btn-ghost"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Pencil size={15} />
              Edit Job
            </Link>
            <Link
              href={`/jobs/${jobId}/voice`}
              className="btn-ghost"
              style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Mic size={15} />
              Use Voice
            </Link>
          </>
        )}
        <Link href={`/jobs/${jobId}/invoice`} className="btn-accent" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
          {status === 'invoiced' || status === 'paid' ? 'View Invoice →' : 'Generate Invoice →'}
        </Link>
      </div>
    </div>
  );
}
