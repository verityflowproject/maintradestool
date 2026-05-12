import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import {
  generateVerificationToken,
  sendVerificationEmail,
  VERIFY_TOKEN_TTL_MS,
} from '@/lib/email/emailVerification';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

/** Minimum seconds between resends per email address. */
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
/** Maximum resends per hour per email address. */
const RESEND_MAX_PER_HOUR = 5;
const RESEND_HOUR_MS = 60 * 60 * 1000;

/** How early we'll reuse an existing token (must have > 10 min left). */
const TOKEN_REUSE_THRESHOLD_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const session = await auth();

  // Support both authenticated resends (from banner/modal) and anonymous
  // resends (from the /verify expired screen where the user may not be signed in).
  let userId: string | null = session?.user?.id ?? null;

  // Anonymous path: the /verify expired screen submits a uid form field.
  if (!userId) {
    let body: Record<string, unknown> = {};
    try {
      const ct = req.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        body = await req.json();
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        for (const pair of text.split('&')) {
          const [k, v] = pair.split('=');
          body[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
        }
      }
    } catch {
      // ignore
    }
    userId = typeof body.uid === 'string' ? body.uid : null;
  }

  if (!userId) {
    // Return generic success to avoid user enumeration
    return NextResponse.json({ ok: true });
  }

  await dbConnect();
  const user = await User.findById(userId);

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Already verified — silently succeed (idempotent)
  if (user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  // Rate limit: 1 per 60s and 5 per hour, keyed by email
  const perMinute = rateLimit('verify-resend-min', user.email, {
    max: 1,
    windowMs: RESEND_COOLDOWN_MS,
  });
  if (!perMinute.ok) {
    return NextResponse.json(
      { error: 'Please wait a minute before requesting another email.' },
      { status: 429 },
    );
  }

  const perHour = rateLimit('verify-resend-hr', user.email, {
    max: RESEND_MAX_PER_HOUR,
    windowMs: RESEND_HOUR_MS,
  });
  if (!perHour.ok) {
    return NextResponse.json(
      { error: 'Too many confirmation emails sent. Please try again in an hour.' },
      { status: 429 },
    );
  }

  // Reuse existing token if still valid with sufficient lifetime remaining
  const now = Date.now();
  const existingExpiry = user.emailVerificationExpiresAt?.getTime() ?? 0;
  const hasUsableToken =
    user.emailVerificationTokenHash &&
    existingExpiry > now + TOKEN_REUSE_THRESHOLD_MS;

  let rawToken: string;

  if (hasUsableToken) {
    // Issue a fresh token anyway so the link in the new email works.
    // (The old link becomes invalid, but that's better than two valid links coexisting.)
    rawToken = await generateVerificationToken(user);
  } else {
    rawToken = await generateVerificationToken(user);
  }

  // Reset token TTL and lastSent
  user.emailVerificationExpiresAt = new Date(now + VERIFY_TOKEN_TTL_MS);
  user.emailVerificationLastSentAt = new Date();

  await user.save();
  sendVerificationEmail(user, rawToken).catch(console.error);

  return NextResponse.json({ ok: true });
}
