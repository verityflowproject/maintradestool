import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import type { PlanState } from '@/lib/planState';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select('firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince')
    .lean<{
      firstName: string;
      businessName: string;
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
    } | null>();

  const planState: PlanState = user
    ? getPlanState(user)
    : { plan: 'trial', daysLeft: 0, isActive: true, canCreateJobs: true, canGenerateInvoices: true, canUseVoice: true, canEnableBooking: true };

  return (
    <DashboardClient
      firstName={user?.firstName ?? ''}
      businessName={user?.businessName ?? ''}
      planState={planState}
      trialEndsAt={user?.trialEndsAt ? user.trialEndsAt.toISOString() : null}
    />
  );
}
