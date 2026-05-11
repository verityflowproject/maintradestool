import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TimeEntry from '@/lib/models/TimeEntry';
import Job from '@/lib/models/Job';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'time');
  if (!perm.ok) return perm.response;

  const url = new URL(req.url);
  const jobIdParam = url.searchParams.get('jobId');
  const memberIdParam = url.searchParams.get('memberId');
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const filter: Record<string, unknown> = { ownerUserId: new Types.ObjectId(ownerId) };

  // 'own' scope: member can only see their own entries
  if (perm.scope === 'own') {
    const mid = memberId(session!);
    if (!mid) return NextResponse.json({ entries: [] });
    filter.teamMemberId = new Types.ObjectId(mid);
  } else if (memberIdParam && Types.ObjectId.isValid(memberIdParam)) {
    // owner/manager filtering by a specific member
    filter.teamMemberId = new Types.ObjectId(memberIdParam);
  }

  if (jobIdParam && Types.ObjectId.isValid(jobIdParam)) {
    filter.jobId = new Types.ObjectId(jobIdParam);
  }

  if (fromParam || toParam) {
    const dateFilter: Record<string, Date> = {};
    if (fromParam) dateFilter.$gte = new Date(fromParam);
    if (toParam) dateFilter.$lte = new Date(toParam);
    filter.startedAt = dateFilter;
  }

  const entries = await TimeEntry.find(filter)
    .sort({ startedAt: -1 })
    .limit(200)
    .populate('teamMemberId', 'name color avatarInitials')
    .populate('jobId', 'title')
    .lean();

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'time');
  if (!perm.ok) return perm.response;

  // Owners don't clock in — they manage and review
  if (session!.user.accountType === 'owner') {
    return NextResponse.json(
      { error: 'Owners do not clock in. Use /api/time/[entryId] to edit entries directly.' },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const jobIdRaw = String(body?.jobId ?? '');
  const notes = String(body?.notes ?? '').trim();

  if (!jobIdRaw || !Types.ObjectId.isValid(jobIdRaw)) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const mid = memberId(session!);

  if (!mid) {
    return NextResponse.json({ error: 'No team member identity found' }, { status: 400 });
  }

  // Verify the job belongs to the owner and is in a clockable status
  const job = await Job.findOne({
    _id: jobIdRaw,
    userId: ownerId,
    status: { $in: ['draft', 'complete'] },
  }).select('_id').lean();

  if (!job) {
    return NextResponse.json({ error: 'Job not found or not in a clockable status' }, { status: 404 });
  }

  // Snapshot hourly rate: TeamMember.hourlyRate → User.hourlyRate → 0
  const [tmDoc, userDoc] = await Promise.all([
    TeamMember.findById(mid).select('hourlyRate').lean<{ hourlyRate: number | null } | null>(),
    User.findById(session!.user.id).select('hourlyRate').lean<{ hourlyRate?: number } | null>(),
  ]);
  const hourlyRate = tmDoc?.hourlyRate ?? userDoc?.hourlyRate ?? 0;

  try {
    const entry = await TimeEntry.create({
      ownerUserId: new Types.ObjectId(ownerId),
      jobId: new Types.ObjectId(jobIdRaw),
      teamMemberId: new Types.ObjectId(mid),
      startedAt: new Date(),
      endedAt: null,
      durationMinutes: 0,
      hourlyRate,
      notes,
    });
    return NextResponse.json({ entry: { _id: String(entry._id) } }, { status: 201 });
  } catch (err: unknown) {
    // MongoDB duplicate-key error on the partial unique index = already clocked in
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      const openEntry = await TimeEntry.findOne({
        teamMemberId: new Types.ObjectId(mid),
        endedAt: null,
      }).select('jobId').lean<{ jobId: Types.ObjectId } | null>();
      return NextResponse.json(
        {
          error: 'already_clocked_in',
          openJobId: openEntry ? String(openEntry.jobId) : null,
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
