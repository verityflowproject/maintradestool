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

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  await dbConnect();

  // Verify job ownership
  const job = await Job.findOne({
    _id: params.jobId,
    userId: session.user.id,
  })
    .select('_id status')
    .lean<{ _id: Types.ObjectId; status: string } | null>();

  if (!job) notFound();

  // Paid jobs are locked — no edits allowed
  if (job.status === 'paid') redirect(`/jobs/${params.jobId}`);

  // Plan gate
  const user = await User.findById(session.user.id)
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
