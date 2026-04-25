import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { auth } from '@/auth';
import { signAdminToken, ADMIN_COOKIE } from '@/lib/admin/adminUnlock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory rate limiter: max 5 wrong attempts per session within 15 min
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const TTL_SECONDS = 4 * 60 * 60;

function getRateLimitKey(req: Request, userId: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `${userId}:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function resetAttempts(key: string): void {
  attempts.delete(key);
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;
  const rateLimitKey = getRateLimitKey(req, userId);
  const { allowed } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again in 15 minutes.' },
      { status: 429 },
    );
  }

  const body = (await req.json()) as { code?: string };
  const submittedCode = (body.code ?? '').trim();

  const correctCode = process.env.ADMIN_UNLOCK_CODE ?? '';
  if (!correctCode) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  // Timing-safe code comparison
  let codeMatches = false;
  try {
    const a = Buffer.from(submittedCode.padEnd(correctCode.length, '\0'));
    const b = Buffer.from(correctCode.padEnd(submittedCode.length, '\0'));
    const padded = Buffer.alloc(Math.max(a.length, b.length));
    a.copy(padded);
    const padded2 = Buffer.alloc(padded.length);
    b.copy(padded2);
    codeMatches = submittedCode.length === correctCode.length && timingSafeEqual(a, b);
  } catch {
    codeMatches = false;
  }

  if (!codeMatches) {
    recordFailure(rateLimitKey);
    return NextResponse.json({ error: 'Incorrect code' }, { status: 401 });
  }

  resetAttempts(rateLimitKey);

  const token = await signAdminToken(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}
