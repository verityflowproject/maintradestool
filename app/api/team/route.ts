import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import { isTeamSize } from '@/lib/team/hasTeam';
import User from '@/lib/models/User';
import { requireCapability } from '@/lib/requirePlan';
import { sendEmail } from '@/lib/email/sendEmail';
import { teamInviteTemplate } from '@/lib/email/templates';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

async function assertTeamAccount(userId: string): Promise<boolean> {
  await dbConnect();
  const u = await User.findById(userId).select('teamSize').lean<{ teamSize: string } | null>();
  return isTeamSize(u?.teamSize);
}

export async function GET() {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'team');
  if (!perm.ok) return perm.response;

  const ownerId = effectiveOwnerId(session!);
  // UX guard: solo accounts still get 403 from assertTeamAccount for non-owner+manager
  if (session!.user.accountType === 'owner' && !(await assertTeamAccount(session!.user.id))) {
    return NextResponse.json({ error: 'Team features require a team account size.' }, { status: 403 });
  }

  await dbConnect();
  const members = await TeamMember.find({ ownerUserId: ownerId })
    .sort({ active: -1, createdAt: 1 })
    .lean();

  return NextResponse.json({
    members: members.map((m) => ({
      ...m,
      _id: String(m._id),
      ownerUserId: String(m.ownerUserId),
      linkedUserId: m.linkedUserId ? String(m.linkedUserId) : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'team');
  if (!perm.ok) return perm.response;

  const ownerId = effectiveOwnerId(session!);
  if (session!.user.accountType === 'owner' && !(await assertTeamAccount(session!.user.id))) {
    return NextResponse.json({ error: 'Team features require a team account size.' }, { status: 403 });
  }
  const gate = await requireCapability(session!.user.id, 'canCreateJobs');
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  await dbConnect();
  const member = await TeamMember.create({
    ownerUserId: ownerId,
    name,
    email: String(body?.email ?? '').trim().toLowerCase(),
    phone: String(body?.phone ?? '').trim(),
    role: (body?.role as string) || 'tech',
    hourlyRate: body?.hourlyRate == null || body?.hourlyRate === '' ? null : Number(body.hourlyRate),
    color: (body?.color as string) || '#4A9EFF',
    notes: String(body?.notes ?? ''),
    active: true,
  });

  // Optional invite email
  if (body?.sendInvite === true && member.email) {
    try {
      const owner = await User.findById(ownerId)
        .select('firstName businessName')
        .lean<{ firstName: string; businessName: string } | null>();
      if (owner) {
        await sendEmail({ to: member.email, ...teamInviteTemplate(owner, member.name) });
        await TeamMember.updateOne({ _id: member._id }, { $set: { inviteSentAt: new Date() } });
      }
    } catch (err) {
      console.error('[POST /api/team] invite email failed (non-fatal)', err);
    }
  }

  return NextResponse.json({ memberId: String(member._id) }, { status: 201 });
}
