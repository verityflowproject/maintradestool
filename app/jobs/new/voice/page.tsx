import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import VoiceRecorder from './VoiceRecorder';

export default async function VoiceRecordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  // Apprentice and office cannot create new jobs via voice
  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);
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

  return <VoiceRecorder />;
}
