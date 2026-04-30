import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();

  // Authenticated paths still redirect — only unauthenticated visitors
  // (and crawlers like Googlebot) see the public landing.
  if (session?.user) {
    if (session.user.onboardingCompleted) redirect("/dashboard");
    redirect("/onboarding");
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100dvh - 48px)",
        padding: "0 8px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "320px" }}>
        <div className="welcome-item stagger-0">
          <Image
            src="/logo/verityflow-icon.png"
            alt="VerityFlow"
            width={64}
            height={64}
            priority
            className="welcome-logo"
            style={{ borderRadius: 14 }}
          />
        </div>

        <div className="welcome-item stagger-1">
          <h1 className="welcome-title">VerityFlow</h1>
        </div>

        <div className="welcome-item stagger-2">
          <p className="welcome-tagline">Voice in. Invoice out.</p>
        </div>

        <div className="welcome-item stagger-3">
          <p className="welcome-sub">
            AI-powered job logging and instant invoices for tradespeople. Set up in 2 minutes.
          </p>
        </div>

        <div className="welcome-item stagger-4">
          <Link
            href="/onboarding"
            className="btn-accent welcome-cta"
            style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
          >
            Get Started
          </Link>
        </div>

        <div className="welcome-item stagger-5">
          <Link href="/onboarding" className="welcome-signin" style={{ textDecoration: "none" }}>
            Already have an account?{" "}
            <span style={{ fontWeight: 500 }}>Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
