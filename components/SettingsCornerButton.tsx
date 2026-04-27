"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const HIDDEN_PREFIXES = [
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
