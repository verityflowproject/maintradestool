import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import type { IBookingProfile } from '@/lib/models/User';
import { generateBookingSlug } from '@/lib/utils/bookingSlug';
import { requireCapability } from '@/lib/requirePlan';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    bookingEnabled?: boolean;
    bookingSlug?: string | null;
    phone?: string | null;
    bookingProfile?: Partial<IBookingProfile>;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // Gate enabling the booking page (disabling and profile edits stay allowed)
  if (body.bookingEnabled === true) {
    const gate = await requireCapability(session.user.id, 'canEnableBooking');
    if (!gate.ok) return gate.response;
  }

  await dbConnect();

  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Handle enable toggle
  if (typeof body.bookingEnabled === 'boolean') {
    user.bookingEnabled = body.bookingEnabled;
    // Generate slug on first enable
    if (body.bookingEnabled && !user.bookingSlug) {
      user.bookingSlug = await generateBookingSlug(user.businessName);
    }
  }

  // Handle explicit slug update
  if ('bookingSlug' in body && body.bookingSlug) {
    const slug = body.bookingSlug.toLowerCase().trim();
    // Check uniqueness (allow own slug)
    const conflict = await User.exists({
      bookingSlug: slug,
      _id: { $ne: user._id },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }
    user.bookingSlug = slug;
  }

  // Handle phone
  if ('phone' in body) {
    user.phone = body.phone ?? null;
  }

  // Handle profile fields
  if (body.bookingProfile) {
    const p = body.bookingProfile;
    if (p.headline !== undefined) user.bookingProfile.headline = p.headline;
    if (p.bio !== undefined) user.bookingProfile.bio = p.bio;
    if (p.services !== undefined) user.bookingProfile.services = p.services;
    if (p.serviceArea !== undefined) user.bookingProfile.serviceArea = p.serviceArea;
    if (p.responseTime !== undefined) user.bookingProfile.responseTime = p.responseTime;
    if (p.showPhone !== undefined) user.bookingProfile.showPhone = p.showPhone;
    if (p.showEmail !== undefined) user.bookingProfile.showEmail = p.showEmail;
  }

  await user.save();

  return NextResponse.json({ success: true, slug: user.bookingSlug });
}
