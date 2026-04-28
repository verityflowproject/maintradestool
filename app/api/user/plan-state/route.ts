import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id)
    .select(
      'plan trialEndsAt subscriptionStatus subscriptionEndsAt subscriptionPlan pastDueSince createdAt',
    )
    .lean<{
      plan: string;
      trialEndsAt: Date;
      subscriptionStatus: string | null;
      subscriptionEndsAt: Date | null;
      subscriptionPlan: string | null;
      pastDueSince: Date | null;
      createdAt: Date;
    } | null>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const state = getPlanState({
    plan: user.plan as 'trial' | 'pro' | 'cancelled',
    trialEndsAt: user.trialEndsAt,
    subscriptionStatus: user.subscriptionStatus as
      | 'trialing'
      | 'active'
      | 'past_due'
      | 'canceled'
      | 'incomplete'
      | null,
    subscriptionEndsAt: user.subscriptionEndsAt,
    pastDueSince: user.pastDueSince,
    createdAt: user.createdAt,
  });

  return NextResponse.json({
    ...state,
    trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
    subscriptionEndsAt: user.subscriptionEndsAt
      ? user.subscriptionEndsAt.toISOString()
      : null,
    subscriptionPlan: user.subscriptionPlan,
    // earlyBirdEndsAt is already a string | null from getPlanState
  });
}
