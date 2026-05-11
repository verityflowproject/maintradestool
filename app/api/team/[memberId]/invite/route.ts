import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';
import { sendEmail } from '@/lib/email/sendEmail';
import { teamInviteAcceptTemplate } from '@/lib/email/templates';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const INVITE_TTL_DAYS = 7;

export async function POST(
  req: Request,
  { params }: { params: { memberId: string } },
) {
  const ip = getClientIp(req);
  const limit = rateLimit('invite-send', ip, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const session = await auth();
  const perm = requirePerm(session, 'write', 'team');
  if (!perm.ok) return perm.response;

  if (!Types.ObjectId.isValid(params.memberId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const member = await TeamMember.findOne({
    _id: params.memberId,
    ownerUserId: effectiveOwnerId(session!),
  });
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!member.email) {
    return NextResponse.json(
      { error: 'Member has no email on file' },
      { status: 400 },
    );
  }

  if (member.linkedUserId) {
    return NextResponse.json(
      { error: 'Member already has a login' },
      { status: 409 },
    );
  }

  // Refuse if this email already belongs to a VerityFlow User account
  const existing = await User.findOne({ email: member.email }).select('_id').lean();
  if (existing) {
    return NextResponse.json(
      {
        error: 'email_in_use',
        message:
          'This email is already registered. Ask the person to delete their account or use a different email.',
      },
      { status: 409 },
    );
  }

  // Generate token: store the bcrypt hash, send the plaintext in the link
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = await bcrypt.hash(raw, 10);
  member.inviteTokenHash = hash;
  member.inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  member.inviteSentAt = new Date();
  await member.save();

  const owner = await User.findById(session!.user.id)
    .select('firstName businessName')
    .lean<{ firstName: string; businessName: string } | null>();

  if (owner) {
    await sendEmail({
      to: member.email,
      ...teamInviteAcceptTemplate(owner, member.name, raw, String(member._id)),
    });
  }

  return NextResponse.json({ ok: true });
}
