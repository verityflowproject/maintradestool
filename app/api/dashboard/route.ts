import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import BookingRequest from '@/lib/models/BookingRequest';

export const runtime = 'nodejs';

// ── Helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build 7-day array (oldest → today) filled with zeroes, then merge in agg results. */
function buildWeeklyEarnings(
  startOf7Days: Date,
  agg: { _id: string; total: number }[],
): { date: string; total: number }[] {
  const map = new Map(agg.map((r) => [r._id, r.total]));
  const result: { date: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOf7Days);
    d.setDate(d.getDate() + (6 - i));
    const key = toDateStr(d);
    result.push({ date: key, total: map.get(key) ?? 0 });
  }
  return result;
}

// ── GET /api/dashboard ───────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const userId = new Types.ObjectId(session.user.id);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOf7Days = new Date(startOfToday);
  startOf7Days.setDate(startOf7Days.getDate() - 6);

  const [
    jobsToday,
    earnedTodayAgg,
    unpaidAgg,
    recentJobsRaw,
    weeklyAgg,
    overdueCount,
    newRequestsCount,
  ] = await Promise.all([
    // 1. Jobs created today
    Job.countDocuments({ userId, createdAt: { $gte: startOfToday } }),

    // 2. Revenue earned today (invoices paid today)
    Invoice.aggregate<{ total: number }>([
      {
        $match: {
          userId,
          status: 'paid',
          paidDate: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),

    // 3. Unpaid invoices (draft + sent)
    Invoice.aggregate<{ count: number; total: number }>([
      {
        $match: {
          userId,
          status: { $in: ['sent', 'draft'] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]),

    // 4. Recent 5 jobs
    Job.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title status customerName total createdAt aiParsed invoiceId')
      .lean<
        {
          _id: unknown;
          title?: string;
          status?: string;
          customerName?: string;
          total?: number;
          createdAt?: Date;
          aiParsed?: boolean;
          invoiceId?: unknown;
        }[]
      >(),

    // 5. Weekly earnings (paid invoices in last 7 days, grouped by day)
    Invoice.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId,
          status: 'paid',
          paidDate: { $gte: startOf7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidDate' },
          },
          total: { $sum: '$total' },
        },
      },
    ]),

    // 6. Overdue invoices
    Invoice.countDocuments({
      userId,
      status: 'sent',
      dueDate: { $lt: startOfToday },
    }),

    // 7. New booking requests
    BookingRequest.countDocuments({ userId, status: 'new' }),
  ]);

  // Derive scalar values from aggregation results
  const earnedToday = earnedTodayAgg[0]?.total ?? 0;
  const unpaidCount = unpaidAgg[0]?.count ?? 0;
  const unpaidTotal = unpaidAgg[0]?.total ?? 0;
  const weeklyEarnings = buildWeeklyEarnings(startOf7Days, weeklyAgg);

  const recentJobs = recentJobsRaw.map((j) => ({
    _id: String(j._id),
    title: j.title ?? '',
    status: j.status ?? 'draft',
    customerName: j.customerName ?? '',
    total: j.total ?? 0,
    createdAt: j.createdAt ? j.createdAt.toISOString() : '',
    aiParsed: j.aiParsed ?? false,
    invoiceId: j.invoiceId ? String(j.invoiceId) : null,
  }));

  return NextResponse.json({
    jobsToday,
    earnedToday,
    unpaidCount,
    unpaidTotal,
    overdueCount,
    newRequestsCount,
    recentJobs,
    weeklyEarnings,
  });
}
