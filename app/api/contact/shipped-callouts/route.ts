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

  const callouts = await ContactSubmission.find({
    userId: session.user.id,
    type: 'feature_request',
    status: 'shipped',
    userNotifiedOfShip: false,
  })
    .limit(3)
    .select('_id title description')
    .lean();

  return NextResponse.json({ callouts });
}
