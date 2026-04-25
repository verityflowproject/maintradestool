import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { deriveFullName } from '@/lib/utils/customerName';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();

  const raw = await Customer.find({ userId: session.user.id })
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
    >();

  const customers = raw.map((c) => ({
    ...c,
    _id: String(c._id),
    fullName: deriveFullName(c),
  }));

  return <CustomersClient initial={customers} />;
}
