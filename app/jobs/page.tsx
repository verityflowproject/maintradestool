import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import BookingRequest from '@/lib/models/BookingRequest';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';
import { isTeamSize } from '@/lib/team/hasTeam';
import { requirePerm } from '@/lib/auth/permissions';
import { jobReadFilter } from '@/lib/auth/jobScope';
import { effectiveOwnerId as getEffectiveOwnerId } from '@/lib/auth/scope';
import JobsClient, { type JobRow, type RequestRow, type TeamMemberLite } from './JobsClient';

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  const perm = requirePerm(session, 'read', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();

  const ownerId = getEffectiveOwnerId(session);
  const isMember = session.user.accountType === 'member';
  const jobFilter = jobReadFilter(session, perm.scope);

  const userDoc = await User.findById(ownerId)
    .select('teamSize teamPreferences')
    .lean<{
      teamSize?: string;
      teamPreferences?: { showAvatarsOnJobs: boolean; requireAssignmentBeforeInvoice: boolean };
    } | null>();

  const hasTeam = isTeamSize(userDoc?.teamSize);
  const showAvatars = userDoc?.teamPreferences?.showAvatarsOnJobs ?? true;

  const [rows, totalCount, rawRequests, rawTeamMembers] = await Promise.all([
    Job.find(jobFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select(
        '_id title status customerName customerAddress total laborHours createdAt aiParsed invoiceNumber invoiceId bookingRequestId scheduledDate assignedMemberIds',
      )
      .lean<JobRow[]>(),
    Job.countDocuments(jobFilter),
    // Members don't see booking requests (booking is owner/manager only per matrix)
    isMember
      ? Promise.resolve([] as RequestRow[])
      : BookingRequest.find({ userId: ownerId })
          .sort({ createdAt: -1 })
          .lean<RequestRow[]>(),
    hasTeam
      ? TeamMember.find({ ownerUserId: ownerId, active: true })
          .select('_id name color avatarInitials')
          .lean<TeamMemberLite[]>()
      : Promise.resolve([]),
  ]);

  return (
    <JobsClient
      initial={rows.map(serialize)}
      totalCount={totalCount}
      initialRequests={rawRequests.map(serialize)}
      teamMembers={rawTeamMembers.map((m) => ({
        ...m,
        _id: String(m._id),
      }))}
      showAvatars={hasTeam && showAvatars}
      hasTeam={hasTeam}
      isMember={isMember}
      title={isMember ? 'My Jobs' : 'Jobs'}
    />
  );
}
