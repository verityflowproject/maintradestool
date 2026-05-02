import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe, priceIdForPlan } from '@/lib/stripe';

export const runtime = 'nodejs';

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

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://verityflow.io';
  const priceId = priceIdForPlan(plan);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/settings/billing?success=true`,
    cancel_url: `${baseUrl}/settings/billing?cancelled=true`,
    metadata: {
      userId: user._id.toString(),
    },
    subscription_data: {
      metadata: {
        userId: user._id.toString(),
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
