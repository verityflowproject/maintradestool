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
    <>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100dvh - 200px)",
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
              Get Started Free
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

      <footer
        style={{
          borderTop: "1px solid var(--quartz-border, rgba(255,255,255,0.07))",
          padding: "40px 24px 28px",
          maxWidth: "960px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "32px 24px",
            marginBottom: "32px",
          }}
        >
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Image
                src="/logo/verityflow-icon.png"
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: 6 }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--text-primary, #e2e2e8)",
                  fontFamily: "var(--font-syne, sans-serif)",
                }}
              >
                VerityFlow
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary, #6b7280)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              The AI-powered OS for tradespeople. Log jobs by voice, generate invoices instantly.
            </p>
          </div>

          {/* Product column */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary, #6b7280)",
                margin: "0 0 12px",
              }}
            >
              Product
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { href: "/onboarding", label: "Get Started" },
                { href: "/onboarding", label: "Pricing" },
                { href: "/help", label: "Help Center" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    style={{ fontSize: 14, color: "var(--text-secondary, #9898aa)", textDecoration: "none" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary, #6b7280)",
                margin: "0 0 12px",
              }}
            >
              Legal
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { href: "/legal", label: "Terms of Service" },
                { href: "/legal?tab=privacy", label: "Privacy Policy" },
                { href: "/legal", label: "Refund Policy" },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    style={{ fontSize: 14, color: "var(--text-secondary, #9898aa)", textDecoration: "none" }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect column */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary, #6b7280)",
                margin: "0 0 12px",
              }}
            >
              Connect
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <li>
                <a
                  href="mailto:contact@verityflow.io"
                  style={{ fontSize: 14, color: "var(--text-secondary, #9898aa)", textDecoration: "none" }}
                >
                  contact@verityflow.io
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  style={{ fontSize: 14, color: "var(--text-secondary, #9898aa)", textDecoration: "none" }}
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--quartz-border, rgba(255,255,255,0.07))",
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text-tertiary, #6b7280)", margin: 0 }}>
            © {new Date().getFullYear()} VerityFlow. Built for tradespeople.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary, #6b7280)", margin: 0 }}>
            14-day free trial · No credit card required
          </p>
        </div>
      </footer>
    </>
  );
}
