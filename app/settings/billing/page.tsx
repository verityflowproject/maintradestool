import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import BillingClient from './BillingClient';

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('plan subscriptionStatus subscriptionPlan subscriptionEndsAt stripeCustomerId trialEndsAt')
    .lean();

  if (!user) redirect('/');

  return (
    <Suspense fallback={null}>
      <BillingClient
        plan={user.plan}
        subscriptionStatus={user.subscriptionStatus ?? null}
        subscriptionPlan={user.subscriptionPlan ?? null}
        subscriptionEndsAt={user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString() : null}
        hasStripeCustomer={!!user.stripeCustomerId}
        trialEndsAt={user.trialEndsAt ? user.trialEndsAt.toISOString() : null}
      />
    </Suspense>
  );
}
