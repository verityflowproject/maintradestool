import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TimeEntry from '@/lib/models/TimeEntry';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.entryId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const ownerId = effectiveOwnerId(session);
  const entry = await TimeEntry.findOne({
    _id: params.entryId,
    ownerUserId: new Types.ObjectId(ownerId),
  });

  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;

  // Mode 1: member stopping their own open entry
  if (body?.action === 'stop') {
    const mid = memberId(session);
    if (!mid || String(entry.teamMemberId) !== mid) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (entry.endedAt) {
      return NextResponse.json({ error: 'Entry already stopped' }, { status: 409 });
    }
    entry.endedAt = new Date();
    await entry.save(); // pre-save hook computes durationMinutes
    return NextResponse.json({ ok: true, durationMinutes: entry.durationMinutes });
  }

  // Mode 2: field edits — gate by write:time permission
  const perm = requirePerm(session, 'write', 'time');
  if (!perm.ok) return perm.response;

  // 'own' scope (tech/lead) can only edit their own entry's notes — no time field edits
  if (perm.scope === 'own') {
    const mid = memberId(session);
    if (!mid || String(entry.teamMemberId) !== mid) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (body?.notes !== undefined) {
      entry.notes = String(body.notes);
    }
    await entry.save();
    return NextResponse.json({ ok: true });
  }

  // 'all' scope (owner/manager) can edit any field
  if (body?.notes !== undefined) entry.notes = String(body.notes);
  if (body?.startedAt) {
    const d = new Date(body.startedAt as string);
    if (!isNaN(d.getTime())) entry.startedAt = d;
  }
  if (body?.endedAt !== undefined) {
    if (body.endedAt === null) {
      entry.endedAt = null;
      entry.durationMinutes = 0;
    } else {
      const d = new Date(body.endedAt as string);
      if (!isNaN(d.getTime())) entry.endedAt = d;
    }
  }

  await entry.save(); // pre-save hook recomputes durationMinutes
  return NextResponse.json({ ok: true, durationMinutes: entry.durationMinutes });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'delete', 'time');
  if (!perm.ok) return perm.response;

  if (!Types.ObjectId.isValid(params.entryId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const result = await TimeEntry.deleteOne({
    _id: params.entryId,
    ownerUserId: new Types.ObjectId(ownerId),
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
