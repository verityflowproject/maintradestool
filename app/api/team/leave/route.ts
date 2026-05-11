import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';
import { sendEmail } from '@/lib/email/sendEmail';
import { memberLeftTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.accountType !== 'member' || !session.user.memberActive) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const linkedTeamMemberId = session.user.linkedTeamMemberId;
  if (!linkedTeamMemberId) {
    return NextResponse.json({ error: 'No team member record found' }, { status: 400 });
  }

  await dbConnect();

  // Read order matters — capture ownerUserId BEFORE clearing User.parentOwnerId
  const tmDoc = await TeamMember.findById(linkedTeamMemberId)
    .select('ownerUserId name')
    .lean<{ ownerUserId: { toString(): string }; name: string } | null>();

  if (!tmDoc) {
    return NextResponse.json({ error: 'Team member record not found' }, { status: 404 });
  }

  const ownerUserId = String(tmDoc.ownerUserId);
  const memberName = tmDoc.name;

  // Soft-deactivate the team member record and unlink
  await TeamMember.updateOne(
    { _id: linkedTeamMemberId },
    { $set: { active: false, linkedUserId: null, archived: true } },
  );

  // Reset the member User to a fresh owner trial
  await User.updateOne(
    { _id: session.user.id },
    {
      $set: {
        parentOwnerId: null,
        linkedTeamMemberId: null,
        plan: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
        onboardingCompleted: false,
        businessName: '',
        trade: '',
        teamSize: '',
        jobType: '',
        experienceYears: '',
        region: '',
        invoiceMethod: 'email',
      },
    },
  );

  // Notify the owner
  const ownerDoc = await User.findById(ownerUserId)
    .select('email firstName businessName')
    .lean<{ email?: string; firstName: string; businessName: string } | null>();

  if (ownerDoc?.email) {
    sendEmail({
      to: ownerDoc.email,
      ...memberLeftTemplate(ownerDoc, memberName),
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true, redirect: '/onboarding' });
}
