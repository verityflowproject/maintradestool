/**
 * Lightweight in-memory rate limiter.
 *
 * Limitations:
 *  - State is per-instance; resets on Vercel cold starts.
 *  - Provides soft protection only. Swap to Upstash Redis for hard limits at scale.
 *
 * Usage:
 *   const result = rateLimit('booking', ip, { max: 5, windowMs: 60 * 60 * 1000 });
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries every 10 minutes to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 10 * 60 * 1000);

interface RateLimitOptions {
  max: number;
  windowMs: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  namespace: string,
  identifier: string,
  { max, windowMs }: RateLimitOptions,
): RateLimitResult {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  const remaining = Math.max(0, max - existing.count);
  return {
    ok: existing.count <= max,
    remaining,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract a best-effort IP from a Next.js request.
 * Reads x-forwarded-for (Vercel sets this) then falls back to a constant.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
