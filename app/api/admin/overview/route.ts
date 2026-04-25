import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { isAdmin } from '@/lib/admin/isAdmin';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHLY_PRICE = 29;
const ANNUAL_MONTHLY_PRICE = 290 / 12; // ~24.17

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return new Response(null, { status: 404 });
  }

  await dbConnect();

  const now = new Date();

  const [
    totalUsers,
    trialUsers,
    proUsers,
    churnedUsers,
    expiredTrialCount,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    totalJobs,
    totalInvoices,
    mrrAgg,
    invoiceVolumeAgg,
    signupsChartAgg,
    topTradesAgg,
    recentSignups,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ plan: 'trial', trialEndsAt: { $gt: now } }),
    User.countDocuments({ plan: 'pro', subscriptionStatus: 'active' }),
    User.countDocuments({
      $or: [{ plan: 'cancelled' }, { subscriptionStatus: 'canceled' }],
    }),
    // Expired trials = trial users whose trial has already ended
    User.countDocuments({ plan: 'trial', trialEndsAt: { $lte: now } }),
    User.countDocuments({ createdAt: { $gte: startOfToday() } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    Job.countDocuments({}),
    Invoice.countDocuments({}),
    // MRR aggregation over active pro subscriptions
    User.aggregate([
      { $match: { plan: 'pro', subscriptionStatus: 'active' } },
      {
        $group: {
          _id: null,
          mrr: {
            $sum: {
              $cond: [
                { $eq: ['$subscriptionPlan', 'annual'] },
                ANNUAL_MONTHLY_PRICE,
                MONTHLY_PRICE,
              ],
            },
          },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, sum: { $sum: '$total' } } },
    ]),
    // Signups per day for last 30 days
    User.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $group: { _id: '$trade', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    User.find(
      {},
      { email: 1, firstName: 1, businessName: 1, trade: 1, plan: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const mrr = Math.round((mrrAgg[0]?.mrr ?? 0) as number);
  const arr = mrr * 12;
  const totalInvoiceVolume = Math.round((invoiceVolumeAgg[0]?.sum ?? 0) as number);

  // Conversion rate: proUsers / (proUsers + churnedUsers + expiredTrialCount) * 100
  const conversionDenominator = proUsers + churnedUsers + expiredTrialCount;
  const conversionRate =
    conversionDenominator > 0
      ? Math.round((proUsers / conversionDenominator) * 1000) / 10
      : 0;

  // Build signupsChart: back-fill zeros for the full 30-day range
  const signupsMap = new Map<string, number>();
  (signupsChartAgg as Array<{ _id: string; count: number }>).forEach((row) =>
    signupsMap.set(row._id, row.count)
  );
  const signupsChart: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = formatDateKey(daysAgo(i));
    signupsChart.push({ date, count: signupsMap.get(date) ?? 0 });
  }

  // mrrChart: 30-day approximation using 30 parallel proUser counts per day end
  // For performance, generate via a single aggregation: bucket active pro users by
  // their createdAt date and accumulate running count per day.
  // Simplified approximation: just run 30 parallel countDocuments
  const avgPricePerUser = proUsers > 0 ? mrr / proUsers : MONTHLY_PRICE;

  const mrrChartEntries = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const dayEnd = daysAgo(29 - i);
      const dayDate = formatDateKey(dayEnd);
      return User.countDocuments({
        plan: 'pro',
        createdAt: { $lte: dayEnd },
        $or: [
          { subscriptionEndsAt: null },
          { subscriptionEndsAt: { $exists: false } },
          { subscriptionEndsAt: { $gte: dayEnd } },
        ],
      }).then((count) => ({
        date: dayDate,
        mrr: Math.round(count * avgPricePerUser),
      }));
    })
  );

  return NextResponse.json({
    totalUsers,
    trialUsers,
    proUsers,
    churnedUsers,
    mrr,
    arr,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    conversionRate,
    totalJobs,
    totalInvoices,
    totalInvoiceVolume,
    signupsChart,
    mrrChart: mrrChartEntries,
    topTrades: topTradesAgg,
    recentSignups,
  });
}
