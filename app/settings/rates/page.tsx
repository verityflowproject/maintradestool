import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import RatesSettingsClient from './RatesSettingsClient';

export default async function RatesSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('hourlyRate partsMarkup defaultTaxRate')
    .lean();

  if (!user) redirect('/');

  return (
    <RatesSettingsClient
      initialHourlyRate={user.hourlyRate}
      initialPartsMarkup={user.partsMarkup}
      initialDefaultTaxRate={user.defaultTaxRate ?? 0}
    />
  );
}
