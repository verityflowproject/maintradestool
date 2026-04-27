import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import HelpCenterClient from './HelpCenterClient';

export default async function HelpCenterPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/onboarding');
  }

  await dbConnect();
  const dbUser = await User.findById(session.user.id)
    .select('firstName')
    .lean() as { firstName: string } | null;

  return <HelpCenterClient firstName={dbUser?.firstName ?? ''} />;
}
