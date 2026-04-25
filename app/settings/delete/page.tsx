import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import DeleteAccountClient from './DeleteAccountClient';

export default async function DeleteAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id).select('email').lean();
  if (!user) redirect('/');

  return <DeleteAccountClient userEmail={user.email} />;
}
