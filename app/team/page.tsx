import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';
import { isTeamSize } from '@/lib/team/hasTeam';
import TeamListClient from './TeamListClient';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'read', 'team');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);
  const user = await User.findById(ownerId)
    .select('teamSize firstName')
    .lean<{ teamSize: string; firstName: string } | null>();

  if (!user || !isTeamSize(user.teamSize)) redirect('/dashboard');

  const members = await TeamMember.find({ ownerUserId: ownerId })
    .sort({ active: -1, createdAt: 1 })
    .lean();

  return (
    <TeamListClient
      members={members.map((m) => ({
        _id: String(m._id),
        ownerUserId: String(m.ownerUserId),
        linkedUserId: m.linkedUserId ? String(m.linkedUserId) : null,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: m.role,
        hourlyRate: m.hourlyRate,
        color: m.color,
        avatarInitials: m.avatarInitials,
        active: m.active,
        notes: m.notes,
        inviteSentAt: m.inviteSentAt ? m.inviteSentAt.toISOString() : null,
        inviteAcceptedAt: m.inviteAcceptedAt ? m.inviteAcceptedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))}
    />
  );
}
