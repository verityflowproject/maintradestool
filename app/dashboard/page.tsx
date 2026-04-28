import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ContactSubmission from '@/lib/models/ContactSubmission';
import { getPlanState } from '@/lib/planState';
import type { PlanState } from '@/lib/planState';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();

  const [user, recentFR, shippedCalloutsRaw] = await Promise.all([
    User.findById(session.user.id)
      .select('firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince createdAt')
      .lean<{
        firstName: string;
        businessName: string;
        plan: 'trial' | 'pro' | 'cancelled';
        trialEndsAt: Date;
        subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
        subscriptionEndsAt: Date | null;
        pastDueSince: Date | null;
        createdAt: Date;
      } | null>(),
    ContactSubmission.findOne({
      userId: session.user.id,
      type: 'feature_request',
      createdAt: { $gte: new Date(Date.now() - 14 * 86_400_000) },
    })
      .select('_id')
      .lean(),
    ContactSubmission.find({
      userId: session.user.id,
      status: 'shipped',
      userNotifiedOfShip: false,
    })
      .limit(3)
      .select('_id title description')
      .lean(),
  ]);

  const planState: PlanState = user
    ? getPlanState(user)
    : { plan: 'trial', daysLeft: 0, isActive: true, canCreateJobs: true, canGenerateInvoices: true, canUseVoice: true, canEnableBooking: true, earlyBirdEligible: false, earlyBirdEndsAt: null };

  const shippedCallouts = shippedCalloutsRaw.map((c) => ({
    _id: String(c._id),
    title: (c as { title?: string }).title ?? '',
    description: (c as { description?: string }).description ?? '',
  }));

  return (
    <DashboardClient
      firstName={user?.firstName ?? ''}
      businessName={user?.businessName ?? ''}
      planState={planState}
      trialEndsAt={user?.trialEndsAt ? user.trialEndsAt.toISOString() : null}
      hasRecentFeatureRequest={!!recentFR}
      shippedCallouts={shippedCallouts}
    />
  );
}
