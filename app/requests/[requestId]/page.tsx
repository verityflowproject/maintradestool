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
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'read', 'booking');
  if (!perm.ok) redirect('/dashboard');

  if (!Types.ObjectId.isValid(params.requestId)) notFound();

  await dbConnect();
  const ownerId = getEOId(session);

  const request = await BookingRequest.findOne({
    _id: params.requestId,
    userId: ownerId,
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
        linkedJobId: request.linkedJobId ? request.linkedJobId.toString() : null,
        createdAt: request.createdAt.toISOString(),
      }}
    />
  );
}
