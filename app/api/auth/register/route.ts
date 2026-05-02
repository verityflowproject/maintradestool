import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import { welcomeTemplate, promoTemplate } from '@/lib/email/templates';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const STRING_FIELDS = [
  'email',
  'password',
  'firstName',
  'businessName',
  'trade',
  'teamSize',
  'jobType',
  'experienceYears',
  'region',
  'invoiceMethod',
] as const;

const NUMERIC_FIELDS = ['hourlyRate', 'partsMarkup'] as const;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = rateLimit('register', ip, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  for (const field of STRING_FIELDS) {
    const val = body[field];
    if (typeof val !== 'string' || val.trim() === '') {
      return NextResponse.json(
        { error: `Missing or invalid field: ${field}` },
        { status: 400 }
      );
    }
  }

  for (const field of NUMERIC_FIELDS) {
    const val = body[field];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return NextResponse.json(
        { error: `Missing or invalid field: ${field}` },
        { status: 400 }
      );
    }
  }

  const email = (body.email as string).trim().toLowerCase();
  const password = body.password as string;
  const firstName = body.firstName as string;
  const businessName = body.businessName as string;
  const trade = body.trade as string;
  const teamSize = body.teamSize as string;
  const jobType = body.jobType as string;
  const experienceYears = body.experienceYears as string;
  const painPoints = Array.isArray(body.painPoints) ? (body.painPoints as string[]) : [];
  const hourlyRate = body.hourlyRate as number;
  const partsMarkup = body.partsMarkup as number;
  const region = body.region as string;
  const invoiceMethod = body.invoiceMethod as string;

  try {
    await dbConnect();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: passwordHash,
      firstName,
      businessName,
      trade,
      teamSize,
      jobType,
      experienceYears,
      painPoints,
      hourlyRate,
      partsMarkup,
      region,
      invoiceMethod,
      onboardingCompleted: true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    sendEmail({ to: user.email, ...welcomeTemplate(user) }).catch(console.error);
    // Promo email sent after a short delay so it doesn't arrive simultaneously with welcome
    setTimeout(() => {
      sendEmail({ to: user.email, ...promoTemplate(user) }).catch(console.error);
    }, 60 * 60 * 1000); // 1 hour later

    return NextResponse.json(
      { success: true, userId: user._id.toString() },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: unknown }).name === 'ValidationError'
    ) {
      const message =
        'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
