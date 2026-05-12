import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  validatePhone,
  validateEmail,
  validateHourlyRate,
  validateMarkup,
  validateTaxRate,
  validateLateFee,
  validateBusinessName,
  validatePersonName,
  validateFreeTextShort,
  stripNullBytes,
} from '@/lib/utils/validators';
import { validateEmailFull } from '@/lib/utils/validators.server';
import {
  sendEmailChangeVerification,
} from '@/lib/email/emailVerification';

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

// Fields members are allowed to update on their own profile.
// All other SCALAR_FIELDS are silently dropped for members.
const MEMBER_ALLOWED_FIELDS = new Set<string>(['firstName', 'phone']);

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

  // Handle email change — start a pendingEmailChange flow instead of applying immediately
  if ('email' in body && body.email) {
    const newEmail = String(body.email).trim().toLowerCase();
    if (newEmail !== user.email) {
      // OAuth-only users cannot change email via password
      if (!user.password) {
        return NextResponse.json(
          { error: 'Password verification not available for OAuth accounts. To change your email you must remove and re-add Google with a different account.' },
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
          { error: 'Current password is incorrect.' },
          { status: 400 },
        );
      }

      // Validate new email: syntax + MX + disposable blocklist
      const emailErr = await validateEmailFull(newEmail);
      if (emailErr) {
        return NextResponse.json({ error: emailErr }, { status: 400 });
      }

      // Uniqueness check
      const conflict = await User.exists({ email: newEmail, _id: { $ne: user._id } });
      if (conflict) {
        return NextResponse.json(
          { error: 'That email is already in use.' },
          { status: 409 },
        );
      }

      // Issue a pending-change token — the actual flip happens on /verify confirmation
      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      user.pendingEmailChange = {
        newEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };
      await user.save();

      sendEmailChangeVerification(user, newEmail, rawToken).catch(console.error);

      return NextResponse.json({
        ok: true,
        pendingEmailChange: true,
        message: `A confirmation link has been sent to ${newEmail}. Your current email stays active until you confirm.`,
      });
    }
  }

  // Cancel a pending email-change
  if (body.cancelEmailChange === true) {
    if (user.pendingEmailChange) {
      user.pendingEmailChange = null;
      await user.save();
    }
    return NextResponse.json({ ok: true, cancelled: true });
  }

  const isMember = session.user.accountType === 'member';

  // Validate specific fields before applying
  if ('firstName' in body && body.firstName != null) {
    const err = validatePersonName(String(body.firstName).trim(), 'First name');
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('defaultInvoiceNote' in body && body.defaultInvoiceNote != null) {
    const err = validateFreeTextShort(String(body.defaultInvoiceNote), 'Invoice note');
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    body.defaultInvoiceNote = stripNullBytes(String(body.defaultInvoiceNote));
  }
  if ('phone' in body && body.phone != null) {
    const err = validatePhone(String(body.phone));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('businessEmail' in body && body.businessEmail) {
    const err = validateEmail(String(body.businessEmail));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('businessName' in body && body.businessName) {
    const err = validateBusinessName(String(body.businessName));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('hourlyRate' in body && body.hourlyRate != null) {
    const err = validateHourlyRate(String(body.hourlyRate));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('partsMarkup' in body && body.partsMarkup != null) {
    const err = validateMarkup(String(body.partsMarkup));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('defaultTaxRate' in body && body.defaultTaxRate != null) {
    const err = validateTaxRate(String(body.defaultTaxRate));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('lateFeePercent' in body && body.lateFeePercent != null) {
    const err = validateLateFee(String(body.lateFeePercent));
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // Apply scalar fields — members silently drop owner-only fields to keep forms forgiving
  for (const key of SCALAR_FIELDS) {
    if (key in body) {
      if (isMember && !MEMBER_ALLOWED_FIELDS.has(key)) {
        // silently drop disallowed field for members
        continue;
      }
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
