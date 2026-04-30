import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import type { IJob } from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import type { IInvoice } from '@/lib/models/Invoice';
import Customer from '@/lib/models/Customer';
import { findOrCreateCustomer } from '@/lib/utils/findOrCreateCustomer';
import { requireCapability } from '@/lib/requirePlan';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.jobId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();
  const job = await Job.findOne({ _id: params.jobId, userId: session.user.id })
    .populate('customerId')
    .lean();

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ job });
}

// ── DELETE /api/jobs/[jobId] ────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Types.ObjectId.isValid(params.jobId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const job = await Job.findOne({ _id: params.jobId, userId: session.user.id })
    .select('invoiceId customerId')
    .lean<{ _id: Types.ObjectId; invoiceId?: Types.ObjectId; customerId?: Types.ObjectId } | null>();

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete associated invoice if present
  if (job.invoiceId) {
    await Invoice.deleteOne({ _id: job.invoiceId, userId: session.user.id });
  }

  await Job.deleteOne({ _id: job._id, userId: session.user.id });

  // Decrement customer job count
  if (job.customerId) {
    await Customer.updateOne(
      { _id: job.customerId, userId: session.user.id },
      { $inc: { jobCount: -1 }, $set: { updatedAt: new Date() } },
    );
  }

  return NextResponse.json({ success: true });
}

// ── PATCH /api/jobs/[jobId] ─────────────────────────────────────────────

interface PartBody {
  name?: string;
  quantity?: number | string;
  unitCost?: number | string;
  markup?: number | string;
}

type InvoiceAction = 'none' | 'reset' | 'updated';

export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.jobId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const gate = await requireCapability(session.user.id, 'canCreateJobs');
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!(body.title as string | undefined)?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  await dbConnect();

  // Load the job as a Mongoose document so pre('save') hook runs
  const job = await Job.findOne({ _id: params.jobId, userId: session.user.id });
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── Invoice guard: block editing paid jobs ──────────────────────────
  let existingInvoice: (IInvoice & { _id: Types.ObjectId }) | null = null;
  if (job.invoiceId) {
    existingInvoice = await Invoice.findOne({
      _id: job.invoiceId,
      userId: session.user.id,
    }).lean<(IInvoice & { _id: Types.ObjectId }) | null>();

    if (existingInvoice?.status === 'paid') {
      return NextResponse.json(
        { error: 'Job is locked: invoice is already paid.' },
        { status: 409 },
      );
    }
  }

  // ── Resolve customer ────────────────────────────────────────────────
  const oldCustomerId = job.customerId ? String(job.customerId) : null;
  let newCustomerId: string | null = (body.customerId as string | null) ?? null;

  if (newCustomerId) {
    if (!Types.ObjectId.isValid(newCustomerId)) {
      newCustomerId = null;
    } else {
      const owned = await Customer.exists({ _id: newCustomerId, userId: session.user.id });
      if (!owned) newCustomerId = null;
    }
  }

  if (!newCustomerId) {
    const resolved = await findOrCreateCustomer(session.user.id, {
      customerName: body.customerName as string | undefined,
      customerPhone: body.customerPhone as string | undefined,
      customerAddress: body.customerAddress as string | undefined,
      customerEmail: body.customerEmail as string | undefined,
    });
    newCustomerId = resolved?.customerId ?? null;
  }

  // Adjust jobCount when customer changes
  if (oldCustomerId !== newCustomerId) {
    if (oldCustomerId) {
      await Customer.updateOne(
        { _id: oldCustomerId, userId: session.user.id },
        { $inc: { jobCount: -1 }, $set: { updatedAt: new Date() } },
      );
    }
    if (newCustomerId) {
      await Customer.updateOne(
        { _id: newCustomerId, userId: session.user.id },
        { $inc: { jobCount: 1 }, $set: { updatedAt: new Date() } },
      );
    }
  }

  // ── Assign fields ────────────────────────────────────────────────────
  job.customerId = newCustomerId ? new Types.ObjectId(newCustomerId) : null;
  job.customerName = (body.customerName as string) ?? job.customerName;
  job.customerPhone = (body.customerPhone as string) ?? job.customerPhone;
  job.customerAddress = (body.customerAddress as string) ?? job.customerAddress;
  job.title = ((body.title as string) ?? job.title).trim();
  job.description = (body.description as string) ?? job.description;
  job.jobType = (body.jobType as IJob['jobType']) ?? job.jobType;
  job.scheduledDate = body.scheduledDate
    ? new Date(body.scheduledDate as string)
    : (body.scheduledDate === '' || body.scheduledDate === null ? null : job.scheduledDate);
  job.scheduledStart = (body.scheduledStart as string | null) ?? job.scheduledStart;
  job.scheduledEnd = (body.scheduledEnd as string | null) ?? job.scheduledEnd;
  job.laborHours = Number(body.laborHours) || 0;
  job.laborRate = Number(body.laborRate) || 0;
  job.parts = ((body.parts as PartBody[]) ?? []).map((p) => ({
    name: p.name ?? '',
    quantity: Number(p.quantity) || 0,
    unitCost: Number(p.unitCost) || 0,
    markup: Number(p.markup) || 0,
    total: 0, // recalculated by pre-save hook
  }));
  job.taxRate = Number(body.taxRate) || 0;
  job.internalNotes = (body.internalNotes as string) ?? job.internalNotes;
  job.voiceTranscript = (body.voiceTranscript as string | null) ?? job.voiceTranscript;
  if (body.aiParsed === true) job.aiParsed = true;

  // Status: allow draft→complete transition; otherwise preserve existing
  const requestedStatus = body.status as string | undefined;
  if (requestedStatus === 'complete' && job.status === 'draft') {
    job.status = 'complete';
    job.completedDate = new Date();
  } else if (requestedStatus === 'draft' && job.status === 'complete') {
    job.status = 'draft';
    job.completedDate = null;
  }
  // 'invoiced' / 'paid' are not directly settable via this route

  // ── Save (triggers pre('save') totals hook) ──────────────────────────
  try {
    await job.save();
  } catch (err) {
    console.error('[PATCH /api/jobs/:id] save error', err);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }

  // ── Invoice resync ───────────────────────────────────────────────────
  let invoiceAction: InvoiceAction = 'none';

  if (existingInvoice) {
    const invStatus = existingInvoice.status;

    if (invStatus === 'draft') {
      // Delete the stale draft; user will regenerate from the invoice page
      await Invoice.deleteOne({ _id: existingInvoice._id });
      const resetJobStatus = job.status === 'invoiced' ? 'complete' : job.status;
      await Job.updateOne(
        { _id: job._id, userId: session.user.id },
        { $set: { invoiceId: null, invoiceNumber: null, status: resetJobStatus, updatedAt: new Date() } },
      );
      invoiceAction = 'reset';
    } else if (invStatus === 'sent' || invStatus === 'overdue') {
      // Update totals + customer fields on the already-sent invoice
      let customerEmail = existingInvoice.customerEmail;
      if (job.customerId) {
        const cust = await Customer.findById(job.customerId)
          .select('email')
          .lean<{ email?: string } | null>();
        customerEmail = cust?.email ?? customerEmail;
      }
      await Invoice.updateOne(
        { _id: existingInvoice._id, userId: session.user.id },
        {
          $set: {
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            customerAddress: job.customerAddress,
            customerEmail,
            subtotal: job.subtotal,
            taxRate: job.taxRate,
            taxTotal: job.taxTotal,
            total: job.total,
            updatedAt: new Date(),
          },
        },
      );
      invoiceAction = 'updated';
    }
  }

  return NextResponse.json({ success: true, jobId: String(job._id), invoiceAction });
}
