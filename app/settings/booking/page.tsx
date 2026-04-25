import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import BookingSettingsClient from './BookingSettingsClient';

export default async function BookingSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select('bookingSlug bookingEnabled bookingProfile phone email')
    .lean();

  if (!user) redirect('/');

  return (
    <BookingSettingsClient
      initialSlug={user.bookingSlug ?? null}
      initialEnabled={user.bookingEnabled ?? false}
      initialPhone={user.phone ?? ''}
      initialEmail={user.email ?? ''}
      initialProfile={{
        headline: user.bookingProfile?.headline ?? '',
        bio: user.bookingProfile?.bio ?? '',
        services: user.bookingProfile?.services ?? [],
        serviceArea: user.bookingProfile?.serviceArea ?? '',
        responseTime: user.bookingProfile?.responseTime ?? '',
        showPhone: user.bookingProfile?.showPhone ?? false,
        showEmail: user.bookingProfile?.showEmail ?? false,
      }}
    />
  );
}
