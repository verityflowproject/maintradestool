"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const HIDDEN_EXACT = ["/"];

const HIDDEN_PREFIXES = [
  "/signin",
  "/onboarding",
  "/jobs/new/voice",
  "/invoice/",
  "/book/",
  "/admin",
  "/contact",
  "/settings",
];

export default function SettingsCornerButton() {
  const pathname = usePathname() ?? "";

  if (HIDDEN_EXACT.includes(pathname)) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return null;
  }

  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="settings-corner-btn"
    >
      <Settings size={20} strokeWidth={1.8} />
    </Link>
  );
}
