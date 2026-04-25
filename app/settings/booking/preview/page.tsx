import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { TRADES } from '@/lib/constants';
import BookingPreviewClient from './BookingPreviewClient';

export const dynamic = 'force-dynamic';

export default async function BookingPreviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select('firstName businessName trade phone email bookingSlug bookingEnabled bookingProfile')
    .lean<{
      firstName: string;
      businessName: string;
      trade: string;
      phone: string | null;
      email: string;
      bookingSlug: string | null;
      bookingEnabled: boolean;
      bookingProfile: {
        headline: string;
        bio: string;
        services: string[];
        serviceArea: string;
        responseTime: string;
        showPhone: boolean;
        showEmail: boolean;
      } | null;
    } | null>();

  if (!user) redirect('/');

  const trade = TRADES.find((t) => t.id === user.trade);
  const profile = user.bookingProfile;

  return (
    <BookingPreviewClient
      firstName={user.firstName}
      businessName={user.businessName}
      tradeEmoji={trade?.emoji ?? '🛠️'}
      slug={user.bookingSlug}
      bookingEnabled={user.bookingEnabled}
      bookingProfile={{
        headline: profile?.headline ?? '',
        bio: profile?.bio ?? '',
        services: profile?.services ?? [],
        serviceArea: profile?.serviceArea ?? '',
        responseTime: profile?.responseTime ?? '',
        showPhone: profile?.showPhone ?? false,
        showEmail: profile?.showEmail ?? false,
      }}
      phone={profile?.showPhone ? (user.phone ?? null) : null}
      email={profile?.showEmail ? (user.email ?? null) : null}
    />
  );
}
