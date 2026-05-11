import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeamAccessRevokedClient from './TeamAccessRevokedClient';

export default async function TeamAccessRevokedPage() {
  const session = await auth();

  if (!session?.user?.id) redirect('/');

  // Only deactivated members should land here; owners and active members → dashboard
  if (session.user.accountType !== 'member') {
    redirect('/dashboard');
  }

  // If somehow an active member hits this URL, bounce them back
  if (session.user.memberActive !== false) {
    redirect('/dashboard');
  }

  await dbConnect();

  const owner = await User.findById(session.user.parentOwnerId)
    .select('businessName firstName')
    .lean<{ businessName: string; firstName: string } | null>();

  return (
    <TeamAccessRevokedClient
      ownerBusinessName={owner?.businessName ?? 'Your team'}
      ownerFirstName={owner?.firstName ?? 'The owner'}
    />
  );
}
