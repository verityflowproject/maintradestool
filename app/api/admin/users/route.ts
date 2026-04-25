import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return new Response(null, { status: 404 });

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const search = (searchParams.get('search') ?? '').trim();
  const plan = searchParams.get('plan') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, unknown> = {};
  if (plan !== 'all') filter.plan = plan;
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ email: rx }, { firstName: rx }, { businessName: rx }];
  }

  const [totalCount, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter, {
      email: 1,
      firstName: 1,
      businessName: 1,
      trade: 1,
      plan: 1,
      subscriptionStatus: 1,
      subscriptionPlan: 1,
      trialEndsAt: 1,
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const userIds = users.map((u) => (u._id as mongoose.Types.ObjectId));

  // Per-user aggregates
  const [jobCounts, invoiceCounts, invoiceVolumes] = await Promise.all([
    Job.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { userId: { $in: userIds }, status: 'paid' } },
      { $group: { _id: '$userId', volume: { $sum: '$total' } } },
    ]),
  ]);

  const jobCountMap = new Map(jobCounts.map((r: { _id: mongoose.Types.ObjectId; count: number }) => [r._id.toString(), r.count]));
  const invoiceCountMap = new Map(invoiceCounts.map((r: { _id: mongoose.Types.ObjectId; count: number }) => [r._id.toString(), r.count]));
  const invoiceVolumeMap = new Map(invoiceVolumes.map((r: { _id: mongoose.Types.ObjectId; volume: number }) => [r._id.toString(), r.volume]));

  const enriched = users.map((u) => {
    const id = (u._id as mongoose.Types.ObjectId).toString();
    return {
      ...u,
      _id: id,
      jobCount: jobCountMap.get(id) ?? 0,
      invoiceCount: invoiceCountMap.get(id) ?? 0,
      totalInvoiceVolume: invoiceVolumeMap.get(id) ?? 0,
    };
  });

  return NextResponse.json({
    users: enriched,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  });
}
