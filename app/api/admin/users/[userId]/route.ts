import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { logAdminAction } from '@/lib/admin/logAdminAction';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import Invoice from '@/lib/models/Invoice';
import BookingRequest from '@/lib/models/BookingRequest';
import AdminActionLog from '@/lib/models/AdminActionLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { userId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return new Response(null, { status: 404 });

  await dbConnect();

  let userId: mongoose.Types.ObjectId;
  try {
    userId = new mongoose.Types.ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [
    jobCount,
    recentJobs,
    customerCount,
    recentCustomers,
    invoiceCount,
    recentInvoices,
    invoiceVolumeByStatus,
    bookingCount,
    recentBookings,
    activityLog,
  ] = await Promise.all([
    Job.countDocuments({ userId }),
    Job.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    Customer.countDocuments({ userId }),
    Customer.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    Invoice.countDocuments({ userId }),
    Invoice.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    Invoice.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    BookingRequest.countDocuments({ userId }),
    BookingRequest.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    AdminActionLog.find({ targetUserId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const totalInvoiceVolume = invoiceVolumeByStatus.reduce(
    (sum: number, r: { _id: string; total: number }) => sum + r.total,
    0
  );

  return NextResponse.json({
    user,
    jobCount,
    recentJobs,
    customerCount,
    recentCustomers,
    invoiceCount,
    recentInvoices,
    invoiceVolumeByStatus,
    totalInvoiceVolume,
    bookingCount,
    recentBookings,
    activityLog,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return new Response(null, { status: 404 });

  await dbConnect();

  let userId: mongoose.Types.ObjectId;
  try {
    userId = new mongoose.Types.ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const body = await req.json() as {
    plan?: string;
    trialEndsAt?: string;
    subscriptionStatus?: string;
    reason?: string;
  };

  const { reason, ...fields } = body;
  const updateFields = fields as Record<string, unknown>;

  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Snapshot before values for the fields being changed
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(updateFields)) {
    before[key] = (user as unknown as Record<string, unknown>)[key];
    after[key] = updateFields[key];
  }

  // Determine action name
  const action = 'trialEndsAt' in updateFields ? 'trial_extend' : 'plan_override';

  await User.findByIdAndUpdate(userId, { $set: updateFields });

  await logAdminAction({
    adminEmail: session.user?.email ?? '',
    action,
    targetUserId: userId,
    targetEmail: (user as { email?: string }).email,
    changes: { before, after },
    reason,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return new Response(null, { status: 404 });

  await dbConnect();

  let userId: mongoose.Types.ObjectId;
  try {
    userId = new mongoose.Types.ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const user = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const targetEmail = (user as { email?: string }).email ?? '';

  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // reason is optional
  }

  await Promise.all([
    Job.deleteMany({ userId }),
    Customer.deleteMany({ userId }),
    Invoice.deleteMany({ userId }),
    BookingRequest.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);

  await logAdminAction({
    adminEmail: session.user?.email ?? '',
    action: 'user_delete',
    targetUserId: userId,
    targetEmail,
    reason: body.reason,
  });

  return NextResponse.json({ success: true });
}
