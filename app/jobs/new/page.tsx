import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { redirect } from 'next/navigation';
import { getPlanState } from '@/lib/planState';
import JobForm from './JobForm';

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  // Apprentice and office cannot create jobs — redirect to dashboard
  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);
  const user = await User.findById(ownerId)
    .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince hourlyRate partsMarkup createdAt')
    .lean<{
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      hourlyRate?: number;
      partsMarkup?: number;
      createdAt: Date;
    } | null>();

  if (user) {
    const planState = getPlanState(user);
    if (!planState.canCreateJobs) redirect('/billing-expired');
  }

  return (
    <JobForm
      defaultRate={user?.hourlyRate ?? 0}
      defaultMarkup={user?.partsMarkup ?? 0}
    />
  );
}
