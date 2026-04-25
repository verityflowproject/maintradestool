import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { Resend } from 'resend';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import type { IInvoice } from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import { renderInvoicePdf } from '@/lib/pdf/renderInvoicePdf';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { requireCapability } from '@/lib/requirePlan';
import { sendEmail } from '@/lib/email/sendEmail';
import { firstInvoiceSentTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── Email HTML template ────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(d: Date | string) {
  return DATE_FMT.format(new Date(d));
}

function buildInvoiceEmailHtml(
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
    <!-- Header -->
    <div style="background:#1A1A1A;padding:28px 32px;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;">${business.name}</span>
      <span style="color:#D4AF64;font-size:22px;font-weight:800;letter-spacing:0.05em;">INVOICE</span>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#444;font-size:15px;margin:0 0 24px;">
        Hi ${invoice.customerName},<br>
        Please find your invoice attached. A summary is included below for your reference.
      </p>

      <!-- Invoice meta -->
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

      <!-- Line items -->
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

      <!-- Total -->
      <div style="text-align:right;margin-bottom:28px;">
        <span style="font-size:13px;color:#555;margin-right:16px;">Total Due</span>
        <span style="font-size:22px;font-weight:700;color:#D4AF64;">${formatCurrency(invoice.total)}</span>
      </div>

      <p style="font-size:13px;color:#666;">Due by <strong>${formatDate(invoice.dueDate)}</strong>. Please don't hesitate to reach out if you have any questions.</p>
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">${business.name}</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireCapability(session.user.id, 'canGenerateInvoices');
  if (!gate.ok) return gate.response;

  if (!Types.ObjectId.isValid(params.invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  if (!body?.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
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

  // Render PDF attachment
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderInvoicePdf(invoice, business);
  } catch (err) {
    console.error('[send/email] PDF render error', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }

  // Send via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: `${user.businessName} <onboarding@resend.dev>`,
      to: body.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${user.businessName}`,
      html: buildInvoiceEmailHtml(invoice, business),
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  } catch (err) {
    console.error('[send/email] Resend error', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // Flip status to sent (skip if already paid)
  if (invoice.status !== 'paid') {
    await Invoice.updateOne(
      { _id: invoice._id, userId: session.user.id },
      { $set: { status: 'sent', sentAt: new Date(), deliveryMethod: 'email' } },
    );
  }

  // First invoice sent email
  const sentCount = await Invoice.countDocuments({
    userId: session.user.id,
    status: { $in: ['sent', 'paid', 'overdue'] },
  });
  if (sentCount === 1) {
    const fullUser = await User.findById(session.user.id).lean();
    if (fullUser) {
      sendEmail({ to: fullUser.email, ...firstInvoiceSentTemplate(fullUser) }).catch(console.error);
    }
  }

  return NextResponse.json({ success: true });
}
