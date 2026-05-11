import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { isTeamSize } from '@/lib/team/hasTeam';
import AddMemberClient from './AddMemberClient';

export default async function AddMemberPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  // Only owners can write to team (no other role has write:team per matrix)
  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'write', 'team');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);
  const user = await User.findById(ownerId)
    .select('teamSize hourlyRate')
    .lean<{ teamSize: string; hourlyRate: number } | null>();

  if (!user || !isTeamSize(user.teamSize)) redirect('/dashboard');

  return <AddMemberClient defaultRate={user.hourlyRate} />;
}
