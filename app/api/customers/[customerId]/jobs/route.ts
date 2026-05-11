import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { customerId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'job');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const jobFilter: Record<string, unknown> = {
    customerId: params.customerId,
    userId: ownerId,
  };
  // tech/lead can only see their own assigned jobs for this customer
  if (perm.scope === 'own') {
    const mid = memberId(session!);
    if (!mid) return NextResponse.json({ jobs: [] });
    jobFilter.assignedMemberIds = new Types.ObjectId(mid);
  }

  const raw = await Job.find(jobFilter)
    .sort({ createdAt: -1 })
    .select(
      '_id title status total laborHours createdAt completedDate invoiceId invoiceNumber aiParsed',
    )
    .lean<Record<string, unknown>[]>();

  const jobs = raw.map((j) => ({ ...j, _id: String(j._id) }));
  return NextResponse.json({ jobs });
}
