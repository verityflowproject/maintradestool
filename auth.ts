import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { welcomeTemplate } from '@/lib/email/templates';
import { isTeamSize } from '@/lib/team/hasTeam';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/onboarding', error: '/onboarding' },

  providers: [
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase();
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;

        await dbConnect();
        const user = await User.findOne({ email });
        if (!user) return null;
        if (!user.password) return null; // OAuth-only account — must use Google

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          businessName: user.businessName,
          plan: user.plan,
          onboardingCompleted: user.onboardingCompleted,
        };
      },
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;

      const email = (user.email ?? '').trim().toLowerCase();
      if (!email) return false;

      await dbConnect();
      const existing = await User.findOne({ email });

      if (!existing) {
        const googleProfile = profile as
          | { given_name?: string; name?: string }
          | undefined;
        const firstName =
          googleProfile?.given_name ??
          user.name?.split(' ')[0] ??
          '';

        // v2: check if this email has a pending team invite before creating an owner account
        const TeamMember = (await import('@/lib/models/TeamMember')).default;
        const pendingInvite = await TeamMember.findOne({
          email,
          linkedUserId: null,
          inviteTokenHash: { $ne: null },
          inviteTokenExpiresAt: { $gt: new Date() },
        });

        if (pendingInvite) {
          const memberUser = await User.create({
            email,
            password: null,
            firstName,
            parentOwnerId: pendingInvite.ownerUserId,
            linkedTeamMemberId: pendingInvite._id,
            onboardingCompleted: true,
          });
          pendingInvite.linkedUserId = memberUser._id;
          pendingInvite.inviteAcceptedAt = new Date();
          pendingInvite.inviteTokenHash = null;
          pendingInvite.inviteTokenExpiresAt = null;
          await pendingInvite.save();

          // Notify the owner that the member accepted
          User.findById(pendingInvite.ownerUserId)
            .select('email firstName businessName')
            .lean<{ email: string; firstName: string; businessName: string } | null>()
            .then(async (owner) => {
              if (owner) {
                const { inviteAcceptedNotificationTemplate } = await import('@/lib/email/templates');
                sendEmail({
                  to: owner.email,
                  ...inviteAcceptedNotificationTemplate(owner, pendingInvite.name),
                }).catch(console.error);
              }
            })
            .catch(console.error);

          return true;
        }

        const newUser = await User.create({
          email,
          password: null,
          firstName,
          businessName: '',
          trade: '',
          teamSize: '',
          jobType: '',
          experienceYears: '',
          painPoints: [],
          hourlyRate: 85,
          partsMarkup: 20,
          region: '',
          invoiceMethod: 'email',
          plan: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          onboardingCompleted: false,
        });

        sendEmail({ to: email, ...welcomeTemplate(newUser) }).catch(console.error);
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      // Re-fetch from DB on first sign-in and whenever updateSession() is called
      if (user || trigger === 'signIn' || trigger === 'update') {
        const email =
          (user?.email as string | undefined) ??
          (token.email as string | undefined);

        if (email) {
          await dbConnect();
          const dbUser = await User.findOne({ email: email.toLowerCase() });

          if (dbUser) {
            token.id = dbUser._id.toString();
            token.email = dbUser.email;
            token.firstName = dbUser.firstName;
            token.businessName = dbUser.businessName;
            token.plan = dbUser.plan;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            token.trialEndsAt = dbUser.trialEndsAt?.toISOString() ?? null;
            token.subscriptionStatus = dbUser.subscriptionStatus ?? null;
            token.subscriptionEndsAt = dbUser.subscriptionEndsAt?.toISOString() ?? null;
            token.teamSize = dbUser.teamSize ?? '';

            // v2: identity fields
            token.parentOwnerId = dbUser.parentOwnerId ? String(dbUser.parentOwnerId) : null;
            token.linkedTeamMemberId = dbUser.linkedTeamMemberId ? String(dbUser.linkedTeamMemberId) : null;
            token.accountType = dbUser.parentOwnerId ? 'member' : 'owner';
            token.effectiveOwnerId = dbUser.parentOwnerId
              ? String(dbUser.parentOwnerId)
              : String(dbUser._id);

            if (dbUser.parentOwnerId && dbUser.linkedTeamMemberId) {
              const TeamMember = (await import('@/lib/models/TeamMember')).default;
              const UserModel = (await import('@/lib/models/User')).default;

              // Orphan defense: if the parent owner no longer exists, treat member as inactive.
              // Also surface the *owner's* teamSize on the member's session so that
              // `hasTeam`-gated UI (BottomNav Team tab, JobForm assignment chips) renders
              // correctly for manager/office members who belong to a team account.
              const owner = await UserModel.findById(dbUser.parentOwnerId)
                .select('teamSize')
                .lean<{ teamSize?: string } | null>();
              if (!owner) {
                token.memberActive = false;
                token.role = null;
              } else {
                token.teamSize = owner.teamSize ?? '';
                const tm = await TeamMember.findById(dbUser.linkedTeamMemberId).select('role active').lean();
                token.role = (tm as { role?: string; active?: boolean } | null)?.role ?? null;
                token.memberActive = (tm as { role?: string; active?: boolean } | null)?.active ?? false;
              }
            } else {
              token.role = 'owner';
              token.memberActive = true;
            }
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.firstName = token.firstName as string;
      session.user.businessName = token.businessName as string;
      session.user.plan = token.plan as string;
      session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      session.user.teamSize = (token.teamSize as string | undefined) ?? '';
      session.user.hasTeam = isTeamSize(token.teamSize as string | undefined);

      // v2: identity fields
      session.user.accountType = (token.accountType as 'owner' | 'member' | undefined) ?? 'owner';
      session.user.parentOwnerId = (token.parentOwnerId as string | null | undefined) ?? null;
      session.user.linkedTeamMemberId = (token.linkedTeamMemberId as string | null | undefined) ?? null;
      session.user.effectiveOwnerId = (token.effectiveOwnerId as string | undefined) ?? (token.id as string);
      session.user.role = ((token.role as string | null | undefined) ?? null) as import('@/lib/team/roles').TeamMemberRole | null;
      session.user.memberActive = (token.memberActive as boolean | undefined) ?? true;

      return session;
    },
  },

  events: {
    async signOut() {
      // Clear the admin-unlock cookie so it doesn't persist across accounts.
      // next-auth events don't expose the response directly, so we delete via
      // the cookies() API which is available in this server context.
      try {
        const { cookies } = await import('next/headers');
        const store = await cookies();
        store.delete('admin-unlock');
      } catch {
        // cookies() may not be available in all event contexts — that's fine.
      }
    },
  },
});
