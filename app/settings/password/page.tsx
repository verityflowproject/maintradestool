import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordSettingsClient from './PasswordSettingsClient';

export default async function PasswordSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id).select('password').lean();
  if (!user) redirect('/');

  // If OAuth-only user, they shouldn't be here (hub hides the link, but just in case)
  if (!user.password) redirect('/settings');

  return <PasswordSettingsClient />;
}
