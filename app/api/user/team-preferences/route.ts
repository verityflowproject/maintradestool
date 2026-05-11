import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { isTeamSize } from '@/lib/team/hasTeam';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Team preferences are owner-only
  if (session.user.accountType === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  await dbConnect();

  const user = await User.findById(session.user.id).select('teamSize teamPreferences');
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!isTeamSize(user.teamSize)) {
    return NextResponse.json({ error: 'Team features require a team account size.' }, { status: 403 });
  }

  // Whitelist the two boolean prefs
  if ('showAvatarsOnJobs' in body) {
    user.teamPreferences.showAvatarsOnJobs = Boolean(body.showAvatarsOnJobs);
  }
  if ('requireAssignmentBeforeInvoice' in body) {
    user.teamPreferences.requireAssignmentBeforeInvoice = Boolean(body.requireAssignmentBeforeInvoice);
  }

  user.markModified('teamPreferences');
  await user.save();

  return NextResponse.json({
    teamPreferences: user.teamPreferences,
  });
}
