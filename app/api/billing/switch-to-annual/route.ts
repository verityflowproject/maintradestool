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
    .select('stripeSubscriptionId subscriptionPlan subscriptionStatus')
    .lean();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.subscriptionPlan !== 'monthly' || user.subscriptionStatus !== 'active') {
    return NextResponse.json(
      { error: 'Only active monthly subscribers can switch to annual.' },
      { status: 400 },
    );
  }

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
  }

  const annualPriceId = process.env.STRIPE_PRICE_PRO_ANNUAL;
  if (!annualPriceId) {
    return NextResponse.json({ error: 'Annual price not configured.' }, { status: 500 });
  }

  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) {
    return NextResponse.json({ error: 'Subscription item not found.' }, { status: 400 });
  }

  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [{ id: itemId, price: annualPriceId }],
    proration_behavior: 'always_invoice',
  });

  // The webhook (customer.subscription.updated) will sync subscriptionPlan automatically.
  return NextResponse.json({ success: true });
}
