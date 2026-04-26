import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import SubmissionDetailClient from './SubmissionDetailClient';

interface Props {
  params: { submissionId: string };
}

export default async function SubmissionDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/onboarding');
  }
  return <SubmissionDetailClient submissionId={params.submissionId} />;
}
