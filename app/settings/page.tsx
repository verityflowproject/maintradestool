import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import type { PlanState } from '@/lib/planState';
import SettingsHubClient from './SettingsHubClient';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select('firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince password')
    .lean<{
      firstName: string;
      businessName: string;
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      password?: string | null;
    } | null>();

  if (!user) redirect('/');

  const planState: PlanState = getPlanState(user);

  return (
    <SettingsHubClient
      firstName={user.firstName}
      businessName={user.businessName}
      planState={planState}
      trialEndsAt={user.trialEndsAt ? user.trialEndsAt.toISOString() : null}
      hasPassword={!!user.password}
    />
  );
}
