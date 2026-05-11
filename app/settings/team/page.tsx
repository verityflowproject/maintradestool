import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { isTeamSize } from '@/lib/team/hasTeam';
import SettingsTeamClient from './SettingsTeamClient';

export default async function SettingsTeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  // Only owners can manage team settings (team-preferences is owner-only)
  if (session.user.accountType === 'member') redirect('/settings');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('teamSize teamPreferences')
    .lean<{
      teamSize: string;
      teamPreferences?: {
        showAvatarsOnJobs: boolean;
        requireAssignmentBeforeInvoice: boolean;
      };
    } | null>();

  if (!user || !isTeamSize(user.teamSize)) redirect('/settings');

  return (
    <SettingsTeamClient
      showAvatarsOnJobs={user.teamPreferences?.showAvatarsOnJobs ?? true}
      requireAssignmentBeforeInvoice={user.teamPreferences?.requireAssignmentBeforeInvoice ?? false}
    />
  );
}
