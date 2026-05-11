import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import { deriveFullName } from '@/lib/utils/customerName';
import { getPlanState } from '@/lib/planState';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  await dbConnect();
  const ownerId = getEOId(session);

  const [raw, dbUser] = await Promise.all([
    Customer.find({ userId: ownerId })
      .sort({ updatedAt: -1 })
      .select(
        '_id firstName lastName businessName phone email address city state jobCount totalBilled createdAt',
      )
      .lean<
        {
          _id: unknown;
          firstName?: string;
          lastName?: string;
          businessName?: string;
          phone?: string;
          email?: string;
          address?: string;
          city?: string;
          state?: string;
          jobCount?: number;
          totalBilled?: number;
          createdAt?: Date;
        }[]
      >(),
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

  const customers = raw.map((c) => ({
    ...c,
    _id: String(c._id),
    fullName: deriveFullName(c),
  }));

  const planState = dbUser ? getPlanState(dbUser as Parameters<typeof getPlanState>[0]) : null;

  return (
    <CustomersClient
      initial={customers}
      isExpired={planState ? !planState.isActive : false}
      totalCount={customers.length}
    />
  );
}
