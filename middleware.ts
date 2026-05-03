import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';
import { getToken } from 'next-auth/jwt';
import { isAdminUnlockedFromRequest } from '@/lib/admin/adminUnlock';

// Routes expired users may still visit (read-only data, upgrade funnel, and
// /jobs + /feature-board which are also read-only — write/voice routes inside
// /jobs are still blocked by the per-page server guards).
const BILLING_PASSTHROUGH =
  /^\/(dashboard|jobs|invoices|customers|calendar|requests|settings|billing-expired|help|legal|contact|feature-board)(\/|$|\?)/;

function isTokenExpired(token: JWT): boolean {
  const status = token.subscriptionStatus;
  const trialEndsAt = token.trialEndsAt;

  // Legacy JWT (issued before commit d0b07a8 when these fields were added).
  // We can't make a decision from the cookie alone — defer to per-page guards
  // (which read the live DB) instead of forcing /billing-expired and causing
  // a redirect loop for users on a still-active trial.
  if (status === undefined && trialEndsAt === undefined) return false;

  if (status === 'active' || status === 'trialing') return false;
  if (status === 'canceled') {
    const endsAt = token.subscriptionEndsAt;
    if (endsAt) return new Date(endsAt).getTime() <= Date.now();
    return true;
  }
  if (trialEndsAt) return new Date(trialEndsAt).getTime() <= Date.now();
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // v5 beta stores the JWT in 'authjs.session-token' (dev) or
  // '__Secure-authjs.session-token' (production/https).
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    salt: cookieName,
    cookieName,
  });

  const isProtected =
    /^\/(dashboard|jobs|customers|invoices|calendar|requests|settings|feature-board)(\/|$|\?)/.test(pathname);
  const isOnboarding = pathname === '/onboarding';
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin/');

  // Allow stop-impersonation when the impersonation cookie is present
  if (
    pathname === '/api/admin/stop-impersonation' &&
    req.cookies.get('admin-impersonation')
  ) {
    return NextResponse.next();
  }

  // Allow the unlock/lock endpoints through without admin check
  // (they are authenticated by the user session, not the admin cookie)
  if (pathname === '/api/admin/unlock' || pathname === '/api/admin/lock') {
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.next();
  }

  // Admin routes: 404 for anyone without a valid admin-unlock cookie
  if (isAdminRoute) {
    if (!token || !(await isAdminUnlockedFromRequest(req))) {
      return NextResponse.rewrite(new URL('/admin-not-found', req.url));
    }
    return NextResponse.next();
  }

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (isProtected && token && token.onboardingCompleted !== true) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (isOnboarding && token && token.onboardingCompleted === true) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Billing gate — redirect expired users away from write/feature routes.
  // Read-only data pages and settings are intentionally let through so users
  // can still see their data and reach the upgrade page.
  if (isProtected && token && isTokenExpired(token)) {
    if (!BILLING_PASSTHROUGH.test(pathname)) {
      return NextResponse.redirect(new URL('/billing-expired', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(dashboard|jobs|customers|invoices|calendar|requests|settings|feature-board)(.*)?',
    '/onboarding',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
