import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAdminUnlockedFromRequest } from '@/lib/admin/adminUnlock';

// #region agent log
console.error('[mw] module loaded', {
  hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
  hasAdminSecret: Boolean(process.env.ADMIN_UNLOCK_SECRET),
  nodeEnv: process.env.NODE_ENV,
});
// #endregion

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // #region agent log
  console.error('[mw] enter', {
    pathname,
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    hasAdminSecret: Boolean(process.env.ADMIN_UNLOCK_SECRET),
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    cookieKeys: Array.from(req.cookies.getAll()).map(c => c.name),
  });
  // #endregion

  // v5 beta stores the JWT in 'authjs.session-token' (dev) or
  // '__Secure-authjs.session-token' (production/https).
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

  // #region agent log
  console.error('[mw] before getToken', { pathname, cookieName });
  const tokenStart = Date.now();
  // #endregion

  let token: Awaited<ReturnType<typeof getToken>> = null;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      salt: cookieName,
      cookieName,
    });
  } catch (err) {
    // #region agent log
    console.error('[mw] getToken THREW', { pathname, err: String(err) });
    // #endregion
    throw err;
  }

  // #region agent log
  console.error('[mw] after getToken', {
    pathname,
    elapsedMs: Date.now() - tokenStart,
    tokenPresent: Boolean(token),
  });
  // #endregion

  const isProtected =
    /^\/(dashboard|jobs|customers|invoices|calendar|requests|settings)(\/|$|\?)/.test(pathname);
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
    let unlocked = false;
    try {
      unlocked = isAdminUnlockedFromRequest(req);
    } catch (err) {
      // #region agent log
      console.error('[mw] isAdminUnlockedFromRequest THREW', {
        pathname, err: String(err),
      });
      // #endregion
      throw err;
    }
    if (!token || !unlocked) {
      return NextResponse.rewrite(new URL('/admin-not-found', req.url));
    }
    return NextResponse.next();
  }

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  if (isOnboarding && token && token.onboardingCompleted === true) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(dashboard|jobs|customers|invoices|calendar|requests|settings)(.*)?',
    '/onboarding',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
