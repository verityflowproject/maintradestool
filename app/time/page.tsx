import { Types } from 'mongoose';
import { requirePagePerm } from '@/lib/auth/serverGuard';
import { dbConnect } from '@/lib/mongodb';
import TimeEntry from '@/lib/models/TimeEntry';
import TeamMember from '@/lib/models/TeamMember';
import Job from '@/lib/models/Job';
import { effectiveOwnerId as getEffectiveOwnerId, memberId as getMemberId } from '@/lib/auth/scope';
import TimePageClient from './TimePageClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize<T>(doc: T): any {
  return JSON.parse(JSON.stringify(doc));
}

export default async function TimePage() {
  const { session } = await requirePagePerm('read', 'time');

  await dbConnect();

  const ownerId = getEffectiveOwnerId(session);
  const isMember = session.user.accountType === 'member';
  const mid = getMemberId(session);

  if (isMember && mid) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const memberObjId = new Types.ObjectId(mid);
    const ownerObjId = new Types.ObjectId(ownerId);

    const [openEntry, weekEntries, assignedJobs] = await Promise.all([
      TimeEntry.findOne({ ownerUserId: ownerObjId, teamMemberId: memberObjId, endedAt: null })
        .populate('jobId', 'title')
        .lean(),
      TimeEntry.find({
        ownerUserId: ownerObjId,
        teamMemberId: memberObjId,
        startedAt: { $gte: weekStart },
      })
        .populate('jobId', 'title')
        .sort({ startedAt: -1 })
        .lean(),
      Job.find({
        userId: ownerObjId,
        assignedMemberIds: memberObjId,
        status: { $in: ['draft', 'complete'] },
      })
        .select('_id title customerName')
        .lean(),
    ]);

    return (
      <TimePageClient
        mode="member"
        openEntry={openEntry ? serialize(openEntry) : null}
        weekEntries={serialize(weekEntries)}
        assignedJobs={serialize(assignedJobs)}
        allEntries={null}
        members={null}
      />
    );
  }

  // Owner/manager view
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const ownerObjId = new Types.ObjectId(ownerId);

  const [allEntries, members] = await Promise.all([
    TimeEntry.find({
      ownerUserId: ownerObjId,
      startedAt: { $gte: from, $lte: to },
    })
      .populate('teamMemberId', 'name color avatarInitials')
      .populate('jobId', 'title')
      .lean(),
    TeamMember.find({ ownerUserId: ownerObjId, active: true })
      .select('_id name color avatarInitials')
      .lean(),
  ]);

  return (
    <TimePageClient
      mode="owner"
      openEntry={null}
      weekEntries={null}
      assignedJobs={null}
      allEntries={serialize(allEntries)}
      members={serialize(members)}
    />
  );
}
