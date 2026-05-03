import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      businessName: string;
      plan: string;
      onboardingCompleted: boolean;
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
  }
}
