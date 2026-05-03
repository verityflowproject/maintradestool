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

  await dbConnect();

  const [requests, dbUser] = await Promise.all([
    BookingRequest.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean(),
    User.findById(session.user.id)
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
