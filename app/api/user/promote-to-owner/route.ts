import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';

export const runtime = 'nodejs';

/**
 * Promotes a deactivated team member to a standalone owner account.
 * Clears the parent link, resets to a fresh 14-day trial, and forces onboarding.
 * Only callable by a member whose access has been revoked (memberActive === false).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.accountType !== 'member') {
    return NextResponse.json(
      { error: 'Only team members can use this endpoint.' },
      { status: 403 },
    );
  }
  if (session.user.memberActive !== false) {
    return NextResponse.json(
      { error: 'Your team access is still active.' },
      { status: 403 },
    );
  }

  await dbConnect();

  // Unlink from the TeamMember record so the owner can reinvite a different user if needed
  if (session.user.linkedTeamMemberId) {
    await TeamMember.updateOne(
      { _id: session.user.linkedTeamMemberId },
      { $set: { linkedUserId: null } },
    );
  }

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

  return NextResponse.json({ ok: true });
}
