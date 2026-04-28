import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

type CancelAction = 'pause' | 'discount' | 'downgrade_to_annual' | 'cancel';

interface CancelBody {
  action: CancelAction;
  feedback?: string;
  comment?: string;
}

const FEEDBACK_MAP: Record<string, string> = {
  too_expensive: 'too_expensive',
  not_using: 'unused',
  missing_feature: 'missing_features',
  switching_tools: 'switched_to_competitor',
  other: 'other',
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CancelBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, feedback, comment } = body;
  if (!['pause', 'discount', 'downgrade_to_annual', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('stripeSubscriptionId subscriptionStatus subscriptionPlan stripeCustomerId')
    .lean();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription.' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'pause': {
        // Pause billing for 30 days — subscription stays active, just no invoices
        const resumesAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'mark_uncollectible',
            resumes_at: resumesAt,
          },
        });
        return NextResponse.json({ success: true, action: 'paused' });
      }

      case 'discount': {
        const couponId = process.env.STRIPE_RETENTION_COUPON_50OFF_2MO;
        if (!couponId) {
          return NextResponse.json({ error: 'Retention coupon not configured.' }, { status: 500 });
        }
        // Stripe v22+ uses `discounts` array instead of `coupon` on subscription update
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          discounts: [{ coupon: couponId }],
        });
        return NextResponse.json({ success: true, action: 'discounted' });
      }

      case 'downgrade_to_annual': {
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
        return NextResponse.json({ success: true, action: 'downgraded_to_annual' });
      }

      case 'cancel': {
        const cancellationDetails: Stripe.SubscriptionUpdateParams['cancellation_details'] = {};
        if (feedback && FEEDBACK_MAP[feedback]) {
          cancellationDetails.feedback = FEEDBACK_MAP[feedback] as Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback;
        }
        if (comment) {
          cancellationDetails.comment = comment.slice(0, 500);
        }

        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
          ...(Object.keys(cancellationDetails).length > 0 ? { cancellation_details: cancellationDetails } : {}),
        });
        return NextResponse.json({ success: true, action: 'cancelled' });
      }
    }
  } catch (err) {
    console.error('[billing/cancel] Stripe error:', err);
    return NextResponse.json({ error: 'Stripe operation failed.' }, { status: 500 });
  }
}
