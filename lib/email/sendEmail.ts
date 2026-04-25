import { sendMail, FROM_ADDRESS, APP_URL } from '@/lib/email/gmail';
import { renderTemplate } from '@/lib/email/template';
import { signUnsubscribeToken } from '@/lib/email/unsubscribeToken';
import type { INotificationPrefs } from '@/lib/models/User';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';

export interface SendEmailArgs {
  to: string;
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  userId?: string;
  preferenceKey?: keyof INotificationPrefs;
  preferenceLabel?: string;
}

export async function sendEmail(
  args: SendEmailArgs
): Promise<{ ok: boolean; skipped?: boolean }> {
  const { to, subject, preheader, heading, body, ctaText, ctaUrl, userId, preferenceKey, preferenceLabel } = args;

  if (userId && preferenceKey) {
    try {
      await dbConnect();
      const user = await User.findById(userId).select('notifications').lean();
      if (user && user.notifications[preferenceKey] === false) {
        return { ok: true, skipped: true };
      }
    } catch {
      // If user lookup fails, proceed with sending
    }
  }

  const unsubscribeUrl =
    userId && preferenceKey
      ? `${APP_URL}/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(userId, preferenceKey))}`
      : `${APP_URL}/settings/notifications`;

  const html = renderTemplate({
    preheader,
    heading,
    body,
    ctaText,
    ctaUrl,
    unsubscribeUrl,
    preferenceLabel,
  });

  try {
    await sendMail({ from: FROM_ADDRESS, to, subject, html });
    return { ok: true };
  } catch (err) {
    console.error('[sendEmail] Failed to send email:', err);
    return { ok: false };
  }
}
