import { NextResponse } from 'next/server';
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

export async function requireCapability(
  userId: string,
  cap: Capability,
): Promise<GateResult> {
  await dbConnect();

  const user = await User.findById(userId)
    .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince createdAt')
    .lean<{
      plan: 'trial' | 'pro' | 'cancelled';
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
