import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import Invoice from '@/lib/models/Invoice';
import { getPlanState } from '@/lib/planState';
import BillingExpiredClient from './BillingExpiredClient';

export default async function BillingExpiredPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince stripeCustomerId createdAt')
    .lean<{
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      stripeCustomerId: string | null;
      createdAt: Date;
    } | null>();

  if (!user) redirect('/onboarding');

  const planState = getPlanState(user);

  // Redirect Pro users away — they shouldn't see this page
  if (planState.isActive) redirect('/dashboard');

  const [jobCount, customerCount, invoiceCount] = await Promise.all([
    Job.countDocuments({ userId: session.user.id }),
    Customer.countDocuments({ userId: session.user.id }),
    Invoice.countDocuments({ userId: session.user.id }),
  ]);

  const reason = searchParams.reason === 'past_due' ? 'past_due' : 'expired';
  const hasStripeCustomer = !!user.stripeCustomerId;

  return (
    <BillingExpiredClient
      jobCount={jobCount}
      customerCount={customerCount}
      invoiceCount={invoiceCount}
      reason={reason}
      hasStripeCustomer={hasStripeCustomer}
    />
  );
}
