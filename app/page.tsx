import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/onboarding");
  if (session.user.onboardingCompleted) redirect("/dashboard");
  redirect("/onboarding");
}
