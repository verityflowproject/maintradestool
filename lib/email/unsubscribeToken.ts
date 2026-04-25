import { createHmac } from 'crypto';
import type { INotificationPrefs } from '@/lib/models/User';
import { APP_URL } from '@/lib/email/resend';

function getSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'fallback-secret';
}

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromB64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signUnsubscribeToken(
  userId: string,
  preferenceKey: keyof INotificationPrefs,
  ttlDays = 60
): string {
  const payload = b64url(
    JSON.stringify({ userId, preferenceKey, exp: Date.now() + ttlDays * 86_400_000 })
  );
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; preferenceKey: keyof INotificationPrefs } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(fromB64url(payload)) as {
      userId: string;
      preferenceKey: keyof INotificationPrefs;
      exp: number;
    };
    if (Date.now() > data.exp) return null;
    return { userId: data.userId, preferenceKey: data.preferenceKey };
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(
  userId: string,
  preferenceKey: keyof INotificationPrefs
): string {
  const token = signUnsubscribeToken(userId, preferenceKey);
  return `${APP_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}
