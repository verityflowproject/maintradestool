import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { isAdmin } from '@/lib/admin/isAdmin';
import ContactSubmission from '@/lib/models/ContactSubmission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 25;
  const skip = (page - 1) * limit;

  const validTypes = ['feature_request', 'bug_report', 'feedback', 'support', 'partnership', 'other'];
  const validStatuses = ['new', 'reviewing', 'planned', 'shipped', 'closed', 'wont_fix'];

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (type !== 'all' && validTypes.includes(type)) filter.type = type;
  if (status !== 'all' && validStatuses.includes(status)) filter.status = status;

  const [items, total] = await Promise.all([
    ContactSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-upvotedBy')
      .lean(),
    ContactSubmission.countDocuments(filter),
  ]);

  return NextResponse.json({ items, page, total });
}
