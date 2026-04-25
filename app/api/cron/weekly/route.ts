export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCron } from '@/lib/cron/requireCron';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import Customer from '@/lib/models/Customer';
import { sendEmail } from '@/lib/email/sendEmail';
import { weeklyReportTemplate, type WeeklyReportStats } from '@/lib/email/templates';
import type { Types } from 'mongoose';

async function getUserWeeklyStats(
  userId: Types.ObjectId | string,
  since: Date
): Promise<WeeklyReportStats> {
  const [jobs, invoices, revenueResult, newCustomers, outstandingResult, topCustomerResult] =
    await Promise.all([
      Job.countDocuments({ userId, createdAt: { $gte: since } }),
      Invoice.countDocuments({ userId, createdAt: { $gte: since } }),
      Invoice.aggregate([
        {
          $match: {
            userId,
            status: 'paid',
            paidDate: { $gte: since },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Customer.countDocuments({ userId, createdAt: { $gte: since } }),
      Invoice.aggregate([
        { $match: { userId, status: { $in: ['sent', 'overdue'] } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: '$total' },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            userId,
            status: 'paid',
            paidDate: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$customerName',
            total: { $sum: '$total' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ]),
    ]);

  return {
    jobs,
    invoices,
    revenue: revenueResult[0]?.total ?? 0,
    newCustomers,
    outstandingCount: outstandingResult[0]?.count ?? 0,
    outstandingTotal: outstandingResult[0]?.total ?? 0,
    topCustomerName: topCustomerResult[0]?._id ?? undefined,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  if (!requireCron(req)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await dbConnect();
  const since = new Date(Date.now() - 7 * 86_400_000);

  const users = await User.find({ 'notifications.weeklyReport': true }).lean();

  let sent = 0;
  let skipped = 0;

  const userChunks = chunkArray(users, 10);
  for (const chunk of userChunks) {
    await Promise.all(
      chunk.map(async (user) => {
        try {
          const stats = await getUserWeeklyStats(user._id, since);

          // Skip users with no activity
          if (
            stats.jobs === 0 &&
            stats.invoices === 0 &&
            stats.revenue === 0 &&
            stats.newCustomers === 0
          ) {
            skipped++;
            return;
          }

          await sendEmail({
            to: user.email,
            ...weeklyReportTemplate(user, stats),
          });
          sent++;
        } catch (err) {
          console.error('[cron/weekly] Error for user', user._id, err);
        }
      })
    );
  }

  return NextResponse.json({ ok: true, sent, skipped, total: users.length });
}
