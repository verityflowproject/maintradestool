import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import ContactSubmission from '@/lib/models/ContactSubmission';
import TeamMember from '@/lib/models/TeamMember';
import { getPlanState } from '@/lib/planState';
import type { PlanState } from '@/lib/planState';
import { isTeamSize } from '@/lib/team/hasTeam';
import { effectiveOwnerId as getEffectiveOwnerId, memberId as getMemberId } from '@/lib/auth/scope';
import type { TeamMemberRole } from '@/lib/team/roles';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  await dbConnect();

  const ownerId = getEffectiveOwnerId(session);
  const isMember = session.user.accountType === 'member';
  const mid = getMemberId(session);

  const [user, recentFR, shippedCalloutsRaw] = await Promise.all([
    // For members, load the owner's business info for display context
    User.findById(ownerId)
      .select('firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince teamSize')
      .lean<{
        firstName: string;
        businessName: string;
        plan: 'trial' | 'pro' | 'cancelled';
        trialEndsAt: Date;
        subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
        subscriptionEndsAt: Date | null;
        pastDueSince: Date | null;
        teamSize?: string;
      } | null>(),
    // Feature request recency is scoped to effectiveOwnerId
    ContactSubmission.findOne({
      userId: ownerId,
      type: 'feature_request',
      createdAt: { $gte: new Date(Date.now() - 14 * 86_400_000) },
    })
      .select('_id')
      .lean(),
    ContactSubmission.find({
      userId: ownerId,
      status: 'shipped',
      userNotifiedOfShip: false,
    })
      .limit(3)
      .select('_id title description')
      .lean(),
  ]);

  // Team workload: only show for owners (members don't manage the full team view)
  const hasTeam = isTeamSize(user?.teamSize);
  let teamWorkload: { memberId: string; name: string; color: string; avatarInitials: string; activeJobs: number }[] = [];

  if (hasTeam && !isMember) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const activeMembers = await TeamMember.find({ ownerUserId: ownerId, active: true })
      .select('_id name color avatarInitials')
      .lean<{ _id: Types.ObjectId; name: string; color: string; avatarInitials: string }[]>();

    if (activeMembers.length > 0) {
      const counts = await Job.aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            userId: new Types.ObjectId(ownerId),
            status: { $in: ['draft', 'complete'] },
            assignedMemberIds: { $exists: true, $ne: [] },
          },
        },
        { $unwind: '$assignedMemberIds' },
        { $group: { _id: '$assignedMemberIds', count: { $sum: 1 } } },
      ]);

      const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
      teamWorkload = activeMembers
        .map((m) => ({
          memberId: String(m._id),
          name: m.name,
          color: m.color,
          avatarInitials: m.avatarInitials,
          activeJobs: countMap.get(String(m._id)) ?? 0,
        }))
        .sort((a, b) => b.activeJobs - a.activeJobs)
        .slice(0, 4);
    }
  }

  const planState: PlanState = user
    ? getPlanState(user)
    : { plan: 'trial', daysLeft: 0, isActive: true, canCreateJobs: true, canGenerateInvoices: true, canUseVoice: true, canEnableBooking: true };

  const shippedCallouts = shippedCalloutsRaw.map((c) => ({
    _id: String(c._id),
    title: (c as { title?: string }).title ?? '',
    description: (c as { description?: string }).description ?? '',
  }));

  // For member, use their own firstName from session, but owner's businessName for context
  const firstName = isMember ? (session.user.firstName ?? '') : (user?.firstName ?? '');
  const businessName = user?.businessName ?? '';
  const role = (session.user.role ?? 'owner') as TeamMemberRole | 'owner';

  // Member-specific stats: count jobs assigned to this member today and active jobs total
  let memberStats: { activeJobs: number; jobsAssignedToday: number } | null = null;
  if (isMember && mid) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const memberObjId = new Types.ObjectId(mid);
    const [activeJobs, jobsAssignedToday] = await Promise.all([
      Job.countDocuments({
        userId: ownerId,
        assignedMemberIds: memberObjId,
        status: { $in: ['draft', 'complete'] },
      }),
      Job.countDocuments({
        userId: ownerId,
        assignedMemberIds: memberObjId,
        createdAt: { $gte: todayStart },
      }),
    ]);
    memberStats = { activeJobs, jobsAssignedToday };
  }

  return (
    <DashboardClient
      firstName={firstName}
      businessName={businessName}
      planState={planState}
      trialEndsAt={user?.trialEndsAt ? user.trialEndsAt.toISOString() : null}
      hasRecentFeatureRequest={!!recentFR}
      shippedCallouts={shippedCallouts}
      teamWorkload={teamWorkload}
      role={role}
      accountType={isMember ? 'member' : 'owner'}
      memberStats={memberStats}
    />
  );
}
