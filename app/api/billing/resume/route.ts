import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  void req;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('stripeSubscriptionId subscriptionStatus')
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
  }

  if (user.subscriptionStatus !== 'canceled') {
    return NextResponse.json(
      { error: 'Subscription is not in a cancelled state.' },
      { status: 400 },
    );
  }

  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  return NextResponse.json({ success: true });
}
