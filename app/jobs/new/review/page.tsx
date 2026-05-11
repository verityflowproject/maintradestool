import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ReviewClient from './ReviewClient';

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId } = await import('@/lib/auth/scope');
  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();
  const ownerId = getEOId(session);
  const user = await User.findById(ownerId)
    .select('hourlyRate partsMarkup')
    .lean<{ hourlyRate?: number; partsMarkup?: number } | null>();

  return (
    <ReviewClient
      defaultRate={user?.hourlyRate ?? 0}
      defaultMarkup={user?.partsMarkup ?? 0}
    />
  );
}
