import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { TRADES } from '@/lib/constants';
import PublicBookingClient from './PublicBookingClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

export default async function BookingPage({ params }: Props) {
  await dbConnect();

  const user = await User.findOne({
    bookingSlug: params.slug,
    bookingEnabled: true,
  })
    .select('firstName businessName trade phone email bookingProfile')
    .lean();

  if (!user) notFound();

  const profile = user.bookingProfile;
  const trade = TRADES.find((t) => t.id === user.trade);

  return (
    <PublicBookingClient
      slug={params.slug}
      firstName={user.firstName}
      businessName={user.businessName}
      tradeEmoji={trade?.emoji ?? '🛠️'}
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
