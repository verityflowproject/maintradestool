import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import TimeEntry from '@/lib/models/TimeEntry';
import Job from '@/lib/models/Job';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { memberId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'team');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.memberId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();
  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: effectiveOwnerId(session!),
  }).lean();

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    member: {
      ...member,
      _id: String(member._id),
      ownerUserId: String(member.ownerUserId),
      linkedUserId: member.linkedUserId ? String(member.linkedUserId) : null,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { memberId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'team');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.memberId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  await dbConnect();
  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: effectiveOwnerId(session!),
  });

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Whitelist editable fields
  if ('name' in body) member.name = String(body.name ?? '').trim();
  if ('email' in body) member.email = String(body.email ?? '').trim().toLowerCase();
  if ('phone' in body) member.phone = String(body.phone ?? '').trim();
  if ('role' in body) member.role = body.role as typeof member.role;
  if ('hourlyRate' in body) {
    member.hourlyRate = body.hourlyRate == null || body.hourlyRate === '' ? null : Number(body.hourlyRate);
  }
  if ('color' in body) member.color = String(body.color ?? '#4A9EFF');
  const wasActive = member.active;
  if ('active' in body) member.active = Boolean(body.active);
  if ('notes' in body) member.notes = String(body.notes ?? '');

  await member.save();

  // Auto-close any open TimeEntry rows when a member is deactivated
  if (wasActive && !member.active) {
    await TimeEntry.updateMany(
      { teamMemberId: member._id, endedAt: null },
      { $set: { endedAt: new Date() } },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { memberId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'team');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.memberId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const hardDelete = searchParams.get('hard') === '1';
  const ownerId = effectiveOwnerId(session!);

  await dbConnect();
  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: ownerId,
  });

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (hardDelete) {
    const hasJobs = await Job.exists({
      userId: ownerId,
      assignedMemberIds: new Types.ObjectId(params.memberId),
    });
    if (hasJobs) {
      return NextResponse.json(
        { error: 'Cannot hard-delete a member with job history. Archive instead.' },
        { status: 409 },
      );
    }
    await TeamMember.deleteOne({ _id: member._id });
    return NextResponse.json({ success: true, deleted: true });
  }

  // Soft-delete — auto-close open time entries so payroll isn't distorted
  member.active = false;
  await member.save();

  if (member.linkedUserId) {
    await TimeEntry.updateMany(
      { teamMemberId: member._id, endedAt: null },
      { $set: { endedAt: new Date() } },
    );
  }

  return NextResponse.json({ success: true, archived: true });
}
