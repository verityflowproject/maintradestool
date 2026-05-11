import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import VoiceRecorder from '@/app/jobs/new/voice/VoiceRecorder';

export default async function JobVoicePage({
  params,
}: {
  params: { jobId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId, memberId: getMId } = await import('@/lib/auth/scope');

  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();

  const ownerId = getEOId(session);

  // Verify job ownership + own-scope
  const job = await Job.findOne({
    _id: params.jobId,
    userId: ownerId,
  })
    .select('_id status assignedMemberIds')
    .lean<{ _id: Types.ObjectId; status: string; assignedMemberIds?: Types.ObjectId[] } | null>();

  if (!job) notFound();

  if (perm.scope === 'own') {
    const mid = getMId(session);
    const assignedIds = (job.assignedMemberIds ?? []).map(String);
    if (!mid || !assignedIds.includes(mid)) notFound();
  }

  // Paid jobs are locked — no edits allowed
  if (job.status === 'paid') redirect(`/jobs/${params.jobId}`);

  // Plan gate (use owner's plan)
  const user = await User.findById(ownerId)
    .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince createdAt')
    .lean<{
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      createdAt: Date;
    } | null>();

  if (user) {
    const planState = getPlanState(user);
    if (!planState.canUseVoice) redirect('/billing-expired');
  }

  return <VoiceRecorder mergeJobId={params.jobId} />;
}
