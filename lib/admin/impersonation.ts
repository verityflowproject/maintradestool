export const IMPERSONATION_COOKIE = 'admin-impersonation';
export const ORIGINAL_SESSION_COOKIE = 'admin-original-session';

export interface ImpersonationData {
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  startedAt: number; // Unix ms
}

export function getSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
}

export function cookieOptions(maxAge: number, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function parseImpersonationCookie(
  value: string | undefined
): ImpersonationData | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ImpersonationData;
  } catch {
    return null;
  }
}
