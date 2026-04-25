import Link from 'next/link';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribeToken';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';

const PREFERENCE_LABELS: Record<string, string> = {
  newBookingRequest: 'new booking request',
  invoicePaid: 'invoice paid',
  invoiceOverdue: 'overdue invoice',
  weeklyReport: 'weekly report',
  productUpdates: 'product update',
  trialReminders: 'trial reminder',
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <UnsubscribeError message="No token provided." />;
  }

  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) {
    return <UnsubscribeError message="This link is invalid or has expired." />;
  }

  const { userId, preferenceKey } = decoded;

  try {
    await dbConnect();
    await User.updateOne(
      { _id: userId },
      { $set: { [`notifications.${preferenceKey}`]: false } }
    );
  } catch {
    return <UnsubscribeError message="Something went wrong. Please try again." />;
  }

  const label = PREFERENCE_LABELS[preferenceKey] ?? preferenceKey;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        padding: '24px',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          Unsubscribed
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          You&apos;ve been unsubscribed from <strong>{label}</strong> emails. You won&apos;t receive
          these notifications anymore.
        </p>
        <Link
          href="/settings/notifications"
          style={{
            display: 'inline-block',
            background: 'var(--quartz-border)',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Manage all preferences
        </Link>
      </div>
    </div>
  );
}

function UnsubscribeError({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        padding: '24px',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          Invalid Link
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
          {message}
        </p>
        <Link
          href="/settings/notifications"
          style={{
            display: 'inline-block',
            background: 'var(--quartz-border)',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Manage preferences
        </Link>
      </div>
    </div>
  );
}
