import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { isAdmin } from '@/lib/admin/isAdmin';
import ContactSubmission from '@/lib/models/ContactSubmission';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email/sendEmail';
import {
  contactReplyTemplate,
  featurePlannedTemplate,
  featureShippedTemplate,
} from '@/lib/email/templates';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PatchBody {
  status?: string;
  adminNotes?: string;
  publicReply?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: { submissionId: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { submissionId } = params;
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = (await req.json()) as PatchBody;
  const { status, adminNotes, publicReply } = body;

  const validStatuses = ['new', 'reviewing', 'planned', 'shipped', 'closed', 'wont_fix'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await dbConnect();

  const submission = await ContactSubmission.findById(submissionId);
  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const prevStatus = submission.status;
  const prevPublicReply = submission.publicReply ?? '';

  if (status !== undefined) submission.status = status as typeof submission.status;
  if (adminNotes !== undefined) submission.adminNotes = adminNotes;
  if (publicReply !== undefined) {
    submission.publicReply = publicReply;
    submission.adminReplyAt = new Date();
  }

  await submission.save();

  // Load submitter for email
  const dbUser = await User.findById(submission.userId)
    .select('email firstName notifications')
    .lean() as {
      _id: mongoose.Types.ObjectId;
      email: string;
      firstName: string;
      notifications?: { productUpdates?: boolean };
    } | null;

  if (dbUser) {
    const userObj = {
      _id: dbUser._id,
      email: dbUser.email,
      firstName: dbUser.firstName,
    };
    const subObj = {
      _id: String(submission._id),
      title: submission.title,
      type: submission.type,
    };

    // publicReply changed
    if (
      publicReply !== undefined &&
      publicReply.trim() &&
      publicReply.trim() !== prevPublicReply.trim()
    ) {
      sendEmail({
        to: dbUser.email,
        ...contactReplyTemplate(userObj, subObj, publicReply),
      }).catch((err) => console.error('[admin/feedback PATCH] reply email failed:', err));
    }

    // status transitioned to planned
    if (status === 'planned' && prevStatus !== 'planned') {
      sendEmail({
        to: dbUser.email,
        ...featurePlannedTemplate(userObj, subObj),
      }).catch((err) => console.error('[admin/feedback PATCH] planned email failed:', err));
    }

    // status transitioned to shipped
    if (status === 'shipped' && prevStatus !== 'shipped') {
      sendEmail({
        to: dbUser.email,
        ...featureShippedTemplate(userObj, subObj),
      }).catch((err) => console.error('[admin/feedback PATCH] shipped email failed:', err));
    }
  }

  return NextResponse.json({ ok: true, submission });
}
