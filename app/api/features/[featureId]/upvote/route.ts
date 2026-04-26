import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import ContactSubmission from '@/lib/models/ContactSubmission';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: { featureId: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { featureId } = params;
  if (!mongoose.Types.ObjectId.isValid(featureId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await dbConnect();

  const submission = await ContactSubmission.findOne({
    _id: featureId,
    type: 'feature_request',
  });

  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const idx = submission.upvotedBy.findIndex((id) => id.equals(userId));

  if (idx >= 0) {
    submission.upvotedBy.splice(idx, 1);
    submission.upvotes = Math.max(0, (submission.upvotes ?? 1) - 1);
  } else {
    submission.upvotedBy.push(userId);
    submission.upvotes = (submission.upvotes ?? 0) + 1;
  }

  await submission.save();

  return NextResponse.json({ upvoted: idx < 0, upvotes: submission.upvotes });
}
