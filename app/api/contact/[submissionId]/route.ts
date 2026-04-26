import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import ContactSubmission from '@/lib/models/ContactSubmission';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { submissionId: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { submissionId } = params;
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await dbConnect();

  const submission = await ContactSubmission.findOne({
    _id: submissionId,
    userId: session.user.id,
  })
    .select('-adminNotes -upvotedBy')
    .lean();

  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ submission });
}
