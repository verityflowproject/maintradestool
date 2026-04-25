import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

export function planFromPriceId(priceId: string): 'monthly' | 'annual' | null {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'monthly';
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return 'annual';
  return null;
}

export function priceIdForPlan(plan: 'monthly' | 'annual'): string {
  return plan === 'monthly'
    ? process.env.STRIPE_PRICE_PRO_MONTHLY!
    : process.env.STRIPE_PRICE_PRO_ANNUAL!;
}

/** Get the current period end timestamp from a subscription (from first item in v22 API). */
export function getSubPeriodEnd(sub: Stripe.Subscription): number | null {
  return sub.items?.data?.[0]?.current_period_end ?? null;
}
