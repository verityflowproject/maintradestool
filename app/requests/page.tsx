import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import RequestsClient from './RequestsClient';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();

  const requests = await BookingRequest.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <RequestsClient
      initialRequests={requests.map((r) => ({
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
      }))}
    />
  );
}
