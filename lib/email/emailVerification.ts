/**
 * Email-verification token lifecycle helpers.
 *
 * All token-related secrets stay in this file; raw tokens are ONLY ever placed
 * in the outbound email URL — never persisted to the database.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { IUser } from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import {
  verifyEmailTemplate,
  emailChangedNotificationTemplate,
} from '@/lib/email/templates';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://verityflow.io';

/** Raw token lifetime in milliseconds (48 hours). */
export const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Generate a fresh verification token, persist its bcrypt hash to the user
 * document (caller must `save()`), and return the raw token for inclusion in
 * the email CTA URL.
 *
 * Does NOT send the email — callers decide the delivery path.
 */
export async function generateVerificationToken(
  user: IUser,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const now = new Date();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpiresAt = new Date(now.getTime() + VERIFY_TOKEN_TTL_MS);
  user.emailVerificationLastSentAt = now;

  return rawToken;
}

/**
 * Send the verification email.
 * Builds the CTA link: ${APP_URL}/verify?token=<raw>&uid=<userId>
 */
export async function sendVerificationEmail(
  user: Pick<IUser, '_id' | 'email' | 'firstName'>,
  rawToken: string,
): Promise<void> {
  const link = `${APP_URL}/verify?token=${encodeURIComponent(rawToken)}&uid=${user._id}`;
  await sendEmail({ to: user.email, ...verifyEmailTemplate(user, link) });
}

/**
 * Send the verification email for a *pending email change* to the new address.
 * Builds the CTA link: ${APP_URL}/verify?token=<raw>&uid=<userId>&type=email-change
 */
export async function sendEmailChangeVerification(
  user: Pick<IUser, '_id' | 'email' | 'firstName'>,
  newEmail: string,
  rawToken: string,
): Promise<void> {
  const link = `${APP_URL}/verify?token=${encodeURIComponent(rawToken)}&uid=${user._id}&type=email-change`;
  await sendEmail({
    to: newEmail,
    ...verifyEmailTemplate(
      { ...user, email: newEmail },
      link,
      true,
    ),
  });
}

/**
 * Send the "your email was changed" notification to the OLD address.
 * Must be called atomically after the email swap succeeds.
 */
export async function sendEmailChangedNotification(
  oldEmail: string,
  newEmail: string,
): Promise<void> {
  await sendEmail({
    to: oldEmail,
    ...emailChangedNotificationTemplate(oldEmail, newEmail),
  });
}
