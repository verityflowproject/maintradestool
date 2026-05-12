import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { inviteAcceptedNotificationTemplate } from '@/lib/email/templates';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const PASSWORD_RX = /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,72}$/;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit('invite-accept', ip, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = String(body?.token ?? '').trim();
  const memberId = String(body?.memberId ?? '').trim();
  const firstName = String(body?.firstName ?? '').trim();
  const password = String(body?.password ?? '');

  if (!token || !memberId || !firstName || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!PASSWORD_RX.test(password)) {
    return NextResponse.json(
      { error: 'Password must be 8+ characters with a letter and a number' },
      { status: 400 },
    );
  }
  if (!Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  }

  await dbConnect();

  const member = await TeamMember.findById(memberId);
  if (!member || !member.inviteTokenHash || !member.inviteTokenExpiresAt) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  }
  if (member.inviteTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'This invite has expired. Ask the owner for a fresh invite.' },
      { status: 400 },
    );
  }
  if (member.linkedUserId) {
    return NextResponse.json(
      { error: 'This invite was already accepted.' },
      { status: 409 },
    );
  }

  const valid = await bcrypt.compare(token, member.inviteTokenHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  }

  // Last-chance email collision check
  const exists = await User.findOne({ email: member.email }).select('_id').lean();
  if (exists) {
    return NextResponse.json({ error: 'email_in_use' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    email: member.email,
    password: passwordHash,
    firstName,
    parentOwnerId: member.ownerUserId,
    linkedTeamMemberId: member._id,
    onboardingCompleted: true,
    // Clicking the invite link from their inbox is proof of email ownership
    emailVerified: true,
    emailVerifiedAt: new Date(),
    // owner-only required fields are optional for members (Phase A 1a change)
  });

  member.linkedUserId = newUser._id;
  member.inviteTokenHash = null;
  member.inviteTokenExpiresAt = null;
  member.inviteAcceptedAt = new Date();
  await member.save();

  // Notify owner — fire-and-forget, don't block the response
  User.findById(member.ownerUserId)
    .select('email firstName businessName')
    .lean<{ email: string; firstName: string; businessName: string } | null>()
    .then((owner) => {
      if (owner) {
        sendEmail({
          to: owner.email,
          ...inviteAcceptedNotificationTemplate(owner, member.name),
        }).catch(console.error);
      }
    })
    .catch(console.error);

  return NextResponse.json({ ok: true }, { status: 201 });
}
