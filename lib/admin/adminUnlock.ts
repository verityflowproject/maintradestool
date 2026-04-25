import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'admin-unlock';
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function getSecret(): string {
  const s = process.env.ADMIN_UNLOCK_SECRET;
  if (!s) throw new Error('ADMIN_UNLOCK_SECRET env var not set');
  return s;
}

function b64url(s: string): string {
  return Buffer.from(s).toString('base64url');
}

function hmacHex(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// ── Token lifecycle ───────────────────────────────────────────────────

export function signAdminToken(userId: string): string {
  const payload = b64url(JSON.stringify({ userId, exp: Date.now() + TTL_MS }));
  const sig = hmacHex(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): { userId: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  // Timing-safe HMAC comparison
  const expected = Buffer.from(hmacHex(payload), 'hex');
  const actual = Buffer.from(sig, 'hex');
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      userId: string;
      exp: number;
    };
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

// ── Middleware-compatible check (reads from NextRequest) ──────────────

export function isAdminUnlockedFromRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token) !== null;
}

// ── Server-component check (reads from Next's cookies() API) ─────────

export async function isAdminUnlocked(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    return verifyAdminToken(token) !== null;
  } catch {
    return false;
  }
}
