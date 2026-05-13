import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInForm from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your VerityFlow account.",
  robots: { index: false, follow: false },
};

interface SignInPageProps {
  searchParams: Promise<{
    email?: string;
    verified?: string;
    already_verified?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();

  // Already authenticated → send to the right place.
  if (session?.user) {
    if (session.user.onboardingCompleted) redirect("/dashboard");
    redirect("/onboarding");
  }

  const params = await searchParams;

  return (
    <SignInForm
      defaultEmail={params.email ?? ""}
      verifiedBanner={params.verified === "1"}
      alreadyVerifiedBanner={params.already_verified === "1"}
    />
  );
}
