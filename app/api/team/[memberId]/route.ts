import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import TimeEntry from '@/lib/models/TimeEntry';
import Job from '@/lib/models/Job';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';
import {
  validatePhone,
  validateEmail,
  validateHourlyRate,
  validatePersonName,
  validateFreeTextShort,
  stripNullBytes,
} from '@/lib/utils/validators';

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

  // Whitelist editable fields with validation
  if ('name' in body) {
    const nameVal = String(body.name ?? '').trim();
    if (!nameVal) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const nameErr = validatePersonName(nameVal, 'Name');
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
    member.name = nameVal;
  }
  if ('email' in body) {
    const emailVal = String(body.email ?? '').trim().toLowerCase();
    const emailErr = validateEmail(emailVal);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
    member.email = emailVal;
  }
  if ('phone' in body) {
    const phoneVal = String(body.phone ?? '').trim();
    const phoneErr = validatePhone(phoneVal);
    if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
    member.phone = phoneVal;
  }
  if ('role' in body) member.role = body.role as typeof member.role;
  if ('hourlyRate' in body) {
    const rateVal = body.hourlyRate == null || body.hourlyRate === '' ? '' : String(body.hourlyRate);
    const rateErr = validateHourlyRate(rateVal);
    if (rateErr) return NextResponse.json({ error: rateErr }, { status: 400 });
    member.hourlyRate = rateVal === '' ? null : Number(rateVal);
  }
  if ('color' in body) member.color = String(body.color ?? '#4A9EFF');
  const wasActive = member.active;
  if ('active' in body) member.active = Boolean(body.active);
  if ('notes' in body) {
    const notesVal = String(body.notes ?? '');
    const notesErr = validateFreeTextShort(notesVal, 'Notes');
    if (notesErr) return NextResponse.json({ error: notesErr }, { status: 400 });
    member.notes = stripNullBytes(notesVal);
  }

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
