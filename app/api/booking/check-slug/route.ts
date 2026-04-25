import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug')?.toLowerCase().trim() ?? '';

  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false });
  }

  await dbConnect();

  const conflict = await User.exists({
    bookingSlug: slug,
    _id: { $ne: session.user.id },
  });

  return NextResponse.json({ available: !conflict });
}
