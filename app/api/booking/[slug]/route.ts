import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import type { IUser } from '@/lib/models/User';
import type { Types } from 'mongoose';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  await dbConnect();

  const user = await User.findOne({
    bookingSlug: params.slug,
    bookingEnabled: true,
  })
    .select(
      'firstName businessName trade phone email bookingProfile',
    )
    .lean<
      Pick<IUser, 'firstName' | 'businessName' | 'trade' | 'phone' | 'email' | 'bookingProfile'> & {
        _id: Types.ObjectId;
      }
    >();

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profile = user.bookingProfile;

  return NextResponse.json({
    firstName: user.firstName,
    businessName: user.businessName,
    trade: user.trade,
    bookingProfile: {
      headline: profile?.headline ?? '',
      bio: profile?.bio ?? '',
      services: profile?.services ?? [],
      serviceArea: profile?.serviceArea ?? '',
      responseTime: profile?.responseTime ?? '',
      showPhone: profile?.showPhone ?? false,
      showEmail: profile?.showEmail ?? false,
    },
    phone: profile?.showPhone ? (user.phone ?? null) : null,
    email: profile?.showEmail ? (user.email ?? null) : null,
  });
}
