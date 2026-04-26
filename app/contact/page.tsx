import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ContactClient from './ContactClient';

export default async function ContactPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/onboarding');
  }

  await dbConnect();
  const dbUser = await User.findById(session.user.id)
    .select('firstName businessName email')
    .lean() as { firstName: string; businessName: string; email: string } | null;

  return (
    <ContactClient
      firstName={dbUser?.firstName ?? ''}
      businessName={dbUser?.businessName ?? ''}
    />
  );
}
