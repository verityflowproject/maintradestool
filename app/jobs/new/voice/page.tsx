import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import VoiceRecorder from './VoiceRecorder';

export default async function VoiceRecordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();
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

  return <VoiceRecorder />;
}
