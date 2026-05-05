import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

/**
 * Returns which auth method an email is registered with so the client can show
 * the right hint after a failed credentials sign-in (e.g. "use Google instead").
 *
 * Response is intentionally opaque: 'none' is returned for unknown emails so an
 * attacker can't enumerate accounts. 'password' just tells them what they
 * already know if they're trying to sign in with a password.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit('check-method', ip, { max: 30, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json({ method: 'none' as const }, { status: 200 });
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ method: 'none' as const }, { status: 200 });
  }

  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ method: 'none' as const }, { status: 200 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email })
      .select({ password: 1 })
      .lean<{ password: string | null }>();

    if (!user) {
      return NextResponse.json({ method: 'none' as const });
    }
    return NextResponse.json({
      method: user.password ? ('password' as const) : ('google' as const),
    });
  } catch {
    return NextResponse.json({ method: 'none' as const }, { status: 200 });
  }
}
