import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { encode } from '@auth/core/jwt';
import { dbConnect } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { logAdminAction } from '@/lib/admin/logAdminAction';
import {
  IMPERSONATION_COOKIE,
  ORIGINAL_SESSION_COOKIE,
  getSessionCookieName,
  cookieOptions,
  type ImpersonationData,
} from '@/lib/admin/impersonation';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

type Params = { params: { userId: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return new Response(null, { status: 404 });

  await dbConnect();

  let targetId: mongoose.Types.ObjectId;
  try {
    targetId = new mongoose.Types.ObjectId(params.userId);
  } catch {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const targetUser = await User.findById(targetId).lean() as {
    _id: mongoose.Types.ObjectId;
    email: string;
    firstName?: string;
    businessName?: string;
    plan?: string;
    onboardingCompleted?: boolean;
  } | null;

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { reason?: string };
  const isSecure = process.env.NODE_ENV === 'production';
  const cookieName = getSessionCookieName();

  // Read current admin session JWT to preserve
  const originalJwt = req.cookies.get(cookieName)?.value ?? '';

  // Build impersonated user's token with the same shape auth.ts produces
  const targetToken = {
    sub: targetUser._id.toString(),
    id: targetUser._id.toString(),
    email: targetUser.email,
    firstName: targetUser.firstName ?? '',
    businessName: targetUser.businessName ?? '',
    plan: targetUser.plan ?? 'trial',
    onboardingCompleted: targetUser.onboardingCompleted ?? false,
  };

  const impersonatedJwt = await encode({
    token: targetToken,
    secret: process.env.NEXTAUTH_SECRET!,
    salt: cookieName,
    maxAge: 60 * 60, // 1 hour
  });

  const impersonationData: ImpersonationData = {
    adminEmail: session.user?.email ?? '',
    targetUserId: targetUser._id.toString(),
    targetEmail: targetUser.email,
    startedAt: Date.now(),
  };

  const opts = cookieOptions(60 * 60, isSecure);

  const response = NextResponse.json({
    success: true,
    redirectTo: '/dashboard',
  });

  // Save original admin JWT
  response.cookies.set(ORIGINAL_SESSION_COOKIE, originalJwt, opts);
  // Save impersonation metadata
  response.cookies.set(IMPERSONATION_COOKIE, JSON.stringify(impersonationData), opts);
  // Overwrite session with target user's JWT
  response.cookies.set(cookieName, impersonatedJwt, {
    ...opts,
    // session cookie may need __Secure- prefix in prod, already handled by cookieName
  });

  await logAdminAction({
    adminEmail: session.user?.email ?? '',
    action: 'impersonate_start',
    targetUserId: targetUser._id,
    targetEmail: targetUser.email,
    reason: body.reason,
  });

  return response;
}
