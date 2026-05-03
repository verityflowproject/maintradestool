import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import BookingRequest from '@/lib/models/BookingRequest';
import { sendMail, FROM_ADDRESS } from '@/lib/email/gmail';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { getPlanState } from '@/lib/planState';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const ip = getClientIp(req);
  const limit = rateLimit('booking', ip, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    serviceNeeded?: string;
    preferredDate?: string;
    preferredTime?: string;
    message?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { name, phone, serviceNeeded } = body;
  if (!name?.trim() || !phone?.trim() || !serviceNeeded?.trim()) {
    return NextResponse.json(
      { error: 'name, phone, and serviceNeeded are required' },
      { status: 422 },
    );
  }

  await dbConnect();

  const user = await User.findOne({
    bookingSlug: params.slug,
    bookingEnabled: true,
  }).select('_id email firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince');

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ownerState = getPlanState(user);
  if (!ownerState.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const request = await BookingRequest.create({
    userId: user._id,
    name: name.trim(),
    phone: phone.trim(),
    email: body.email?.trim() ?? '',
    address: body.address?.trim() ?? '',
    serviceNeeded: serviceNeeded.trim(),
    preferredDate: body.preferredDate ?? '',
    preferredTime: body.preferredTime ?? '',
    message: body.message?.trim() ?? '',
  });

  // Send notification email to tradesperson (gated on preference)
  if (user.email && user.notifications?.newBookingRequest !== false) {
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://verityflow.io';
    const acceptLink = `${origin}/requests/${request._id}`;

    const preferredInfo = [
      body.preferredDate ? `Date: ${body.preferredDate}` : '',
      body.preferredTime ? `Time: ${body.preferredTime}` : '',
    ]
      .filter(Boolean)
      .join('<br/>');

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0d0d14;color:#e2e2e8;padding:32px;border-radius:12px;">
        <h2 style="color:#c8b4fa;margin-top:0;">New job request from ${name}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#9898aa;width:140px;">Name</td><td style="padding:6px 0;">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#9898aa;">Phone</td><td style="padding:6px 0;">${phone}</td></tr>
          ${body.email ? `<tr><td style="padding:6px 0;color:#9898aa;">Email</td><td style="padding:6px 0;">${body.email}</td></tr>` : ''}
          ${body.address ? `<tr><td style="padding:6px 0;color:#9898aa;">Address</td><td style="padding:6px 0;">${body.address}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#9898aa;vertical-align:top;">Needs</td><td style="padding:6px 0;">${serviceNeeded}</td></tr>
          ${preferredInfo ? `<tr><td style="padding:6px 0;color:#9898aa;vertical-align:top;">Preferred</td><td style="padding:6px 0;">${preferredInfo}</td></tr>` : ''}
          ${body.message ? `<tr><td style="padding:6px 0;color:#9898aa;vertical-align:top;">Notes</td><td style="padding:6px 0;">${body.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:28px;">
          <a href="${acceptLink}" style="display:inline-block;background:#c8b4fa;color:#07070c;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Accept Request</a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#5a5a6e;">This request was submitted through your VerityFlow booking page.</p>
      </div>
    `;

    await sendMail({
      from: FROM_ADDRESS,
      to: user.email,
      subject: `New job request from ${name} — VerityFlow`,
      html,
    });
  }

  return NextResponse.json({ success: true });
}
