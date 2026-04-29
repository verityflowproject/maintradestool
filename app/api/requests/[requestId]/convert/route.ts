import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import { findOrCreateCustomer } from '@/lib/utils/findOrCreateCustomer';

export const runtime = 'nodejs';

// Time-of-day → rough start time mapping for preferredTime strings
const PREFERRED_TIME_MAP: Record<string, string> = {
  'Morning (8am–12pm)': '08:00',
  'Afternoon (12pm–5pm)': '12:00',
  'Evening (5pm–8pm)': '17:00',
  Flexible: '',
};

export async function POST(
  _req: Request,
  { params }: { params: { requestId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.requestId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await dbConnect();

  const request = await BookingRequest.findOne({
    _id: params.requestId,
    userId: session.user.id,
  });

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (request.status === 'converted' && request.linkedJobId) {
    return NextResponse.json({ jobId: String(request.linkedJobId) });
  }

  // Find or create customer
  const resolved = await findOrCreateCustomer(session.user.id, {
    customerName: request.name,
    customerPhone: request.phone,
    customerAddress: request.address,
    customerEmail: request.email,
  });

  const customerId = resolved?.customerId ?? null;

  // Parse preferred date into a Date object (YYYY-MM-DD → Date)
  let scheduledDate: Date | null = null;
  if (request.preferredDate) {
    const parsed = new Date(request.preferredDate);
    if (!isNaN(parsed.getTime())) scheduledDate = parsed;
  }

  // Map preferredTime string to a clock time string
  const scheduledStart = request.preferredTime
    ? (PREFERRED_TIME_MAP[request.preferredTime] ?? '')
    : '';

  // Create the draft job
  const job = await Job.create({
    userId: session.user.id,
    customerId: customerId || null,
    customerName: request.name,
    customerPhone: request.phone,
    customerAddress: request.address,
    title: request.serviceNeeded.slice(0, 120),
    description: request.message ?? '',
    jobType: 'residential',
    status: 'draft',
    scheduledDate,
    scheduledStart: scheduledStart || null,
    scheduledEnd: null,
    laborHours: 0,
    laborRate: 0,
    parts: [],
    taxRate: 0,
    bookingRequestId: request._id,
  });

  // Increment customer job count
  if (customerId) {
    await Customer.updateOne(
      { _id: customerId, userId: session.user.id },
      { $inc: { jobCount: 1 }, $set: { updatedAt: new Date() } },
    );
  }

  // Link the request to the new job and mark it converted
  request.status = 'converted';
  request.linkedJobId = job._id;
  await request.save();

  return NextResponse.json({ jobId: String(job._id) }, { status: 201 });
}
