import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ReviewClient from './ReviewClient';

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('hourlyRate partsMarkup')
    .lean<{ hourlyRate?: number; partsMarkup?: number } | null>();

  return (
    <ReviewClient
      defaultRate={user?.hourlyRate ?? 0}
      defaultMarkup={user?.partsMarkup ?? 0}
    />
  );
}
