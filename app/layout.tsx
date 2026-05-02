import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";
import SettingsCornerButton from "@/components/SettingsCornerButton";
import SessionProviderShell from "@/components/SessionProviderShell";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { UpgradeGateProvider } from "@/components/UpgradeGate/UpgradeGateProvider";
import TrialBanner from "@/components/TrialBanner";
import InstallPrompt from "@/components/InstallPrompt";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import {
  IMPERSONATION_COOKIE,
  parseImpersonationCookie,
} from "@/lib/admin/impersonation";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export function generateMetadata(): Metadata {
  return {
  metadataBase: new URL("https://verityflow.io"),
  title: {
    default: "VerityFlow — AI Job Logging & Invoicing for Tradespeople",
    template: "%s | VerityFlow",
  },
  description:
    "Voice in. Invoice out. Log jobs by talking, auto-generate professional invoices, and get paid faster. Built for plumbers, electricians, HVAC techs, and every other trade.",
  keywords: [
    "tradesperson invoicing app",
    "voice job logging",
    "plumber invoice app",
    "electrician job management",
    "HVAC invoicing",
    "trade business software",
    "AI invoices for tradespeople",
    "VerityFlow",
  ],
  authors: [{ name: "VerityFlow", url: "https://verityflow.io" }],
  creator: "VerityFlow",
  publisher: "VerityFlow",
  category: "Business",
  manifest: "/manifest.json",
  applicationName: "VerityFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VerityFlow",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "VerityFlow — AI Job Logging & Invoicing for Tradespeople",
    description:
      "Voice-log your jobs. Auto-generate professional invoices. Get paid faster. The AI-powered tool built for the trades.",
    url: "https://verityflow.io",
    siteName: "VerityFlow",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VerityFlow — AI Job Logging & Invoicing for Tradespeople",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VerityFlow — AI Job Logging & Invoicing for Tradespeople",
    description:
      "Voice-log your jobs. Auto-generate professional invoices. Get paid faster.",
    images: ["/og-image.png"],
    creator: "@verityflow",
    site: "@verityflow",
  },
  verification: {
    google: "googlee8b8c9d60f94bc5a",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#050912",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const impersonation = parseImpersonationCookie(
    cookieStore.get(IMPERSONATION_COOKIE)?.value
  );

  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "VerityFlow",
              url: "https://verityflow.io",
              logo: "https://verityflow.io/logo/verityflow-full.png",
              description:
                "Voice in. Invoice out. Log jobs by talking, auto-generate professional invoices, and get paid faster. Built for plumbers, electricians, HVAC techs, and every trade.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, iOS, Android",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "14-day free trial — no credit card required",
              },
              publisher: {
                "@type": "Organization",
                name: "VerityFlow",
                url: "https://verityflow.io",
                logo: {
                  "@type": "ImageObject",
                  url: "https://verityflow.io/logo/verityflow-full.png",
                },
              },
            }),
          }}
        />
        <SessionProviderShell>
          <ToastProvider>
            <UpgradeGateProvider>
              {impersonation && <ImpersonationBanner data={impersonation} />}
              <div
                className="app-shell"
                style={impersonation ? { paddingTop: 36 } : undefined}
              >
                <TrialBanner />
                <div className="page-content">{children}</div>
                <BottomNav />
              </div>
              <SettingsCornerButton />
              <InstallPrompt />
            </UpgradeGateProvider>
          </ToastProvider>
        </SessionProviderShell>
        <Analytics />
      </body>
    </html>
  );
}
