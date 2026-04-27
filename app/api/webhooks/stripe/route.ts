import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, planFromPriceId, getSubPeriodEnd } from '@/lib/stripe';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { sendMail, FROM_ADDRESS } from '@/lib/email/gmail';
import { subscriptionCancelledTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';

// ── Welcome email ─────────────────────────────────────────────────────

function welcomeEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1A1A1A;padding:28px 32px;">
      <span style="color:#C7D2FE;font-size:22px;font-weight:800;letter-spacing:0.04em;">VerityFlow</span>
      <span style="color:#1E90FF;font-size:12px;font-weight:600;margin-left:8px;">PRO</span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1A1A1A;font-size:22px;margin:0 0 12px;">Welcome to VerityFlow Pro, ${firstName}!</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your subscription is now active. Here's everything you've unlocked:
      </p>
      <ul style="list-style:none;padding:0;margin:0 0 28px;">
        ${[
          'Unlimited voice-logged jobs',
          'Unlimited invoices & PDFs',
          'Full customer management',
          'Public booking page',
          'Priority support',
        ].map((f) => `<li style="padding:6px 0;color:#333;font-size:14px;">&#10003; &nbsp;${f}</li>`).join('')}
      </ul>
      <p style="color:#666;font-size:13px;">
        Thanks for being a VerityFlow Pro member. If you have any questions, reply to this email or visit
        <a href="https://help.verityflow.com" style="color:#1E90FF;">help.verityflow.com</a>.
      </p>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">VerityFlow &middot; The OS for trades professionals.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Payment failed email ──────────────────────────────────────────────

function paymentFailedEmailHtml(firstName: string): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://verityflow.com';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1A1A1A;padding:28px 32px;">
      <span style="color:#C7D2FE;font-size:22px;font-weight:800;">VerityFlow</span>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#F87171;font-size:20px;margin:0 0 12px;">Payment Failed</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hi ${firstName}, we were unable to process your payment for VerityFlow Pro.
        Please update your payment method to keep your Pro access.
      </p>
      <a href="${baseUrl}/settings/billing"
         style="display:inline-block;background:#1E90FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Update Payment Method
      </a>
    </div>
  </div>
</body>
</html>`;
}

// ── Webhook handler ───────────────────────────────────────────────────

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await dbConnect();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;

        const userId = session.metadata?.userId;
        if (!userId) break;

        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price?.id ?? '';
        const subPlan = planFromPriceId(priceId);
        const periodEnd = getSubPeriodEnd(sub);

        const user = await User.findById(userId);
        if (!user) break;

        const wasAlreadyPro = user.plan === 'pro';

        user.plan = 'pro';
        user.stripeSubscriptionId = sub.id;
        user.subscriptionStatus = sub.status as typeof user.subscriptionStatus;
        user.subscriptionPlan = subPlan;
        user.subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;
        await user.save();

        if (!wasAlreadyPro) {
          await sendMail({
            from: FROM_ADDRESS,
            to: user.email,
            subject: 'Welcome to VerityFlow Pro!',
            html: welcomeEmailHtml(user.firstName),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = getSubPeriodEnd(sub);

        const user = await User.findOne({ stripeSubscriptionId: sub.id });
        if (!user) break;

        // If cancel_at_period_end is set, treat as 'canceled' in our schema
        // so the UI can show "Pro (Cancelled) · Access ends ..."
        if (sub.cancel_at_period_end && sub.status === 'active') {
          user.subscriptionStatus = 'canceled';
        } else {
          user.subscriptionStatus = sub.status as typeof user.subscriptionStatus;
        }

        // Clear past_due grace if the subscription recovered
        if (sub.status !== 'past_due') {
          user.pastDueSince = null;
        }

        user.subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;

        // Sync plan back to 'pro' if subscription is active/trialing and not pending cancel
        if ((sub.status === 'active' || sub.status === 'trialing') && !sub.cancel_at_period_end) {
          user.plan = 'pro';
        }

        await user.save();
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = getSubPeriodEnd(sub);

        const user = await User.findOne({ stripeSubscriptionId: sub.id });
        if (!user) break;

        user.plan = 'cancelled';
        user.subscriptionStatus = 'canceled';
        user.subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;
        await user.save();

        sendEmail({ to: user.email, ...subscriptionCancelledTemplate(user) }).catch(console.error);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const user = await User.findOne({ stripeCustomerId: customerId });
        if (!user) break;

        user.subscriptionStatus = 'past_due';
        if (!user.pastDueSince) {
          user.pastDueSince = new Date();
        }
        await user.save();

        await sendMail({
          from: FROM_ADDRESS,
          to: user.email,
          subject: 'Action required: Payment failed for VerityFlow Pro',
          html: paymentFailedEmailHtml(user.firstName),
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const user = await User.findOne({ stripeCustomerId: customerId });
        if (!user || !user.stripeSubscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const periodEnd = getSubPeriodEnd(sub);
        user.subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;
        user.subscriptionStatus = sub.status as typeof user.subscriptionStatus;
        // Clear past_due grace on successful payment
        if (sub.status !== 'past_due') {
          user.pastDueSince = null;
        }
        await user.save();
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    // Return 200 so Stripe doesn't retry for internal errors
    return NextResponse.json({ received: true, warning: 'Handler error' });
  }

  return NextResponse.json({ received: true });
}
