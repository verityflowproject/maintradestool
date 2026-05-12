import 'next-auth';
import 'next-auth/jwt';
import type { TeamMemberRole } from '@/lib/team/roles';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      businessName: string;
      plan: string;
      onboardingCompleted: boolean;
      teamSize: string;
      hasTeam: boolean;
      // Email verification — Date|null to match NextAuth's native shape.
      // null = not yet confirmed, Date = verified-at timestamp.
      emailVerified: Date | null;
      // v2: identity fields
      accountType: 'owner' | 'member';
      parentOwnerId: string | null;
      linkedTeamMemberId: string | null;
      effectiveOwnerId: string;
      role: TeamMemberRole | null;
      memberActive: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    businessName: string;
    plan: string;
    onboardingCompleted: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    firstName: string;
    businessName: string;
    plan: string;
    onboardingCompleted: boolean;
    trialEndsAt?: string | null;
    subscriptionStatus?: string | null;
    subscriptionEndsAt?: string | null;
    teamSize?: string;
    // Email verification — Date|null to align with Session.user.emailVerified
    emailVerified?: Date | null;
    // v2: identity fields
    accountType?: 'owner' | 'member';
    parentOwnerId?: string | null;
    linkedTeamMemberId?: string | null;
    effectiveOwnerId?: string;
    role?: string | null;
    memberActive?: boolean;
  }
}
