import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import { Types } from 'mongoose';
import RequestDetailClient from './RequestDetailClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { requestId: string };
}

export default async function RequestDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  if (!Types.ObjectId.isValid(params.requestId)) notFound();

  await dbConnect();

  const request = await BookingRequest.findOne({
    _id: params.requestId,
    userId: session.user.id,
  }).lean();

  if (!request) notFound();

  return (
    <RequestDetailClient
      request={{
        _id: request._id.toString(),
        name: request.name,
        phone: request.phone,
        email: request.email,
        address: request.address,
        serviceNeeded: request.serviceNeeded,
        preferredDate: request.preferredDate,
        preferredTime: request.preferredTime,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
      }}
    />
  );
}
