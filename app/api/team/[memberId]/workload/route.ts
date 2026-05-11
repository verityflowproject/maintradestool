import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import TeamMember from '@/lib/models/TeamMember';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { memberId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!Types.ObjectId.isValid(params.memberId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { effectiveOwnerId } = await import('@/lib/auth/scope');
  const ownerId = effectiveOwnerId(session);

  await dbConnect();
  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: ownerId,
  }).lean();
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const memberObjId = new Types.ObjectId(params.memberId);
  const ownerObjId = new Types.ObjectId(ownerId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeJobs, completedThisMonth, revenueAgg] = await Promise.all([
    Job.countDocuments({
      userId: ownerId,
      assignedMemberIds: memberObjId,
      status: { $in: ['draft', 'complete'] },
    }),
    Job.countDocuments({
      userId: ownerId,
      assignedMemberIds: memberObjId,
      status: { $in: ['complete', 'invoiced', 'paid'] },
      completedDate: { $gte: monthStart },
    }),
    Job.aggregate([
      {
        $match: {
          userId: ownerObjId,
          assignedMemberIds: memberObjId,
          status: { $in: ['invoiced', 'paid'] },
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' }, hours: { $sum: '$laborHours' } } },
    ]),
  ]);

  return NextResponse.json({
    activeJobs,
    completedThisMonth,
    revenueThisMonth: revenueAgg[0]?.total ?? 0,
    hoursThisMonth: revenueAgg[0]?.hours ?? 0,
  });
}
