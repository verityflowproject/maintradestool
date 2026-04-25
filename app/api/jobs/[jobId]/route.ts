import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import Customer from '@/lib/models/Customer';

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
    .lean<{ _id: unknown; invoiceId?: unknown; customerId?: unknown } | null>();

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
