import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import ContactSubmission from '@/lib/models/ContactSubmission';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const sort = searchParams.get('sort') ?? 'top';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const validStatuses = ['new', 'reviewing', 'planned', 'shipped', 'closed', 'wont_fix'];

  await dbConnect();

  const filter: Record<string, unknown> = { type: 'feature_request' };
  if (status !== 'all' && validStatuses.includes(status)) {
    filter.status = status;
  }

  type SortSpec = Record<string, 1 | -1>;
  const sortObj: SortSpec =
    sort === 'recent'
      ? { createdAt: -1 }
      : { upvotes: -1, createdAt: -1 };

  const [items, totalCount, shippedCount] = await Promise.all([
    ContactSubmission.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select(
        '_id title problemSolved description status upvotes upvotedBy createdAt publicReply submitterFirstName submitterTrade'
      )
      .lean(),
    ContactSubmission.countDocuments(filter),
    ContactSubmission.countDocuments({ type: 'feature_request', status: 'shipped' }),
  ]);

  const currentUserId = new mongoose.Types.ObjectId(session.user.id);

  const publicItems = items.map((item) => {
    const upvotedBy = (item.upvotedBy as mongoose.Types.ObjectId[]) ?? [];
    const hasUpvoted = upvotedBy.some((id) => id.equals(currentUserId));
    return {
      _id: item._id,
      title: item.title,
      problemSolved: item.problemSolved,
      description: item.description,
      status: item.status,
      upvotes: item.upvotes,
      createdAt: item.createdAt,
      publicReply: item.publicReply,
      submitterFirstName: item.userFirstName,
      submitterTrade: item.submitterTrade,
      hasUpvoted,
    };
  });

  return NextResponse.json({
    items: publicItems,
    page,
    total: totalCount,
    shippedCount,
    totalCount,
  });
}
