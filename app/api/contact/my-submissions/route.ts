import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import ContactSubmission from '@/lib/models/ContactSubmission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await dbConnect();

  const { effectiveOwnerId } = await import('@/lib/auth/scope');
  const submissions = await ContactSubmission.find({ userId: effectiveOwnerId(session) })
    .sort({ createdAt: -1 })
    .select('-adminNotes -upvotedBy')
    .lean();

  return NextResponse.json({ submissions });
}
