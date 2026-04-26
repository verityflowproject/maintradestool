import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import FeatureBoardClient from './FeatureBoardClient';

export default async function FeatureBoardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/onboarding');
  }
  return <FeatureBoardClient />;
}
