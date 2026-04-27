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

export const metadata: Metadata = {
  title: "VerityFlow",
  description: "Voice in. Invoice out. AI-powered job memory and instant invoices for tradespeople.",
  manifest: "/manifest.json",
  applicationName: "VerityFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VerityFlow",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "VerityFlow — AI for Tradespeople",
    description: "Voice-log your jobs. Auto-generate invoices. Get paid faster.",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#07070C",
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
