import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe, priceIdForPlan } from '@/lib/stripe';

export const runtime = 'nodejs';

// #region agent log helper
function debugLog(location: string, message: string, data: Record<string, unknown>, hypothesisId?: string) {
  fetch('http://127.0.0.1:7640/ingest/3195af90-a8fb-42a5-93e8-4e3cff3932fe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bac3eb' },
    body: JSON.stringify({ sessionId: 'bac3eb', location, message, data, hypothesisId, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

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

  try {
    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // #region agent log
    debugLog('app/api/billing/checkout/route.ts:enter', 'checkout route entered', {
      plan,
      hasStripeCustomerId: !!user.stripeCustomerId,
      stripeCustomerIdPrefix: user.stripeCustomerId ? user.stripeCustomerId.slice(0, 8) : null,
      hasSubscriptionId: !!user.stripeSubscriptionId,
      priceMonthlyPrefix: (process.env.STRIPE_PRICE_PRO_MONTHLY ?? '').slice(0, 12),
      priceAnnualPrefix: (process.env.STRIPE_PRICE_PRO_ANNUAL ?? '').slice(0, 12),
      secretKeyMode: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_') ? 'live' : (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_') ? 'test' : 'unknown',
    }, 'A,B,C');
    // #endregion

    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user._id.toString() },
        });
        user.stripeCustomerId = customer.id;
        await user.save();
        // #region agent log
        debugLog('app/api/billing/checkout/route.ts:customer-created', 'created new stripe customer', { customerIdPrefix: customer.id.slice(0, 8) }, 'A,E');
        // #endregion
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Unknown error';
        // #region agent log
        debugLog('app/api/billing/checkout/route.ts:customer-create-error', 'stripe.customers.create threw', { detail }, 'A,E');
        // #endregion
        console.error('[POST /api/billing/checkout] customer create error', err);
        return NextResponse.json({ error: 'Could not create Stripe customer', detail }, { status: 500 });
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://verityflow.io';
    const priceId = priceIdForPlan(plan);

    if (!priceId) {
      // #region agent log
      debugLog('app/api/billing/checkout/route.ts:no-price-id', 'priceId is empty/undefined', { plan }, 'B');
      // #endregion
      return NextResponse.json({ error: 'Price ID not configured', detail: `STRIPE_PRICE_PRO_${plan === 'monthly' ? 'MONTHLY' : 'ANNUAL'} is not set` }, { status: 500 });
    }

    try {
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

      // #region agent log
      debugLog('app/api/billing/checkout/route.ts:checkout-created', 'stripe checkout session created', { hasUrl: !!checkoutSession.url });
      // #endregion

      return NextResponse.json({ url: checkoutSession.url });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      const stripeCode = (err as { code?: string; type?: string; raw?: { code?: string; message?: string } }).code
        ?? (err as { raw?: { code?: string } }).raw?.code
        ?? null;
      const stripeType = (err as { type?: string }).type ?? null;
      // #region agent log
      debugLog('app/api/billing/checkout/route.ts:checkout-error', 'stripe.checkout.sessions.create threw', {
        detail,
        stripeCode,
        stripeType,
        customerIdPrefix: user.stripeCustomerId?.slice(0, 8),
        priceIdPrefix: priceId.slice(0, 12),
      }, 'A,B,C,D');
      // #endregion
      console.error('[POST /api/billing/checkout] checkout session error', err);
      return NextResponse.json({ error: 'Could not start checkout', detail, stripeCode }, { status: 500 });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    // #region agent log
    debugLog('app/api/billing/checkout/route.ts:outer-error', 'unexpected error in checkout route', { detail }, 'A,B,C,D,E');
    // #endregion
    console.error('[POST /api/billing/checkout] unexpected error', err);
    return NextResponse.json({ error: 'Unexpected server error', detail }, { status: 500 });
  }
}
