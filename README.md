# VerityFlow

AI-powered job memory and instant invoices for tradespeople.

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Auth:** NextAuth v5
- **Database:** MongoDB + Mongoose
- **Payments:** Stripe (subscriptions, webhooks)
- **Email:** Gmail via Nodemailer + Resend
- **AI:** Anthropic Claude / OpenAI
- **Deployment:** Vercel

---

## Stripe configuration (required one-time setup)

### 1. Products & Prices

Create a single **VerityFlow Pro** product with two prices:

| Price | Amount | Interval | Env var |
|-------|--------|----------|---------|
| Pro Monthly | $29.00 | monthly | `STRIPE_PRICE_PRO_MONTHLY` |
| Pro Annual | $290.00 | yearly | `STRIPE_PRICE_PRO_ANNUAL` |

### 2. Smart Retries (critical for revenue recovery)

**Settings → Billing → Subscriptions and emails → Smart retries**

- Enable Smart Retries. Stripe automatically retries failed payments using ML-optimized timing.
- This recovers ~30% of initially failed payments with no code changes.

Also enable **Stripe's built-in dunning emails** (Settings → Billing → Subscriptions and emails → Failed payment emails). These run alongside the custom dunning emails in the codebase for maximum recovery.

### 3. Customer Portal

**Settings → Billing → Customer portal**

Configure the portal so customers can update payment details. The app uses a custom cancel flow (CancelFlowModal), so cancel-via-portal is a fallback, not the primary path.

Recommended settings:
- ✅ Update payment method
- ✅ View invoice history
- ✅ Switch between plans (add both Monthly and Annual prices)
- ⬜ Cancel subscription (optional — leave off to force our custom cancel flow if the portal supports it)

### 4. Coupons

Create these coupons in **Products → Coupons**:

| Coupon name | Discount | Duration | Env var | Purpose |
|-------------|----------|----------|---------|---------|
| `RETENTION_50OFF_2MO` | 50% off | 2 months | `STRIPE_RETENTION_COUPON_50OFF_2MO` | Cancel-flow retention offer |
| `WINBACK_50OFF_1MO` | 50% off | 1 month | `STRIPE_WINBACK_COUPON` | Win-back email offer |

For marketing campaigns, create coupons and then attach **Promotion codes** (Products → Promotion codes) to them. The Stripe Checkout page always shows the "Add promotion code" field so users can self-redeem. Set the active campaign code in the `PROMO_CODE` env var so it's included in trial emails.

After creating them, copy the coupon IDs into your environment variables.

### 5. Webhooks

Point the Stripe webhook to `https://your-domain.com/api/webhooks/stripe`.

Required events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

Set `STRIPE_WEBHOOK_SECRET` to the signing secret from the webhook dashboard.

---

## Environment variables

```
MONGODB_URI=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_ANNUAL=
STRIPE_WEBHOOK_SECRET=
STRIPE_RETENTION_COUPON_50OFF_2MO=
STRIPE_WINBACK_COUPON=

# Optional: promotion code shown in trial emails (manage in Stripe Dashboard)
PROMO_CODE=
PROMO_CODE_DESCRIPTION=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Trial & subscription lifecycle

```
Signup (free, no card)
  → 14-day full Pro trial
  → Day 0:  Welcome email + promo email 1hr later (includes PROMO_CODE if set)
  → Day 5:  Promo reminder email (includes PROMO_CODE if set, urgency tone)
  → Day 7:  Midpoint email (jobs/revenue stats + upsell at standard price)
  → Day 11: 3-day warning (annual upsell, dual CTA)
  → Day 13: 1-day warning (hard urgency, list of losses)
  → Day 14: Trial expires → billing-expired hard paywall
  → Subscribe: Stripe Checkout (annual shown first)
             "Add promotion code" field always shown — codes managed in Stripe Dashboard
  → Pro active
  → Cancel intent: CancelFlowModal (pause / discount / downgrade / final)
  → Cancelled: access until period end → win-back email at +30d
  → Payment fails: immediate email + Stripe Smart Retries
     → Day 5: dunning escalation email
     → Day 7: grace period expires → billing-expired
```

---

## One-shot scripts

### Migrate existing trials to 14 days

If you have users on the old 30-day trial, run this once:

```bash
npx tsx scripts/migrate-trials-to-14d.ts
```

This caps every active trial at `now + 14 days` and resets `trialWarningsSent` so reminder emails fire on the correct schedule.

---

## Cron jobs

The daily cron at `/api/cron/daily` (called via Vercel Cron or external scheduler) handles:

1. Mark overdue invoices
2. Send first overdue reminder emails
3. Trial ending warnings (day 7 midpoint, day 3, day 1)
4. Expire trials (mark `plan: 'expired'`, send expiry email)
5. Win-back emails (30 days post-cancellation)
6. Dunning escalation (day 5 past-due final notice)
7. Promo reminder email (day 5–7 of trial — includes PROMO_CODE if set)

Set up in `vercel.json` or configure in the Vercel dashboard under **Cron Jobs**.
