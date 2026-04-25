import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const requests = await BookingRequest.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    requests: requests.map((r) => ({
      _id: r._id.toString(),
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      serviceNeeded: r.serviceNeeded,
      preferredDate: r.preferredDate,
      preferredTime: r.preferredTime,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
