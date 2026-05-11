import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import BookingRequest from '@/lib/models/BookingRequest';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import RequestsClient from './RequestsClient';

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  // Booking requests: owner and manager only per permission matrix
  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'read', 'booking');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);

  const [requests, dbUser] = await Promise.all([
    BookingRequest.find({ userId: ownerId })
      .sort({ createdAt: -1 })
      .lean(),
    User.findById(ownerId)
      .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince')
      .lean<{
        plan: string;
        trialEndsAt?: Date;
        subscriptionStatus?: string | null;
        subscriptionEndsAt?: Date | null;
        pastDueSince?: Date | null;
      }>(),
  ]);

  const planState = dbUser ? getPlanState(dbUser as Parameters<typeof getPlanState>[0]) : null;

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
      isExpired={planState ? !planState.isActive : false}
      totalCount={requests.length}
    />
  );
}
