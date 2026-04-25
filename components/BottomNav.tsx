"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Briefcase,
  CalendarDays,
  Receipt,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { usePlanState } from "@/lib/hooks/usePlanState";
import { useUpgradeGate } from "@/components/UpgradeGate/UpgradeGateProvider";

type NavTab = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const LEFT_TABS: NavTab[] = [
  { href: "/dashboard", label: "Home", Icon: LayoutGrid },
  { href: "/jobs", label: "Jobs", Icon: Briefcase },
];

const RIGHT_TABS: NavTab[] = [
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/invoices", label: "Invoices", Icon: Receipt },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function NavButton({ tab, active }: { tab: NavTab; active: boolean }) {
  const { href, label, Icon } = tab;
  return (
    <Link
      href={href}
      className={`nav-item${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span>{label}</span>
      {active ? <span className="nav-dot" aria-hidden /> : null}
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const { state } = usePlanState();
  const { show: showUpgradeGate } = useUpgradeGate();

  if (
    pathname.startsWith("/onboarding") ||
    pathname === "/jobs/new/voice" ||
    pathname.startsWith("/invoice/") ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const canCreate = state?.canCreateJobs ?? true;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {LEFT_TABS.map((tab) => (
        <NavButton key={tab.href} tab={tab} active={isActive(tab.href)} />
      ))}

      {canCreate ? (
        <Link
          href="/jobs/new/voice"
          className="nav-fab"
          aria-label="Log a job with voice"
        >
          <Plus size={24} strokeWidth={2.5} />
        </Link>
      ) : (
        <button
          type="button"
          className="nav-fab"
          aria-label="Upgrade to log a job"
          onClick={showUpgradeGate}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}

      {RIGHT_TABS.map((tab) => (
        <NavButton key={tab.href} tab={tab} active={isActive(tab.href)} />
      ))}
    </nav>
  );
}
