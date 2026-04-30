import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { welcomeTemplate } from '@/lib/email/templates';

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
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
