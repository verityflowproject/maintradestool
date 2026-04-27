'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  Lock,
  Mail,
  DollarSign,
  Receipt,
  Link as LinkIcon,
  Bell,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  MessageSquare,
  LogOut,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import type { PlanState } from '@/lib/planState';
import AdminUnlockModal from '@/components/AdminUnlockModal';

interface Props {
  firstName: string;
  businessName: string;
  planState: PlanState;
  trialEndsAt: string | null;
  hasPassword: boolean;
}

function getTrialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function PlanBadge({ planState, trialEndsAt }: { planState: PlanState; trialEndsAt: string | null }) {
  if (planState.plan === 'pro' || (planState.plan === 'cancelled_active' && planState.isActive)) {
    return <span className="settings-plan-badge settings-plan-badge--pro">Pro</span>;
  }
  if (planState.plan === 'cancelled_expired' || planState.plan === 'expired') {
    return <span className="settings-plan-badge settings-plan-badge--cancelled">Expired</span>;
  }
  const days = getTrialDaysLeft(trialEndsAt);
  return (
    <span className="settings-plan-badge settings-plan-badge--trial">
      Trial · {days} day{days !== 1 ? 's' : ''} left
    </span>
  );
}

interface NavRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  danger?: boolean;
  accent?: boolean;
}

function NavRow({ icon, label, sublabel, href, external, onClick, danger, accent }: NavRowProps) {
  const cls = `settings-nav-row${danger ? ' settings-nav-row--danger' : ''}${accent ? ' settings-nav-row--accent' : ''}`;

  const inner = (
    <>
      <span className="settings-nav-row__left">
        <span className="settings-nav-row__icon">{icon}</span>
        <span className="settings-nav-row__label-wrap">
          <span className="settings-nav-row__label">{label}</span>
          {sublabel && (
            <span className="settings-nav-row__sublabel">{sublabel}</span>
          )}
        </span>
      </span>
      <ChevronRight size={16} className="settings-nav-row__arrow" />
    </>
  );

  if (onClick) {
    return (
      <button className={cls} onClick={onClick}>
        {inner}
      </button>
    );
  }

  if (external && href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <Link className={cls} href={href ?? '#'}>
      {inner}
    </Link>
  );
}

interface SectionProps {
  heading?: string;
  children: React.ReactNode;
}

function Section({ heading, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      {heading && <p className="settings-section-heading">{heading}</p>}
      <div className="glass-card settings-nav-card">{children}</div>
    </div>
  );
}

export default function SettingsHubClient({
  firstName,
  businessName,
  planState,
  trialEndsAt,
  hasPassword,
}: Props) {
  const router = useRouter();
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const initials = firstName ? firstName.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="settings-page page-padding">
      {/* Header */}
      <div className="settings-page__header">
        <button
          className="icon-btn"
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="settings-page__title" style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22 }}>
          Settings
        </h1>
      </div>

      {/* Profile card */}
      <div className="glass-card settings-profile-card">
        <div className="settings-avatar">{initials}</div>
        <div className="settings-profile-info">
          <p className="settings-profile-name">{firstName}</p>
          <p className="settings-profile-biz">{businessName}</p>
        </div>
        <PlanBadge planState={planState} trialEndsAt={trialEndsAt} />
      </div>

      {/* Section 1 — Account */}
      <Section heading="ACCOUNT">
        <NavRow icon={<User size={18} />} label="Profile" href="/settings/profile" />
        <NavRow icon={<Building size={18} />} label="Business Info" href="/settings/business" />
        {hasPassword && (
          <NavRow icon={<Lock size={18} />} label="Change Password" href="/settings/password" />
        )}
        <NavRow icon={<Mail size={18} />} label="Email Address" href="/settings/email" />
      </Section>

      {/* Section 2 — Work */}
      <Section heading="WORK">
        <NavRow icon={<DollarSign size={18} />} label="Rates & Pricing" href="/settings/rates" />
        <NavRow icon={<Receipt size={18} />} label="Invoice Defaults" href="/settings/invoices" />
        <NavRow icon={<LinkIcon size={18} />} label="Booking Page" href="/settings/booking" />
        <NavRow icon={<Bell size={18} />} label="Notifications" href="/settings/notifications" />
      </Section>

      {/* Section 3 — Billing */}
      <Section heading="BILLING">
        <NavRow icon={<CreditCard size={18} />} label="Subscription" href="/settings/billing" />
        <NavRow icon={<FileText size={18} />} label="Billing History" href="/settings/billing/history" />
      </Section>

      {/* Section 4 — Support */}
      <Section heading="SUPPORT">
        <NavRow
          icon={<HelpCircle size={18} />}
          label="Help Center"
          href="/help"
        />
        <NavRow
          icon={<MessageSquare size={18} />}
          label="Contact Support"
          href="/contact?type=support"
        />
        <NavRow
          icon={<History size={18} />}
          label="My Submissions"
          sublabel="Bug reports, feedback & support requests"
          href="/contact/history"
        />
        <NavRow icon={<FileText size={18} />} label="Terms & Privacy" href="/legal" />
      </Section>

      {/* Section 5 — Admin */}
      <Section>
        <NavRow
          icon={<ShieldCheck size={18} />}
          label="Are you an admin?"
          onClick={() => setAdminModalOpen(true)}
          accent
        />
      </Section>

      {/* Section 6 — Danger zone */}
      <Section>
        <NavRow
          icon={<LogOut size={18} />}
          label="Sign Out"
          onClick={() => void signOut({ callbackUrl: '/onboarding' })}
        />
        <NavRow
          icon={<Trash2 size={18} />}
          label="Delete Account"
          href="/settings/delete"
          danger
        />
      </Section>

      <AdminUnlockModal open={adminModalOpen} onClose={() => setAdminModalOpen(false)} />
    </div>
  );
}
