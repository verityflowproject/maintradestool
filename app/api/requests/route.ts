import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'booking');
  if (!perm.ok) return perm.response;

  await dbConnect();

  const requests = await BookingRequest.find({ userId: effectiveOwnerId(session!) })
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
