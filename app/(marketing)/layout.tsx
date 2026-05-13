import Script from "next/script";
import { auth } from "@/auth";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import UTMCapture from "@/components/marketing/UTMCapture";

const LD_JSON = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VerityFlow",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  offers: {
    "@type": "Offer",
    price: "29",
    priceCurrency: "USD",
    description: "14-day free trial — no credit card required",
  },
  description:
    "Voice-to-invoice job tracking and invoicing software for contractors and tradespeople.",
  url: "https://verityflow.io",
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const showDashboard = !!session?.user;
  const dashboardHref =
    session?.user?.onboardingCompleted ? "/dashboard" : "/onboarding";

  return (
    <div className="marketing-root">
      {/* Accessibility: skip to main content */}
      <a href="#main-content" className="mk-skip-link">
        Skip to main content
      </a>

      {/* Structured data — separate from root layout's SoftwareApplication block */}
      <Script
        id="ld-json-marketing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LD_JSON) }}
      />

      <MarketingNav showDashboard={showDashboard} dashboardHref={dashboardHref} />

      {children}

      <MarketingFooter />

      {/* UTM capture + landing_page_viewed analytics event */}
      <UTMCapture />
    </div>
  );
}
