import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import type { IInvoice } from '@/lib/models/Invoice';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { invoicePaidTemplate, firstInvoicePaidTemplate } from '@/lib/email/templates';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

type AllowedStatus = 'draft' | 'sent' | 'paid' | 'overdue';
const ALLOWED: AllowedStatus[] = ['draft', 'sent', 'paid', 'overdue'];

export async function PATCH(
  req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'invoice');
  if (!perm.ok) return perm.response;

  if (!Types.ObjectId.isValid(params.invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    paidDate?: string;
  } | null;

  if (!body?.status || !ALLOWED.includes(body.status as AllowedStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const newStatus = body.status as AllowedStatus;

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const invoice = await Invoice.findOne({
    _id: params.invoiceId,
    userId: ownerId,
  }).lean<(IInvoice & { _id: Types.ObjectId }) | null>();

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const wasAlreadyPaid = invoice.status === 'paid';
  const transitioningToPaid = newStatus === 'paid' && !wasAlreadyPaid;

  // Build the update
  const updateFields: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'paid') {
    updateFields.paidDate = body.paidDate ? new Date(body.paidDate) : new Date();
  }

  await Invoice.updateOne(
    { _id: invoice._id, userId: ownerId },
    { $set: updateFields },
  );

  // Side-effects only when first transitioning to paid
  if (transitioningToPaid) {
    await Job.updateOne(
      { _id: invoice.jobId, userId: ownerId },
      { $set: { status: 'paid', updatedAt: new Date() } },
    );

    if (invoice.customerId) {
      await Customer.updateOne(
        { _id: invoice.customerId, userId: ownerId },
        { $inc: { totalBilled: invoice.total } },
      );
    }
  }

  // Invoice paid notification + first-paid milestone email (always to the owner, not the member)
  if (transitioningToPaid) {
    const paidUser = await User.findById(ownerId);
    if (paidUser) {
      sendEmail({
        to: paidUser.email,
        ...invoicePaidTemplate(paidUser, invoice, invoice.customerName || 'Customer'),
      }).catch(console.error);

      if (!paidUser.firstInvoicePaidSent) {
        paidUser.firstInvoicePaidSent = true;
        await paidUser.save();
        sendEmail({
          to: paidUser.email,
          ...firstInvoicePaidTemplate(paidUser, invoice, invoice.customerName || 'Customer'),
        }).catch(console.error);
      }
    }
  }

  const updated = await Invoice.findById(invoice._id).lean();
  return NextResponse.json({ success: true, invoice: updated });
}
