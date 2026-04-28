import type { IUser } from './models/User';

export type PlanKind =
  | 'trial'
  | 'pro'
  | 'expired'
  | 'cancelled_active'
  | 'cancelled_expired';

export interface PlanState {
  plan: PlanKind;
  daysLeft: number;
  isActive: boolean;
  canCreateJobs: boolean;
  canGenerateInvoices: boolean;
  canUseVoice: boolean;
  canEnableBooking: boolean;
  pastDueGraceDaysLeft?: number;
  earlyBirdEligible: boolean;
  earlyBirdEndsAt: string | null;
}

const GRACE_DAYS = 7;
const EARLY_BIRD_DAYS = 7;

function daysFromNow(date: Date | null | undefined): number {
  if (!date) return 0;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function daysSince(date: Date | null | undefined): number {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

const FULL_ACCESS: Pick<
  PlanState,
  'isActive' | 'canCreateJobs' | 'canGenerateInvoices' | 'canUseVoice' | 'canEnableBooking'
> = {
  isActive: true,
  canCreateJobs: true,
  canGenerateInvoices: true,
  canUseVoice: true,
  canEnableBooking: true,
};

const NO_ACCESS: Pick<
  PlanState,
  'isActive' | 'canCreateJobs' | 'canGenerateInvoices' | 'canUseVoice' | 'canEnableBooking'
> = {
  isActive: false,
  canCreateJobs: false,
  canGenerateInvoices: false,
  canUseVoice: false,
  canEnableBooking: false,
};

export function getPlanState(
  user: Pick<
    IUser,
    'plan' | 'trialEndsAt' | 'subscriptionStatus' | 'subscriptionEndsAt' | 'pastDueSince' | 'createdAt'
  >,
): PlanState {
  const { subscriptionStatus, subscriptionEndsAt, pastDueSince, trialEndsAt, createdAt } = user;
  const now = Date.now();

  // Early-bird window: first 7 days after account creation, trial only
  const earlyBirdEndsAt = createdAt
    ? new Date(new Date(createdAt).getTime() + EARLY_BIRD_DAYS * 86_400_000)
    : null;

  // ── Active Pro subscription ────────────────────────────────────────────
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return {
      plan: 'pro',
      daysLeft: daysFromNow(subscriptionEndsAt),
      ...FULL_ACCESS,
      // Already subscribed — no longer eligible
      earlyBirdEligible: false,
      earlyBirdEndsAt: null,
    };
  }

  // ── Past due with grace period ─────────────────────────────────────────
  if (subscriptionStatus === 'past_due') {
    const since = daysSince(pastDueSince);
    const graceDaysLeft = Math.max(0, GRACE_DAYS - since);
    if (graceDaysLeft > 0) {
      return {
        plan: 'pro',
        daysLeft: daysFromNow(subscriptionEndsAt),
        ...FULL_ACCESS,
        pastDueGraceDaysLeft: graceDaysLeft,
        earlyBirdEligible: false,
        earlyBirdEndsAt: null,
      };
    }
    return {
      plan: 'expired',
      daysLeft: 0,
      ...NO_ACCESS,
      earlyBirdEligible: false,
      earlyBirdEndsAt: null,
    };
  }

  // ── Cancelled but still within paid period ────────────────────────────
  if (subscriptionStatus === 'canceled') {
    if (subscriptionEndsAt && subscriptionEndsAt.getTime() > now) {
      return {
        plan: 'cancelled_active',
        daysLeft: daysFromNow(subscriptionEndsAt),
        ...FULL_ACCESS,
        earlyBirdEligible: false,
        earlyBirdEndsAt: null,
      };
    }
    return {
      plan: 'cancelled_expired',
      daysLeft: 0,
      ...NO_ACCESS,
      earlyBirdEligible: false,
      earlyBirdEndsAt: null,
    };
  }

  // ── Trial ──────────────────────────────────────────────────────────────
  if (trialEndsAt && trialEndsAt.getTime() > now) {
    const earlyBirdEligible = !!earlyBirdEndsAt && earlyBirdEndsAt.getTime() > now;
    return {
      plan: 'trial',
      daysLeft: daysFromNow(trialEndsAt),
      ...FULL_ACCESS,
      earlyBirdEligible,
      earlyBirdEndsAt: earlyBirdEligible && earlyBirdEndsAt ? earlyBirdEndsAt.toISOString() : null,
    };
  }

  // ── Expired trial / no subscription ───────────────────────────────────
  return {
    plan: 'expired',
    daysLeft: 0,
    ...NO_ACCESS,
    earlyBirdEligible: false,
    earlyBirdEndsAt: null,
  };
}
