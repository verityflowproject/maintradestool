import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Customer from '@/lib/models/Customer';
import Invoice from '@/lib/models/Invoice';
import BookingRequest from '@/lib/models/BookingRequest';
import mongoose from 'mongoose';

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

  await Promise.all([
    Job.deleteMany({ userId }),
    Customer.deleteMany({ userId }),
    Invoice.deleteMany({ userId }),
    BookingRequest.deleteMany({ userId }),
  ]);

  await User.findByIdAndDelete(userId);

  return NextResponse.json({ success: true });
}
