import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { dbConnect } from './mongodb';
import User from './models/User';
import { getPlanState } from './planState';

export type Capability =
  | 'canCreateJobs'
  | 'canGenerateInvoices'
  | 'canUseVoice'
  | 'canEnableBooking';

type GateResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Gate a capability against the user's (or their parent owner's) plan state.
 *
 * By default (opts.resolveOwner !== false) if the userId belongs to an invited
 * team member, the lookup is transparently redirected to the parent owner's
 * record. This means members inherit the owner's Pro/trial/expired state —
 * they never have their own subscription.
 */
export async function requireCapability(
  userId: string,
  cap: Capability,
  opts?: { resolveOwner?: boolean },
): Promise<GateResult> {
  await dbConnect();

  let lookupId = userId;

  // Resolve to parent owner so members inherit the owner's plan
  if (opts?.resolveOwner !== false) {
    const u = await User.findById(userId)
      .select('parentOwnerId')
      .lean<{ parentOwnerId: Types.ObjectId | null } | null>();
    if (u?.parentOwnerId) {
      lookupId = String(u.parentOwnerId);
    }
  }

  const user = await User.findById(lookupId)
    .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince createdAt')
    .lean<{
      plan: 'trial' | 'pro' | 'cancelled' | 'expired';
      trialEndsAt: Date;
      subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      createdAt: Date;
    } | null>();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  const state = getPlanState(user);

  if (!state[cap]) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'upgrade_required',
          message: 'Your trial has ended. Upgrade to continue.',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}
