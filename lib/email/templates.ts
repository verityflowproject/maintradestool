import type { IUser } from '@/lib/models/User';
import type { IInvoice } from '@/lib/models/Invoice';
import type { SendEmailArgs } from '@/lib/email/sendEmail';
import { APP_URL } from '@/lib/email/resend';

type TemplateResult = Omit<SendEmailArgs, 'to'>;

export function welcomeTemplate(user: Pick<IUser, '_id' | 'firstName' | 'email'>): TemplateResult {
  return {
    subject: `Welcome to VerityFlow, ${user.firstName}!`,
    preheader: 'Your 14-day Pro trial has started — no credit card required.',
    heading: `Welcome, ${user.firstName}!`,
    body: `
      <p>You're all set. Your <strong>14-day Pro trial</strong> has started — <strong>no credit card required</strong>.</p>
      <p>Here's how to get started:</p>
      <ol style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Tap the mic</strong> to voice-log your first job — describe what you did and we'll capture the details.</li>
        <li style="margin-bottom:8px;"><strong>Generate an invoice</strong> from any job with one tap.</li>
        <li style="margin-bottom:8px;"><strong>Send it</strong> to your customer by email or SMS.</li>
      </ol>
      <p>At the end of your trial, choose a plan to keep going. Annual plan saves you 20% — we'll remind you a few days before so you're never caught off guard.</p>
      <p>Your data is yours, no lock-in. If you ever need help, just reply to this email.</p>
    `,
    ctaText: 'Go to Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function firstJobTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  jobId: string
): TemplateResult {
  return {
    subject: 'You logged your first job — nice work!',
    preheader: 'Now try generating an invoice from it.',
    heading: 'First job logged!',
    body: `
      <p>Great work, ${user.firstName}! You just logged your first job with VerityFlow.</p>
      <p>Now try generating an invoice from it — it takes about 10 seconds.</p>
      <p>Once you've sent an invoice, you'll see it tracked in your dashboard automatically.</p>
    `,
    ctaText: 'View Your Job',
    ctaUrl: `${APP_URL}/jobs/${jobId}`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function firstInvoiceSentTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  return {
    subject: 'First invoice out the door!',
    preheader: "You're officially running VerityFlow. Here's how to get paid faster.",
    heading: "First invoice sent!",
    body: `
      <p>Nice one, ${user.firstName}! Your first invoice is on its way.</p>
      <p>You're officially running VerityFlow. A few tips to get paid faster:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:8px;">Set payment terms to <strong>Net 7</strong> for quicker turnaround</li>
        <li style="margin-bottom:8px;">Add a card payment link via Stripe to let customers pay online instantly</li>
        <li style="margin-bottom:8px;">Enable overdue reminders to follow up automatically</li>
      </ul>
      <p>Head to Settings to configure these any time.</p>
    `,
    ctaText: 'Go to Invoices',
    ctaUrl: `${APP_URL}/invoices`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function invoicePaidTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  invoice: Pick<IInvoice, '_id' | 'invoiceNumber' | 'total'>,
  customerName: string
): TemplateResult {
  const amount = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(invoice.total);
  return {
    subject: `${customerName} paid invoice ${invoice.invoiceNumber} — ${amount}`,
    preheader: `Payment confirmed for invoice ${invoice.invoiceNumber}.`,
    heading: 'Payment received!',
    body: `
      <p style="font-size:28px;font-weight:700;color:#050912;margin:0 0 16px;">${amount}</p>
      <p><strong>${customerName}</strong> has paid invoice <strong>${invoice.invoiceNumber}</strong>.</p>
      <p>The invoice has been marked as paid in your dashboard.</p>
    `,
    ctaText: 'View Invoice',
    ctaUrl: `${APP_URL}/invoices/${invoice._id}`,
    userId: String(user._id),
    preferenceKey: 'invoicePaid',
    preferenceLabel: 'invoice paid notification',
  };
}

export function overdueReminderTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  invoice: Pick<IInvoice, '_id' | 'invoiceNumber' | 'total' | 'dueDate'>,
  customerName: string,
  daysOverdue: number
): TemplateResult {
  const amount = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(invoice.total);
  return {
    subject: `Invoice ${invoice.invoiceNumber} is overdue`,
    preheader: `${customerName} hasn't paid invoice ${invoice.invoiceNumber} yet.`,
    heading: `Invoice overdue — ${amount}`,
    body: `
      <p>Invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${customerName}</strong> is <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>.</p>
      <p>Amount: <strong>${amount}</strong><br/>Due: <strong>${new Date(invoice.dueDate).toLocaleDateString('en-AU')}</strong></p>
      <p>You can send a payment reminder directly from the invoice page.</p>
    `,
    ctaText: `Send Reminder to ${customerName}`,
    ctaUrl: `${APP_URL}/invoices/${invoice._id}`,
    userId: String(user._id),
    preferenceKey: 'invoiceOverdue',
    preferenceLabel: 'overdue invoice notification',
  };
}

export function trialWarningTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  daysLeft: number,
  stats?: { jobsCount: number; revenue: number }
): TemplateResult {
  let subject: string;
  let body: string;
  let ctaText: string;

  const revenueStr = stats
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats.revenue)
    : null;

  const annualCtaBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding-right:8px;">
          <a href="${APP_URL}/settings/billing?plan=annual"
             style="display:block;text-align:center;background:#1E90FF;color:#fff;padding:11px 0;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
            Choose Annual — Save 20%
          </a>
        </td>
        <td>
          <a href="${APP_URL}/settings/billing?plan=monthly"
             style="display:block;text-align:center;background:transparent;color:#555;border:1px solid #ddd;padding:11px 0;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Choose Monthly
          </a>
        </td>
      </tr>
    </table>
  `;

  if (daysLeft === 7) {
    subject = 'Your VerityFlow trial ends in 7 days';
    ctaText = 'Upgrade to Pro';
    body = `
      <p>Hi ${user.firstName}, your free trial ends in <strong>7 days</strong>.</p>
      <p>After your trial, you'll lose access to:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:6px;">Voice job logging with AI</li>
        <li style="margin-bottom:6px;">Instant invoice generation</li>
        <li style="margin-bottom:6px;">Customer management</li>
        <li style="margin-bottom:6px;">Online booking page</li>
      </ul>
      <p>Upgrade now to keep all your data and stay on top of your business. Choose annual and <strong>save 20%</strong> — it's $24/mo instead of $29/mo.</p>
    `;
  } else if (daysLeft === 3) {
    subject = '3 days left — lock in 20% savings before your trial ends';
    ctaText = 'Upgrade to Pro';
    const statsBlurb =
      stats && (stats.jobsCount > 0 || stats.revenue > 0)
        ? `<p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:16px 0;">
            You've logged <strong>${stats.jobsCount} job${stats.jobsCount !== 1 ? 's' : ''}</strong> and earned <strong>${revenueStr}</strong> with VerityFlow — don't lose that momentum.
           </p>`
        : '';
    body = `
      <p>Hi ${user.firstName}, only <strong>3 days left</strong> on your trial.</p>
      ${statsBlurb}
      <p>This is our final-week offer: lock in annual pricing at <strong>$24/mo</strong> (save $58/yr vs monthly) and never think about it again.</p>
      ${annualCtaBlock}
      <p style="color:#888;font-size:13px;">Or go monthly at $29/mo — cancel any time.</p>
    `;
  } else {
    subject = 'Your trial ends tomorrow — upgrade to keep going';
    ctaText = 'Upgrade Now — Save 20% Annual';
    body = `
      <p>Hi ${user.firstName}, your trial ends <strong>tomorrow</strong>.</p>
      <p>After midnight your access will be paused. Here's what you'll lose:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:6px;">&#10007; Voice job logging</li>
        <li style="margin-bottom:6px;">&#10007; Invoice generation &amp; PDFs</li>
        <li style="margin-bottom:6px;">&#10007; Customer management</li>
        <li style="margin-bottom:6px;">&#10007; Public booking page</li>
      </ul>
      <p>Upgrade now and pick up exactly where you left off. Choose annual for <strong>$24/mo</strong> — that's $290/yr, saves you $58 vs monthly.</p>
      ${annualCtaBlock}
      <p style="color:#666;font-size:13px;">Your data is safe. Everything you've built stays intact — we'll never delete it.</p>
    `;
  }

  return {
    subject,
    preheader: subject,
    heading: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left on your trial`,
    body,
    ctaText,
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'trialReminders',
    preferenceLabel: 'trial reminder',
  };
}

export function trialExpiredTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  return {
    subject: 'Your VerityFlow trial has ended',
    preheader: 'Your data is safe. Subscribe any time to continue.',
    heading: 'Trial ended',
    body: `
      <p>Hi ${user.firstName}, your free trial has come to an end.</p>
      <p><strong>Your data is safe.</strong> All your jobs, invoices, and customers are still there — subscribe any time to pick up right where you left off.</p>
      <p>VerityFlow Pro is $29/month. No lock-in, cancel any time.</p>
    `,
    ctaText: 'Reactivate Account',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'trialReminders',
    preferenceLabel: 'account notification',
  };
}

export interface WeeklyReportStats {
  jobs: number;
  invoices: number;
  revenue: number;
  newCustomers: number;
  outstandingCount: number;
  outstandingTotal: number;
  topCustomerName?: string;
}

export function weeklyReportTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  stats: WeeklyReportStats
): TemplateResult {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000);
  const dateRange = `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
  const revenueStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats.revenue);
  const outstandingStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats.outstandingTotal);

  const outstandingBlurb =
    stats.outstandingCount > 0
      ? `<p style="background:#f0f8ff;border:1px solid #1E90FF;border-radius:8px;padding:12px 16px;margin:16px 0;color:#555;">
          ⚠ You have <strong>${stats.outstandingCount} outstanding invoice${stats.outstandingCount !== 1 ? 's' : ''}</strong> totalling <strong>${outstandingStr}</strong>.
          <a href="${APP_URL}/invoices" style="color:#1E90FF;font-weight:700;"> Follow up →</a>
        </p>`
      : '';

  const topCustomerBlurb = stats.topCustomerName
    ? `<p>⭐ Top customer this week: <strong>${stats.topCustomerName}</strong></p>`
    : '';

  return {
    subject: `Your VerityFlow week — ${dateRange}`,
    preheader: `${stats.jobs} jobs · ${revenueStr} revenue this week.`,
    heading: `Your week: ${dateRange}`,
    body: `
      <p>Hi ${user.firstName}, here's your weekly VerityFlow summary:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#050912;">${stats.jobs}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Jobs</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#050912;">${stats.invoices}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Invoices</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:18px;font-weight:700;color:#050912;">${revenueStr}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Revenue</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#050912;">${stats.newCustomers}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">New Customers</div>
          </td>
        </tr>
      </table>
      ${outstandingBlurb}
      ${topCustomerBlurb}
      <p>Have a great week, ${user.firstName}!</p>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
    userId: String(user._id),
    preferenceKey: 'weeklyReport',
    preferenceLabel: 'weekly report',
  };
}

export function subscriptionCancelledTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  return {
    subject: 'Your VerityFlow subscription has been cancelled',
    preheader: 'Sorry to see you go. Your data will be kept safe.',
    heading: 'Subscription cancelled',
    body: `
      <p>Hi ${user.firstName}, we've processed your cancellation.</p>
      <p>Your account will remain active until the end of your current billing period. After that, you'll lose access to Pro features — but <strong>your data will remain safe</strong>.</p>
      <p>If you cancelled by mistake or want to come back, you can resubscribe any time from your billing settings.</p>
      <p>If there's anything we could have done better, please reply to this email — we read every one.</p>
    `,
    ctaText: 'Resubscribe',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'account notification',
  };
}

// ── Lifecycle / conversion emails ────────────────────────────────────────────

export function promoTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  const promoCode = process.env.PROMO_CODE;
  const promoDescription = process.env.PROMO_CODE_DESCRIPTION;

  const promoBlock =
    promoCode && promoDescription
      ? `
      <div style="background:#EFF6FF;border:2px solid #1E90FF;border-radius:10px;padding:16px 18px;margin:18px 0;">
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1E3A8A;">Limited-time offer</p>
        <p style="margin:0 0 8px;color:#1E40AF;">${promoDescription}</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1E3A8A;">Use code <span style="background:#fff;border:1px solid #93C5FD;border-radius:4px;padding:2px 8px;font-family:monospace;">${promoCode}</span> at checkout on your billing page.</p>
      </div>`
      : '';

  return {
    subject: `Your 14-day Pro trial is live — here's what to do first`,
    preheader: 'Full Pro access for 14 days. No credit card required.',
    heading: `Pro access unlocked, ${user.firstName}`,
    body: `
      <p>Hi ${user.firstName}, you now have full Pro access for 14 days — no credit card required.</p>
      ${promoBlock}
      <p>Here's what's unlocked right now:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Voice job logging</strong> — describe a job out loud, we capture every detail.</li>
        <li style="margin-bottom:8px;"><strong>One-tap invoices</strong> — generate a professional PDF in seconds.</li>
        <li style="margin-bottom:8px;"><strong>Customer management</strong> — full contact history in one place.</li>
        <li style="margin-bottom:8px;"><strong>Public booking page</strong> — let customers request jobs directly.</li>
      </ul>
      <p style="color:#666;font-size:13px;">No surprise charges — ever. We'll remind you a few days before your trial ends.</p>
    `,
    ctaText: 'Go to Billing →',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function promoEndingTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  const promoCode = process.env.PROMO_CODE;
  const promoDescription = process.env.PROMO_CODE_DESCRIPTION;

  const promoBlock =
    promoCode && promoDescription
      ? `
      <div style="background:#EFF6FF;border:2px solid #1E90FF;border-radius:10px;padding:16px 18px;margin:18px 0;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1E3A8A;">Your offer is still available</p>
        <p style="margin:0 0 8px;color:#1E40AF;">${promoDescription}</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1E3A8A;">Use code <span style="background:#fff;border:1px solid #93C5FD;border-radius:4px;padding:2px 8px;font-family:monospace;">${promoCode}</span> at checkout — enter it in the "Add promotion code" field.</p>
      </div>`
      : '';

  return {
    subject: `${user.firstName}, your VerityFlow trial is halfway through`,
    preheader: 'Your data is all here — upgrade before your trial ends.',
    heading: 'Trial update',
    body: `
      <p>Hi ${user.firstName}, just checking in — your VerityFlow trial is still active.</p>
      ${promoBlock}
      <p>When your trial ends, choose a plan to keep going:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Annual — $290/yr</strong> ($24/mo, save 20%)</li>
        <li style="margin-bottom:8px;"><strong>Monthly — $29/mo</strong>, cancel any time</li>
      </ul>
      <p style="color:#666;font-size:13px;">Your data is safe either way — everything you've logged stays intact.</p>
    `,
    ctaText: 'Upgrade Now →',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'trialReminders',
    preferenceLabel: 'trial reminder',
  };
}

export function trialMidpointTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  stats: { jobsCount: number; revenue: number }
): TemplateResult {
  const revenueStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats.revenue);
  const hasActivity = stats.jobsCount > 0 || stats.revenue > 0;

  const statsBlurb = hasActivity
    ? `<p style="background:#f0f8ff;border:1px solid #1E90FF;border-radius:8px;padding:14px 16px;margin:16px 0;color:#555;">
        You've already logged <strong>${stats.jobsCount} job${stats.jobsCount !== 1 ? 's' : ''}</strong> and tracked <strong>${revenueStr}</strong> in revenue. That's real money VerityFlow is helping you collect.
       </p>`
    : `<p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:16px 0;">
        You haven't logged a job yet — try tapping the mic from your dashboard and describe your last job. Takes 30 seconds.
       </p>`;

  return {
    subject: `7 days in — here's your VerityFlow progress`,
    preheader: hasActivity
      ? `${stats.jobsCount} jobs logged. Keep the momentum going.`
      : 'Log your first job — it takes 30 seconds.',
    heading: 'Halfway through your trial',
    body: `
      <p>Hi ${user.firstName}, you're 7 days into your VerityFlow trial — 7 days left.</p>
      ${statsBlurb}
      <p>When your trial ends, choose annual for <strong>$24/mo</strong> (billed $290/yr) and save $58 vs monthly. Or go monthly at $29/mo — no lock-in either way.</p>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
    userId: String(user._id),
    preferenceKey: 'trialReminders',
    preferenceLabel: 'trial reminder',
  };
}

export function firstInvoicePaidTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  invoice: Pick<IInvoice, '_id' | 'invoiceNumber' | 'total'>,
  customerName: string
): TemplateResult {
  const totalStr = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(invoice.total);
  return {
    subject: `Invoice paid — VerityFlow just paid for itself`,
    preheader: `${totalStr} collected. Lock in annual and save $58/yr.`,
    heading: `${totalStr} collected`,
    body: `
      <p>Hi ${user.firstName}, great news — <strong>${customerName}</strong> just paid invoice #${invoice.invoiceNumber} for <strong>${totalStr}</strong>.</p>
      <p>That means VerityFlow has already more than paid for itself for the year on the annual plan. Every invoice from here is pure value.</p>
      <p>If you're not on Pro yet, now's the best time — lock in annual at <strong>$24/mo</strong> and save 20% vs monthly.</p>
    `,
    ctaText: 'Upgrade to Annual — Save 20%',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'invoicePaid',
    preferenceLabel: 'invoice notification',
  };
}

export function winBackTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>
): TemplateResult {
  return {
    subject: `${user.firstName}, come back — 50% off your first month`,
    preheader: 'Your data is still here. Reactivate at half price.',
    heading: "We'd love to have you back",
    body: `
      <p>Hi ${user.firstName}, it's been a month since your VerityFlow subscription ended.</p>
      <p><strong>Your data is still safe</strong> — every job, invoice, and customer is right where you left it.</p>
      <p>We'd love to have you back. Use this exclusive offer: <strong>50% off your first month</strong> when you reactivate today.</p>
      <p style="background:#f0f8ff;border:1px solid #1E90FF;border-radius:8px;padding:14px 16px;margin:16px 0;text-align:center;">
        <strong style="font-size:18px;color:#050912;">50% off month 1</strong><br>
        <span style="color:#555;font-size:13px;">Use code applied automatically at checkout</span>
      </p>
      <p style="color:#666;font-size:13px;">This offer expires in 7 days. After that, standard pricing applies.</p>
    `,
    ctaText: 'Reactivate — 50% Off',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'account notification',
  };
}

export function dunningEscalationTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  graceDaysLeft: number
): TemplateResult {
  return {
    subject: `Final notice — VerityFlow Pro suspends in ${graceDaysLeft} day${graceDaysLeft !== 1 ? 's' : ''}`,
    preheader: 'Update your payment method now to avoid losing access.',
    heading: 'Action required: payment still failing',
    body: `
      <p>Hi ${user.firstName}, we've tried to collect your VerityFlow Pro payment several times without success.</p>
      <p><strong>Your account will be suspended in ${graceDaysLeft} day${graceDaysLeft !== 1 ? 's' : ''}</strong> unless you update your payment method.</p>
      <p>This takes less than a minute — click below to update your card and restore uninterrupted access.</p>
      <p style="color:#888;font-size:13px;">Once your account is suspended, you'll lose access to job logging, invoicing, and your booking page. Your data remains safe.</p>
    `,
    ctaText: 'Update Payment Method',
    ctaUrl: `${APP_URL}/settings/billing`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'account notification',
  };
}

// ── Contact / feedback emails ────────────────────────────────────────────────

type ContactType =
  | 'feature_request'
  | 'bug_report'
  | 'feedback'
  | 'support'
  | 'partnership'
  | 'other';

const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  feature_request: 'feature request',
  bug_report: 'bug report',
  feedback: 'feedback',
  support: 'support request',
  partnership: 'partnership inquiry',
  other: 'message',
};

export function contactConfirmationTemplate(
  user: { email: string; firstName: string },
  type: ContactType,
  snapshot: { title?: string; description: string }
): TemplateResult {
  const subjectMap: Record<ContactType, string> = {
    feature_request: 'We got your feature request 💡',
    bug_report: 'Bug report received — we\'re on it',
    feedback: 'Thanks for the feedback',
    support: 'We received your support request',
    partnership: 'Message received',
    other: 'Message received',
  };

  const bodyMap: Record<ContactType, string> = {
    feature_request: `<p>We appreciate you taking the time to share your idea. We'll review it and add it to our roadmap if it's a strong fit.</p>`,
    bug_report: `<p>Our team is on it. We'll let you know as soon as it's been investigated and resolved.</p>`,
    feedback: `<p>Every word matters. Honest feedback is how we build something genuinely useful — thank you.</p>`,
    support: `<p>We'll get back to you within 24 hours during business hours. If it's urgent, feel free to send a follow-up.</p>`,
    partnership: `<p>Thanks for reaching out. We'll review your message and get back to you soon.</p>`,
    other: `<p>Thanks for reaching out. We'll review your message and get back to you soon.</p>`,
  };

  const submissionLines = [
    snapshot.title ? `<p><strong>Subject:</strong> ${snapshot.title}</p>` : '',
    `<p><strong>Your message:</strong><br/>${snapshot.description.replace(/\n/g, '<br/>')}</p>`,
  ]
    .filter(Boolean)
    .join('');

  return {
    subject: subjectMap[type],
    preheader: 'We typically respond within 24 hours.',
    heading: subjectMap[type],
    body: `
      <p>Hi ${user.firstName || 'there'},</p>
      ${bodyMap[type]}
      <p style="color:#666;font-size:13px;">We typically respond within 24 hours.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
      <p style="color:#888;font-size:13px;"><strong>Your submission for reference:</strong></p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;font-size:13px;color:#555;">
        ${submissionLines}
      </div>
    `,
    ctaText: 'View your submissions',
    ctaUrl: `${APP_URL}/contact/history`,
    preferenceKey: 'productUpdates',
    preferenceLabel: 'account notification',
  };
}

export interface ContactAdminNotificationArgs {
  submissionId: string;
  type: ContactType;
  userFirstName: string;
  userBusinessName: string;
  userEmail: string;
  title?: string;
  description: string;
  problemSolved?: string;
  priority?: string;
  stepsToReproduce?: string;
  willingToPay?: boolean;
  rating?: number;
}

export function contactReplyTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  submission: { _id: string; type: ContactType; title?: string },
  reply: string
): TemplateResult {
  const typeLabel = CONTACT_TYPE_LABEL[submission.type] ?? submission.type;
  return {
    subject: `We replied to your ${typeLabel}`,
    preheader: reply.slice(0, 90),
    heading: `A reply to your ${typeLabel}`,
    body: `
      <p>Hi ${user.firstName || 'there'},</p>
      <p>Our team has replied to your ${typeLabel}${submission.title ? ` "<strong>${submission.title}</strong>"` : ''}:</p>
      <div style="border-left:3px solid #1E90FF;padding:12px 16px;margin:20px 0;background:#f0f8ff;border-radius:0 8px 8px 0;font-size:14px;color:#333;">
        ${reply.replace(/\n/g, '<br/>')}
      </div>
      <p>If you have further questions, feel free to reply to this email or submit a new request.</p>
    `,
    ctaText: 'View your submission',
    ctaUrl: `${APP_URL}/contact/history/${submission._id}`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'account notification',
  };
}

export function featurePlannedTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  submission: { _id: string; title?: string }
): TemplateResult {
  return {
    subject: 'Your idea is on the roadmap! 📋',
    preheader: "We're building what you asked for.",
    heading: "It's on the roadmap! 📋",
    body: `
      <p>Hi ${user.firstName || 'there'},</p>
      <p>Great news — your feature request${submission.title ? ` "<strong>${submission.title}</strong>"` : ''} has been <strong>added to our roadmap</strong>.</p>
      <p>We're working on it. You'll get another notification when it ships. In the meantime, you can view all planned features on the feature board.</p>
    `,
    ctaText: 'View Feature Board',
    ctaUrl: `${APP_URL}/feature-board`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function featureShippedTemplate(
  user: Pick<IUser, '_id' | 'firstName' | 'email'>,
  submission: { _id: string; title?: string }
): TemplateResult {
  return {
    subject: 'We shipped your idea! 🚀',
    preheader: "Something you asked for is now live.",
    heading: "Your idea shipped! 🚀",
    body: `
      <p>Hi ${user.firstName || 'there'},</p>
      <p>We just shipped your feature request${submission.title ? ` "<strong>${submission.title}</strong>"` : ''}. It's now live in VerityFlow!</p>
      <p>Thank you for helping shape the product. Your feedback makes VerityFlow better for every trade business on the platform.</p>
    `,
    ctaText: 'Go to Dashboard',
    ctaUrl: `${APP_URL}/dashboard`,
    userId: String(user._id),
    preferenceKey: 'productUpdates',
    preferenceLabel: 'product update',
  };
}

export function contactAdminNotificationTemplate(
  args: ContactAdminNotificationArgs
): TemplateResult {
  const {
    submissionId,
    type,
    userFirstName,
    userBusinessName,
    userEmail,
    title,
    description,
    problemSolved,
    priority,
    stepsToReproduce,
    willingToPay,
    rating,
  } = args;

  const typeLabel = CONTACT_TYPE_LABEL[type] ?? type;
  const displayName = userFirstName || userEmail;
  const bizSuffix = userBusinessName ? ` (${userBusinessName})` : '';

  const rows = [
    title ? `<tr><td style="padding:6px 0;font-weight:700;width:140px;">Subject</td><td>${title}</td></tr>` : '',
    `<tr><td style="padding:6px 0;font-weight:700;">From</td><td>${displayName}${bizSuffix} &lt;${userEmail}&gt;</td></tr>`,
    `<tr><td style="padding:6px 0;font-weight:700;">Type</td><td>${typeLabel}</td></tr>`,
    priority ? `<tr><td style="padding:6px 0;font-weight:700;">Priority</td><td>${priority}</td></tr>` : '',
    rating ? `<tr><td style="padding:6px 0;font-weight:700;">Rating</td><td>${rating}/5</td></tr>` : '',
    willingToPay ? `<tr><td style="padding:6px 0;font-weight:700;">Would pay extra</td><td>Yes</td></tr>` : '',
    `<tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Description</td><td>${description.replace(/\n/g, '<br/>')}</td></tr>`,
    problemSolved ? `<tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Problem solved</td><td>${problemSolved.replace(/\n/g, '<br/>')}</td></tr>` : '',
    stepsToReproduce ? `<tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Steps to reproduce</td><td>${stepsToReproduce.replace(/\n/g, '<br/>')}</td></tr>` : '',
  ]
    .filter(Boolean)
    .join('');

  return {
    subject: `[VerityFlow] New ${typeLabel} from ${displayName}${bizSuffix}`,
    preheader: title ?? description.slice(0, 80),
    heading: `New ${typeLabel}`,
    body: `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;">
        ${rows}
      </table>
    `,
    ctaText: 'Open in admin',
    ctaUrl: `${APP_URL}/admin/feedback/${submissionId}`,
  };
}
