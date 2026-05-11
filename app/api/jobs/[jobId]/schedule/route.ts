import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) return perm.response;

  if (!Types.ObjectId.isValid(params.jobId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    scheduledDate?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if ('scheduledDate' in body) {
    update.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
  }
  if ('scheduledStart' in body) {
    update.scheduledStart = body.scheduledStart ?? null;
  }
  if ('scheduledEnd' in body) {
    update.scheduledEnd = body.scheduledEnd ?? null;
  }

  const job = await Job.findOneAndUpdate(
    { _id: params.jobId, userId: ownerId },
    { $set: update },
    { new: true },
  ).lean();

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 'own' scope: verify member is assigned to this job
  if (perm.scope === 'own') {
    const mid = memberId(session!);
    const ids = ((job as unknown as Record<string, unknown>).assignedMemberIds ?? []) as Types.ObjectId[];
    if (!mid || !ids.some((id) => String(id) === mid)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ job });
}
