import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import type { PlanState } from '@/lib/planState';
import { isTeamSize } from '@/lib/team/hasTeam';
import type { TeamMemberRole } from '@/lib/team/roles';
import SettingsHubClient from './SettingsHubClient';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  await dbConnect();

  const isMember = session.user.accountType === 'member';

  // For members: load the owner's plan state (they inherit it) and businessName for the header

  const [user, ownerDoc] = await Promise.all([
    User.findById(session.user.id)
      .select('firstName businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince password teamSize createdAt')
      .lean<{
        firstName: string;
        businessName: string;
        plan: 'trial' | 'pro' | 'cancelled';
        trialEndsAt: Date;
        subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
        subscriptionEndsAt: Date | null;
        pastDueSince: Date | null;
        password?: string | null;
        teamSize?: string;
        createdAt: Date;
      } | null>(),
    // Only fetch owner separately for members; for owners this is themselves
    isMember && session.user.parentOwnerId
      ? User.findById(session.user.parentOwnerId)
          .select('businessName plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince createdAt teamSize')
          .lean<{
            businessName: string;
            plan: 'trial' | 'pro' | 'cancelled';
            trialEndsAt: Date;
            subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
            subscriptionEndsAt: Date | null;
            pastDueSince: Date | null;
            createdAt: Date;
            teamSize?: string;
          } | null>()
      : Promise.resolve(null),
  ]);

  if (!user) redirect('/');

  // Plan state for billing badge: use owner's plan for members
  const planSource = (isMember && ownerDoc) ? ownerDoc : user;
  const planState: PlanState = getPlanState(planSource as Parameters<typeof getPlanState>[0]);

  const ownerBusinessName = isMember ? (ownerDoc?.businessName ?? null) : null;
  const role = (session.user.role ?? 'owner') as TeamMemberRole | 'owner';
  const hasTeam = isTeamSize(isMember ? (ownerDoc?.teamSize ?? '') : (user.teamSize ?? ''));

  return (
    <SettingsHubClient
      firstName={user.firstName}
      businessName={user.businessName}
      planState={planState}
      trialEndsAt={planSource.trialEndsAt ? planSource.trialEndsAt.toISOString() : null}
      hasPassword={!!user.password}
      hasTeam={hasTeam}
      role={role}
      ownerBusinessName={ownerBusinessName}
      isMember={isMember}
    />
  );
}
