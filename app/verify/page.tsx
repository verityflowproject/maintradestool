import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import Link from 'next/link';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth } from '@/auth';
import { sendEmailChangedNotification } from '@/lib/email/emailVerification';
import ExpiredClient from './ExpiredClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ token?: string; uid?: string; type?: string }>;
}

type VerifyResult =
  | { status: 'success'; isEmailChange: boolean }
  | { status: 'already_verified' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'email_change_conflict'; message: string };

async function verifyToken(
  uid: string,
  rawToken: string,
  type: string,
): Promise<VerifyResult> {
  await dbConnect();
  const user = await User.findById(uid);
  if (!user) return { status: 'invalid' };

  const isEmailChange = type === 'email-change';

  if (isEmailChange) {
    // Email-change flow: verify against pendingEmailChange.tokenHash
    const pending = user.pendingEmailChange;
    if (!pending) {
      // No pending change — already applied or cancelled
      return { status: 'already_verified' };
    }

    if (pending.expiresAt < new Date()) return { status: 'expired' };

    const match = await bcrypt.compare(rawToken, pending.tokenHash);
    if (!match) return { status: 'invalid' };

    const newEmail = pending.newEmail;

    // Uniqueness guard — race condition: someone else may have claimed the address
    const conflict = await User.exists({ email: newEmail, _id: { $ne: user._id } });
    if (conflict) {
      user.pendingEmailChange = null;
      await user.save();
      return {
        status: 'email_change_conflict',
        message:
          'That email address was registered by someone else before your confirmation arrived. Your old address remains active.',
      };
    }

    const oldEmail = user.email;
    user.email = newEmail;
    user.emailVerifiedAt = new Date();
    user.pendingEmailChange = null;
    user.emailVerified = true;
    await user.save();

    // Fire-and-forget notification to old address
    sendEmailChangedNotification(oldEmail, newEmail).catch(console.error);

    return { status: 'success', isEmailChange: true };
  }

  // Standard email verification flow
  if (user.emailVerified) return { status: 'already_verified' };

  if (
    !user.emailVerificationTokenHash ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt < new Date()
  ) {
    return { status: 'expired' };
  }

  const match = await bcrypt.compare(rawToken, user.emailVerificationTokenHash);
  if (!match) return { status: 'invalid' };

  // Mark verified — reset trial to give a full 14-day window from confirmation
  const now = new Date();
  user.emailVerified = true;
  user.emailVerifiedAt = now;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  user.trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await user.save();

  return { status: 'success', isEmailChange: false };
}

export default async function VerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawToken = params.token ?? '';
  const uid = params.uid ?? '';
  const type = params.type ?? '';

  if (!rawToken || !uid) {
    return <VerifyScreen result={{ status: 'invalid' }} />;
  }

  const result = await verifyToken(uid, rawToken, type);

  // If verification succeeded (or already verified), we still need the user to
  // have an active session. Pull the current session to decide what to render.
  const session = await auth();

  // Unauthenticated visitor who just verified — send them to sign-in with banner
  if (
    (result.status === 'success' || result.status === 'already_verified') &&
    !session?.user?.id
  ) {
    const dest =
      result.status === 'success'
        ? '/signin?verified=1'
        : '/signin?already_verified=1';
    redirect(dest);
  }

  // Authenticated visitor who verified from a different browser/device — trigger
  // a session update so the new emailVerified flag is reflected immediately.
  // We can't call useSession.update() in a server component, so we redirect to a
  // tiny client-side page that calls update() then bounces to /dashboard.
  if (result.status === 'success' && session?.user?.id) {
    const dest =
      type === 'email-change'
        ? '/verify/confirmed?type=email-change'
        : '/verify/confirmed';
    redirect(dest);
  }

  return <VerifyScreen result={result} uid={uid} />;
}

function VerifyScreen({
  result,
  uid,
}: {
  result: VerifyResult;
  uid?: string;
}) {
  if (result.status === 'success') {
    // This branch only renders if the redirect above didn't fire (shouldn't happen)
    return <SuccessScreen isEmailChange={result.isEmailChange} />;
  }
  if (result.status === 'already_verified') {
    return <AlreadyVerifiedScreen />;
  }
  if (result.status === 'expired' || result.status === 'invalid') {
    return <ExpiredClient uid={uid} />;
  }
  if (result.status === 'email_change_conflict') {
    return <ConflictScreen message={result.message} />;
  }
  return null;
}

function SuccessScreen({ isEmailChange }: { isEmailChange: boolean }) {
  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon verify-icon--success">✓</div>
        <h1 className="verify-title">
          {isEmailChange ? 'Email address updated!' : "You're all set!"}
        </h1>
        <p className="verify-body">
          {isEmailChange
            ? 'Your email address has been updated. You can now sign in with your new address.'
            : 'Your email is confirmed. Your 14-day trial has started — go make some money.'}
        </p>
        <Link href="/dashboard" className="btn-accent verify-cta">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

function AlreadyVerifiedScreen() {
  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon verify-icon--neutral">✓</div>
        <h1 className="verify-title">Already confirmed</h1>
        <p className="verify-body">
          This email address is already confirmed. You&#39;re good to go.
        </p>
        <Link href="/dashboard" className="btn-accent verify-cta">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}


function ConflictScreen({ message }: { message: string }) {
  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon verify-icon--warn">!</div>
        <h1 className="verify-title">Email address taken</h1>
        <p className="verify-body">{message}</p>
        <Link href="/settings/email" className="btn-accent verify-cta">
          Try a different email
        </Link>
      </div>
    </div>
  );
}
