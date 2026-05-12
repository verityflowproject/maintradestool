import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';
import { getToken } from 'next-auth/jwt';
import { isAdminUnlockedFromRequest } from '@/lib/admin/adminUnlock';

// Routes expired users may still visit (read-only data, upgrade funnel, and
// /jobs + /feature-board which are also read-only — write/voice routes inside
// /jobs are still blocked by the per-page server guards).
const BILLING_PASSTHROUGH =
  /^\/(dashboard|jobs|invoices|customers|calendar|requests|settings|billing-expired|help|legal|contact|feature-board|team|time)(\/|$|\?)/;

// Feature routes that are soft-gated behind email verification.
// Unverified manual-signup users are redirected to /dashboard?verify_required=1
// which triggers the VerifyEmailModal on the client.
const EMAIL_VERIFY_GATED =
  /^\/(jobs\/new\/voice|jobs\/[^/]+\/voice)(\/|$|\?)/;

// Owner-only routes that members should never access
const OWNER_ONLY_PATHS =
  /^\/(settings\/billing|settings\/booking|settings\/business|settings\/rates)/;

function isTokenExpired(token: JWT): boolean {
  // v2: members do not carry their own plan/trial data — their access is gated
  // on the owner's plan. Per-request guards (requireCapability) resolve to the
  // parent owner transparently. Returning false here lets members through the
  // middleware; any expired-owner state is caught at the API/page level.
  if (token.accountType === 'member') return false;

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

  // next-auth v5 picks the cookie name based on the configured URL's protocol
  // (https → '__Secure-authjs.session-token', http → 'authjs.session-token'),
  // NOT based on NODE_ENV. So in dev (NODE_ENV=development) with
  // NEXTAUTH_URL=https://..., the browser actually sends the secure-prefixed
  // cookie even on http://localhost. Detect what's really in the request
  // instead of guessing — this stays correct regardless of env mismatches.
  const SECURE_COOKIE = '__Secure-authjs.session-token';
  const INSECURE_COOKIE = 'authjs.session-token';
  const cookieName = req.cookies.get(SECURE_COOKIE)
    ? SECURE_COOKIE
    : INSECURE_COOKIE;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    salt: cookieName,
    cookieName,
    secureCookie: cookieName === SECURE_COOKIE,
  });

  const isProtected =
    /^\/(dashboard|jobs|customers|invoices|calendar|requests|settings|feature-board|team|time)(\/|$|\?)/.test(pathname);
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

  // /verify pages are fully public — unauthenticated users must be able to redeem tokens
  if (pathname.startsWith('/verify')) {
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

  // v2: team member gates
  // Members cannot access owner-only pages (billing, booking settings, etc.)
  if (token?.accountType === 'member' && OWNER_ONLY_PATHS.test(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Deactivated members are held at a dedicated screen; the JWT may persist up
  // to ~30s after deactivation before refresh — middleware catches them on the
  // very next navigation. The /team-access-revoked page itself is outside the
  // protected matcher so it renders without token checks.
  if (token?.accountType === 'member' && token.memberActive === false) {
    if (pathname !== '/team-access-revoked' && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/team-access-revoked', req.url));
    }
  }

  // Email-verification soft gate — redirect unverified owners away from
  // voice-logging and invoice-related page routes. API-level checks are in the
  // route handlers themselves; this only covers page navigations.
  if (
    isProtected &&
    token &&
    !token.emailVerified &&
    token.accountType !== 'member' &&
    EMAIL_VERIFY_GATED.test(pathname)
  ) {
    return NextResponse.redirect(
      new URL('/dashboard?verify_required=1', req.url),
    );
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
    '/(dashboard|jobs|customers|invoices|calendar|requests|settings|feature-board|team|time)(.*)?',
    '/onboarding',
    '/verify/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
