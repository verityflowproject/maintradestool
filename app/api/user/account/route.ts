import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import Invoice from '@/lib/models/Invoice';
import BookingRequest from '@/lib/models/BookingRequest';
import TeamMember from '@/lib/models/TeamMember';
import mongoose from 'mongoose';
import { sendEmail } from '@/lib/email/sendEmail';
import { ownerAccountClosedTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { confirmEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.confirmEmail || body.confirmEmail !== session.user.email) {
    return NextResponse.json(
      { error: 'Email confirmation does not match.' },
      { status: 400 },
    );
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  if (session.user.accountType === 'member') {
    // Member deletes own account: unlink from TeamMember, don't touch owner's data
    if (session.user.linkedTeamMemberId) {
      await TeamMember.updateOne(
        { _id: session.user.linkedTeamMemberId },
        { $set: { linkedUserId: null, active: false } },
      );
    }
    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true });
  }

  // Owner: notify and soft-deactivate linked members before deleting owner data
  const owner = await User.findById(userId)
    .select('firstName businessName email')
    .lean<{ firstName: string; businessName: string; email: string } | null>();

  if (owner) {
    const linkedMembers = await TeamMember.find({
      ownerUserId: userId,
      linkedUserId: { $ne: null },
      active: true,
    })
      .select('_id name email linkedUserId')
      .lean<{ _id: mongoose.Types.ObjectId; name: string; email?: string; linkedUserId: mongoose.Types.ObjectId }[]>();

    for (const m of linkedMembers) {
      if (m.email) {
        sendEmail({
          to: m.email,
          ...ownerAccountClosedTemplate(owner, m.name),
        }).catch(console.error);
      }
    }
  }

  // Soft-deactivate all team member records under this owner (member User records are preserved)
  await TeamMember.updateMany(
    { ownerUserId: userId },
    { $set: { active: false, linkedUserId: null } },
  );

  // Delete owner's business data
  await Promise.all([
    Job.deleteMany({ userId }),
    Customer.deleteMany({ userId }),
    Invoice.deleteMany({ userId }),
    BookingRequest.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);

  return NextResponse.json({ success: true });
}
