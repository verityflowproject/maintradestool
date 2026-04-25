import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const SCALAR_FIELDS = [
  'firstName',
  'businessName',
  'trade',
  'teamSize',
  'jobType',
  'experienceYears',
  'painPoints',
  'hourlyRate',
  'partsMarkup',
  'defaultTaxRate',
  'region',
  'invoiceMethod',
  'paymentTerms',
  'defaultInvoiceNote',
  'lateFeePercent',
  'phone',
  'businessEmail',
  'onboardingCompleted',
] as const;

export async function GET(req: Request) {
  void req;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select('-password').lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Handle email change — requires password verification
  if ('email' in body && body.email) {
    const newEmail = String(body.email).trim().toLowerCase();
    if (newEmail !== user.email) {
      // OAuth-only users cannot change email via password
      if (!user.password) {
        return NextResponse.json(
          { error: 'Password verification not available for OAuth accounts.' },
          { status: 400 },
        );
      }
      const currentPassword = body.currentPassword ? String(body.currentPassword) : '';
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change email.' },
          { status: 400 },
        );
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 },
        );
      }
      // Uniqueness check
      const conflict = await User.exists({ email: newEmail, _id: { $ne: user._id } });
      if (conflict) {
        return NextResponse.json(
          { error: 'That email is already in use.' },
          { status: 409 },
        );
      }
      user.email = newEmail;
    }
  }

  // Apply scalar fields
  for (const key of SCALAR_FIELDS) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any)[key] = body[key];
    }
  }

  // Merge notifications (partial update)
  if (body.notifications && typeof body.notifications === 'object') {
    const notifPatch = body.notifications as Record<string, boolean>;
    const notifKeys: Array<keyof typeof user.notifications> = [
      'newBookingRequest',
      'invoicePaid',
      'invoiceOverdue',
      'weeklyReport',
      'productUpdates',
    ];
    for (const k of notifKeys) {
      if (k in notifPatch) {
        user.notifications[k] = notifPatch[k];
      }
    }
    user.markModified('notifications');
  }

  await user.save();

  const updatedUser = user.toObject();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (updatedUser as any).password;

  return NextResponse.json({ user: updatedUser });
}
