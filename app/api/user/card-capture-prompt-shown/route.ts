import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  void req;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  await User.updateOne(
    { _id: session.user.id },
    { $set: { cardCapturePromptShown: true } },
  );

  return NextResponse.json({ success: true });
}
