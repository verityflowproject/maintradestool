import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { Resend } from 'resend';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import type { IInvoice } from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const runtime = 'nodejs';

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(d: Date | string) {
  return DATE_FMT.format(new Date(d));
}

function buildReminderEmailHtml(
  invoice: IInvoice & { _id: Types.ObjectId },
  business: { name: string },
): string {
  const lineItemRows = invoice.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#333;border-bottom:1px solid #eee;">${li.description}</td>
        <td style="padding:8px 12px;font-size:13px;color:#555;text-align:right;border-bottom:1px solid #eee;">${li.quantity}</td>
        <td style="padding:8px 12px;font-size:13px;color:#555;text-align:right;border-bottom:1px solid #eee;">${formatCurrency(li.unitPrice)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#333;font-weight:600;text-align:right;border-bottom:1px solid #eee;">${formatCurrency(li.total)}</td>
      </tr>`,
    )
    .join('');

  const taxRow =
    invoice.taxRate > 0
      ? `<tr>
           <td colspan="3" style="padding:6px 12px;font-size:13px;color:#555;text-align:right;">Tax (${invoice.taxRate}%)</td>
           <td style="padding:6px 12px;font-size:13px;color:#555;text-align:right;">${formatCurrency(invoice.taxTotal)}</td>
         </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1A1A1A;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;">${business.name}</span>
      <span style="color:#D4AF64;font-size:22px;font-weight:800;letter-spacing:0.05em;">REMINDER</span>
    </div>
    <div style="padding:32px;">
      <p style="color:#444;font-size:15px;margin:0 0 24px;">
        Hi ${invoice.customerName},<br>
        Just a friendly reminder that the following invoice is due.
      </p>
      <table style="width:100%;margin-bottom:24px;font-size:13px;">
        <tr>
          <td style="color:#999;padding:2px 0;">Invoice Number</td>
          <td style="color:#1A1A1A;font-weight:600;text-align:right;">${invoice.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="color:#999;padding:2px 0;">Date</td>
          <td style="color:#1A1A1A;text-align:right;">${formatDate(invoice.createdAt)}</td>
        </tr>
        <tr>
          <td style="color:#999;padding:2px 0;">Due Date</td>
          <td style="color:#1A1A1A;text-align:right;">${formatDate(invoice.dueDate)}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:8px 12px;font-size:11px;color:#999;text-align:left;text-transform:uppercase;letter-spacing:0.08em;">Description</th>
            <th style="padding:8px 12px;font-size:11px;color:#999;text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
            <th style="padding:8px 12px;font-size:11px;color:#999;text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Unit Price</th>
            <th style="padding:8px 12px;font-size:11px;color:#999;text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows}
          <tr>
            <td colspan="3" style="padding:8px 12px;font-size:13px;color:#555;text-align:right;border-top:1px solid #eee;">Subtotal</td>
            <td style="padding:8px 12px;font-size:13px;color:#333;text-align:right;border-top:1px solid #eee;">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          ${taxRow}
        </tbody>
      </table>
      <div style="text-align:right;margin-bottom:28px;">
        <span style="font-size:13px;color:#555;margin-right:16px;">Total Due</span>
        <span style="font-size:22px;font-weight:700;color:#D4AF64;">${formatCurrency(invoice.total)}</span>
      </div>
      <p style="font-size:13px;color:#666;">Due by <strong>${formatDate(invoice.dueDate)}</strong>. Please don't hesitate to reach out if you have any questions.</p>
    </div>
    <div style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">${business.name}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(
  req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: params.invoiceId,
    userId: session.user.id,
  }).lean<(IInvoice & { _id: Types.ObjectId }) | null>();

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const user = await User.findById(session.user.id)
    .select('businessName region')
    .lean<{ businessName: string; region: string } | null>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const business = { name: user.businessName, region: user.region };

  // Mark reminderSentAt regardless of method
  await Invoice.updateOne(
    { _id: invoice._id, userId: session.user.id },
    { $set: { reminderSentAt: new Date() } },
  );

  // Try email path
  if (invoice.deliveryMethod === 'email' && invoice.customerEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: `${user.businessName} <onboarding@resend.dev>`,
        to: invoice.customerEmail,
        subject: `Friendly reminder: Invoice ${invoice.invoiceNumber} is due ${formatDate(invoice.dueDate)}`,
        html: buildReminderEmailHtml(invoice, business),
      });
    } catch (err) {
      console.error('[remind] Resend error', err);
      return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, method: 'email' });
  }

  // SMS / no-email path — return a public link
  const origin = new URL(req.url).origin;
  const publicLink = `${origin}/invoice/${encodeURIComponent(invoice.invoiceNumber)}`;

  return NextResponse.json({ success: true, method: 'link', publicLink });
}
