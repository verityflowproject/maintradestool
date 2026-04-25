import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { logAdminAction } from '@/lib/admin/logAdminAction';
import {
  IMPERSONATION_COOKIE,
  ORIGINAL_SESSION_COOKIE,
  getSessionCookieName,
  cookieOptions,
  parseImpersonationCookie,
} from '@/lib/admin/impersonation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const impersonationRaw = req.cookies.get(IMPERSONATION_COOKIE)?.value;
  const impersonationData = parseImpersonationCookie(impersonationRaw);

  if (!impersonationData) {
    return new Response(null, { status: 404 });
  }

  const originalJwt = req.cookies.get(ORIGINAL_SESSION_COOKIE)?.value ?? '';
  const isSecure = process.env.NODE_ENV === 'production';
  const cookieName = getSessionCookieName();
  const opts = cookieOptions(60 * 60 * 24 * 30, isSecure); // restore with normal 30d expiry

  const response = NextResponse.json({
    success: true,
    redirectTo: `/admin/users/${impersonationData.targetUserId}`,
  });

  // Restore original admin session
  response.cookies.set(cookieName, originalJwt, opts);

  // Clear impersonation cookies
  response.cookies.set(IMPERSONATION_COOKIE, '', { ...opts, maxAge: 0 });
  response.cookies.set(ORIGINAL_SESSION_COOKIE, '', { ...opts, maxAge: 0 });

  try {
    await dbConnect();
    await logAdminAction({
      adminEmail: impersonationData.adminEmail,
      action: 'impersonate_stop',
      targetUserId: impersonationData.targetUserId,
      targetEmail: impersonationData.targetEmail,
    });
  } catch {
    // Non-fatal
  }

  return response;
}
