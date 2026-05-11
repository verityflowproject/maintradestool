import { redirect, notFound } from 'next/navigation';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import Job from '@/lib/models/Job';
import MemberDetailClient from './MemberDetailClient';

export default async function MemberDetailPage({
  params,
}: {
  params: { memberId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  if (!Types.ObjectId.isValid(params.memberId)) notFound();

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'read', 'team');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);

  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: ownerId,
  }).lean();

  if (!member) notFound();

  const memberObjId = new Types.ObjectId(params.memberId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeJobs, completedThisMonth, revenueAgg, recentJobsRaw] = await Promise.all([
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
    Job.aggregate<{ total: number; hours: number }>([
      {
        $match: {
          userId: new Types.ObjectId(ownerId),
          assignedMemberIds: memberObjId,
          status: { $in: ['invoiced', 'paid'] },
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' }, hours: { $sum: '$laborHours' } } },
    ]),
    Job.find({ userId: ownerId, assignedMemberIds: memberObjId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id title status total createdAt customerName')
      .lean<{
        _id: Types.ObjectId;
        title?: string;
        status?: string;
        total?: number;
        createdAt?: Date;
        customerName?: string;
      }[]>(),
  ]);

  const workload = {
    activeJobs,
    completedThisMonth,
    revenueThisMonth: revenueAgg[0]?.total ?? 0,
    hoursThisMonth: revenueAgg[0]?.hours ?? 0,
  };

  const recentJobs = recentJobsRaw.map((j) => ({
    _id: String(j._id),
    title: j.title ?? '',
    status: j.status ?? 'draft',
    total: j.total ?? 0,
    createdAt: j.createdAt ? j.createdAt.toISOString() : '',
    customerName: j.customerName ?? '',
  }));

  return (
    <MemberDetailClient
      member={{
        _id: String(member._id),
        ownerUserId: String(member.ownerUserId),
        linkedUserId: member.linkedUserId ? String(member.linkedUserId) : null,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        hourlyRate: member.hourlyRate,
        color: member.color,
        avatarInitials: member.avatarInitials,
        active: member.active,
        notes: member.notes,
        inviteSentAt: member.inviteSentAt ? member.inviteSentAt.toISOString() : null,
        inviteAcceptedAt: member.inviteAcceptedAt ? member.inviteAcceptedAt.toISOString() : null,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
      }}
      workload={workload}
      recentJobs={recentJobs}
    />
  );
}
