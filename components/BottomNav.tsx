"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutGrid,
  Briefcase,
  CalendarDays,
  Receipt,
  Users,
  UserCircle,
  Clock,
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
  const { status: authStatus, data: session } = useSession();
  const { state } = usePlanState();
  const { show: showUpgradeGate } = useUpgradeGate();

  const hasTeam = session?.user?.hasTeam === true;
  const role = session?.user?.role ?? "owner";

  // Build role-specific tab sets
  const tabsForRole = (() => {
    if (role === "office") {
      return {
        left: [
          { href: "/dashboard", label: "Home", Icon: LayoutGrid },
          { href: "/jobs", label: "Jobs", Icon: Briefcase },
        ] as NavTab[],
        right: [
          { href: "/customers", label: "Customers", Icon: UserCircle },
          { href: "/invoices", label: "Invoices", Icon: Receipt },
        ] as NavTab[],
        fab: false,
      };
    }
    if (role === "lead") {
      return {
        left: [
          { href: "/dashboard", label: "Home", Icon: LayoutGrid },
          { href: "/jobs", label: "My Jobs", Icon: Briefcase },
        ] as NavTab[],
        right: [
          { href: "/calendar", label: "Calendar", Icon: CalendarDays },
          { href: "/time", label: "Time", Icon: Clock },
        ] as NavTab[],
        fab: true,
      };
    }
    if (role === "tech") {
      return {
        left: [
          { href: "/dashboard", label: "Home", Icon: LayoutGrid },
          { href: "/jobs", label: "My Jobs", Icon: Briefcase },
        ] as NavTab[],
        right: [
          { href: "/calendar", label: "Calendar", Icon: CalendarDays },
          { href: "/time", label: "Time", Icon: Clock },
        ] as NavTab[],
        fab: false,
      };
    }
    if (role === "apprentice") {
      return {
        left: [
          { href: "/dashboard", label: "Home", Icon: LayoutGrid },
          { href: "/jobs", label: "My Jobs", Icon: Briefcase },
        ] as NavTab[],
        right: [
          { href: "/time", label: "Time", Icon: Clock },
        ] as NavTab[],
        fab: false,
      };
    }
    // owner / manager: existing layout, team tab when hasTeam
    const right: NavTab[] = hasTeam
      ? [
          { href: "/calendar", label: "Calendar", Icon: CalendarDays },
          { href: "/invoices", label: "Invoices", Icon: Receipt },
          { href: "/team", label: "Team", Icon: Users },
        ]
      : [
          { href: "/calendar", label: "Calendar", Icon: CalendarDays },
          { href: "/invoices", label: "Invoices", Icon: Receipt },
        ];
    return {
      left: [
        { href: "/dashboard", label: "Home", Icon: LayoutGrid },
        { href: "/jobs", label: "Jobs", Icon: Briefcase },
      ] as NavTab[],
      right,
      fab: true,
    };
  })();

  // Per-job voice page pattern: /jobs/<id>/voice
  const isJobVoicePage = /^\/jobs\/[^/]+\/voice(\/|$)/.test(pathname);

  // Hide on full-screen flows and the public landing regardless of auth state,
  // so the path check runs before the session check and avoids a flash on load.
  if (
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname === "/jobs/new/voice" ||
    isJobVoicePage ||
    pathname.startsWith("/invoice/") ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/contact")
  ) {
    return null;
  }

  // Hide for unauthenticated and loading states on all other routes.
  if (authStatus !== "authenticated") return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const canCreate = state?.canCreateJobs ?? true;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {/* Brand header — only visible in the desktop sidebar */}
      <div className="sidebar-brand">
        <Image
          src="/logo/verityflow-icon.png"
          alt="VerityFlow"
          width={28}
          height={28}
          style={{ borderRadius: 6 }}
        />
        <span className="sidebar-brand__name">VerityFlow</span>
      </div>

      <div className="bottom-nav__side bottom-nav__side--left">
        {tabsForRole.left.map((tab) => (
          <NavButton key={tab.href} tab={tab} active={isActive(tab.href)} />
        ))}
      </div>

      {tabsForRole.fab && (
        canCreate ? (
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
        )
      )}

      <div className="bottom-nav__side bottom-nav__side--right">
        {tabsForRole.right.map((tab) => (
          <NavButton key={tab.href} tab={tab} active={isActive(tab.href)} />
        ))}
      </div>

      {/* Settings link — only visible in the desktop sidebar */}
      <Link
        href="/settings"
        className={`sidebar-settings-link nav-item${
          isActive("/settings") ? " active" : ""
        }`}
        aria-label="Settings"
      >
        <Settings size={22} strokeWidth={isActive("/settings") ? 2.2 : 1.8} />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
