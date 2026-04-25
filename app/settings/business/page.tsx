import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import BusinessSettingsClient from './BusinessSettingsClient';

export default async function BusinessSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('businessName region phone businessEmail')
    .lean();

  if (!user) redirect('/');

  return (
    <BusinessSettingsClient
      initialBusinessName={user.businessName}
      initialRegion={user.region}
      initialPhone={user.phone ?? ''}
      initialBusinessEmail={user.businessEmail ?? ''}
    />
  );
}
