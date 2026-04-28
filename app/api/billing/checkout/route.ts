import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe, priceIdForPlan } from '@/lib/stripe';

export const runtime = 'nodejs';

const EARLY_BIRD_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== 'monthly' && plan !== 'annual') {
    return NextResponse.json({ error: 'Invalid plan. Must be "monthly" or "annual".' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Create Stripe customer if not exists
  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user._id.toString() },
    });
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const priceId = priceIdForPlan(plan);

  // Server-side early-bird eligibility check — client cannot spoof this
  const isEarlyBirdEligible =
    user.plan === 'trial' &&
    !!user.createdAt &&
    Date.now() < new Date(user.createdAt).getTime() + EARLY_BIRD_MS &&
    !user.stripeSubscriptionId;

  const earlyBirdCouponId = process.env.STRIPE_COUPON_EARLY_BIRD;
  const discounts =
    isEarlyBirdEligible && earlyBirdCouponId
      ? [{ coupon: earlyBirdCouponId }]
      : undefined;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Stripe does not allow discounts + allow_promotion_codes simultaneously
    ...(discounts ? { discounts } : { allow_promotion_codes: true }),
    success_url: `${baseUrl}/settings/billing?success=true`,
    cancel_url: `${baseUrl}/settings/billing?cancelled=true`,
    metadata: {
      userId: user._id.toString(),
      earlyBird: isEarlyBirdEligible ? '1' : '0',
    },
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
        earlyBird: isEarlyBirdEligible ? '1' : '0',
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
