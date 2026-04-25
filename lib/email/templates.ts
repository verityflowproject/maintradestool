import type { IUser } from '@/lib/models/User';
import type { IInvoice } from '@/lib/models/Invoice';
import type { SendEmailArgs } from '@/lib/email/sendEmail';
import { APP_URL } from '@/lib/email/resend';

type TemplateResult = Omit<SendEmailArgs, 'to'>;

export function welcomeTemplate(user: Pick<IUser, '_id' | 'firstName' | 'email'>): TemplateResult {
  return {
    subject: `Welcome to TradesBrain, ${user.firstName}!`,
    preheader: 'Your 30-day trial has started. Tap the mic to log your first job.',
    heading: `Welcome, ${user.firstName}!`,
    body: `
      <p>You're all set. Your <strong>30-day free trial</strong> has started.</p>
      <p>Here's how to get started:</p>
      <ol style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Tap the mic</strong> to voice-log your first job — describe what you did and we'll capture the details.</li>
        <li style="margin-bottom:8px;"><strong>Generate an invoice</strong> from any job with one tap.</li>
        <li style="margin-bottom:8px;"><strong>Send it</strong> to your customer by email or SMS.</li>
      </ol>
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
      <p>Great work, ${user.firstName}! You just logged your first job with TradesBrain.</p>
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
    preheader: "You're officially running TradesBrain. Here's how to get paid faster.",
    heading: "First invoice sent!",
    body: `
      <p>Nice one, ${user.firstName}! Your first invoice is on its way.</p>
      <p>You're officially running TradesBrain. A few tips to get paid faster:</p>
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
      <p style="font-size:28px;font-weight:700;color:#07070C;margin:0 0 16px;">${amount}</p>
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

  const revenueStr = stats
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(stats.revenue)
    : null;

  if (daysLeft === 7) {
    subject = 'Your TradesBrain trial ends in 7 days';
    body = `
      <p>Hi ${user.firstName}, your free trial ends in <strong>7 days</strong>.</p>
      <p>After your trial, you'll lose access to:</p>
      <ul style="margin:12px 0;padding-left:20px;">
        <li style="margin-bottom:6px;">Voice job logging with AI</li>
        <li style="margin-bottom:6px;">Instant invoice generation</li>
        <li style="margin-bottom:6px;">Customer management</li>
        <li style="margin-bottom:6px;">Online booking page</li>
      </ul>
      <p>Upgrade now to keep all your data and stay on top of your business.</p>
    `;
  } else if (daysLeft === 3) {
    subject = '3 days left on your TradesBrain trial';
    const statsBlurb =
      stats && (stats.jobsCount > 0 || stats.revenue > 0)
        ? `<p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:16px 0;">
            You've logged <strong>${stats.jobsCount} job${stats.jobsCount !== 1 ? 's' : ''}</strong> and earned <strong>${revenueStr}</strong> — don't lose that momentum.
           </p>`
        : '';
    body = `
      <p>Hi ${user.firstName}, only <strong>3 days left</strong> on your trial — don't let the momentum stop.</p>
      ${statsBlurb}
      <p>Upgrade to TradesBrain Pro for just $29/month and keep everything running smoothly.</p>
    `;
  } else {
    subject = 'Your trial ends tomorrow — upgrade to keep going';
    body = `
      <p>Hi ${user.firstName}, your trial ends <strong>tomorrow</strong>.</p>
      <p>Upgrade now to keep logging jobs, generating invoices, and getting paid faster.</p>
      <p style="color:#666;font-size:13px;">Your data is safe. Everything you've built stays intact when you upgrade — and we'll never delete it.</p>
    `;
  }

  return {
    subject,
    preheader: subject,
    heading: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left on your trial`,
    body,
    ctaText: 'Upgrade to Pro',
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
    subject: 'Your TradesBrain trial has ended',
    preheader: 'Your data is safe. Subscribe any time to continue.',
    heading: 'Trial ended',
    body: `
      <p>Hi ${user.firstName}, your free trial has come to an end.</p>
      <p><strong>Your data is safe.</strong> All your jobs, invoices, and customers are still there — subscribe any time to pick up right where you left off.</p>
      <p>TradesBrain Pro is $29/month. No lock-in, cancel any time.</p>
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
      ? `<p style="background:#fff8ec;border:1px solid #D4AF64;border-radius:8px;padding:12px 16px;margin:16px 0;color:#555;">
          ⚠ You have <strong>${stats.outstandingCount} outstanding invoice${stats.outstandingCount !== 1 ? 's' : ''}</strong> totalling <strong>${outstandingStr}</strong>.
          <a href="${APP_URL}/invoices" style="color:#D4AF64;font-weight:700;"> Follow up →</a>
        </p>`
      : '';

  const topCustomerBlurb = stats.topCustomerName
    ? `<p>⭐ Top customer this week: <strong>${stats.topCustomerName}</strong></p>`
    : '';

  return {
    subject: `Your TradesBrain week — ${dateRange}`,
    preheader: `${stats.jobs} jobs · ${revenueStr} revenue this week.`,
    heading: `Your week: ${dateRange}`,
    body: `
      <p>Hi ${user.firstName}, here's your weekly TradesBrain summary:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#07070C;">${stats.jobs}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Jobs</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#07070C;">${stats.invoices}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Invoices</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:18px;font-weight:700;color:#07070C;">${revenueStr}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">Revenue</div>
          </td>
          <td width="8"></td>
          <td style="text-align:center;padding:12px;background:#f9f9f9;border-radius:8px;width:25%;">
            <div style="font-size:24px;font-weight:700;color:#07070C;">${stats.newCustomers}</div>
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
    subject: 'Your TradesBrain subscription has been cancelled',
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
