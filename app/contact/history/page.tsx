import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import HistoryClient from './HistoryClient';

export default async function ContactHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/onboarding');
  }
  return <HistoryClient />;
}
