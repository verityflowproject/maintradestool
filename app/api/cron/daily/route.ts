export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCron } from '@/lib/cron/requireCron';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import Job from '@/lib/models/Job';
import { sendEmail } from '@/lib/email/sendEmail';
import {
  overdueReminderTemplate,
  trialWarningTemplate,
  trialExpiredTemplate,
} from '@/lib/email/templates';

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  if (!requireCron(req)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await dbConnect();
  const now = new Date();
  const todayStart = startOfDay(now);

  const results: Record<string, unknown> = {};

  // Task 1 — Mark overdue invoices
  try {
    const r = await Invoice.updateMany(
      { status: 'sent', dueDate: { $lt: todayStart } },
      { $set: { status: 'overdue' } }
    );
    results.markedOverdue = r.modifiedCount;
  } catch (err) {
    console.error('[cron/daily] Task 1 error:', err);
    results.markedOverdueError = String(err);
  }

  // Task 2 — Send overdue reminder emails (first reminder only)
  try {
    const overdueInvoices = await Invoice.find({
      status: 'overdue',
      overdueEmailsSent: 0,
    }).lean();

    let remindersSent = 0;
    for (const invoice of overdueInvoices) {
      try {
        const user = await User.findById(invoice.userId).lean();
        if (!user) continue;
        if (user.notifications?.invoiceOverdue === false) continue;

        const daysOverdue = Math.max(
          1,
          Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000)
        );

        await sendEmail({
          to: user.email,
          ...overdueReminderTemplate(
            user,
            invoice,
            invoice.customerName || 'Customer',
            daysOverdue
          ),
        });

        await Invoice.updateOne({ _id: invoice._id }, { $inc: { overdueEmailsSent: 1 } });
        remindersSent++;
      } catch (err) {
        console.error('[cron/daily] Overdue reminder error for invoice', invoice._id, err);
      }
    }
    results.overdueRemindersSent = remindersSent;
  } catch (err) {
    console.error('[cron/daily] Task 2 error:', err);
    results.overdueRemindersError = String(err);
  }

  // Task 3 — Trial ending warnings
  try {
    const trialUsers = await User.find({
      plan: 'trial',
      trialEndsAt: { $gt: now },
    });

    let warningsSent = 0;
    for (const user of trialUsers) {
      try {
        const daysLeft = Math.ceil(
          (new Date(user.trialEndsAt).getTime() - now.getTime()) / 86_400_000
        );

        type WarningKey = 'sevenDay' | 'threeDay' | 'oneDay';
        const checkpoints: Array<{ days: number; key: WarningKey }> = [
          { days: 7, key: 'sevenDay' },
          { days: 3, key: 'threeDay' },
          { days: 1, key: 'oneDay' },
        ];

        for (const { days, key } of checkpoints) {
          if (daysLeft === days && !user.trialWarningsSent?.[key]) {
            let stats: { jobsCount: number; revenue: number } | undefined;

            if (days === 3) {
              const [jobsCount, revenueResult] = await Promise.all([
                Job.countDocuments({ userId: user._id }),
                Invoice.aggregate([
                  { $match: { userId: user._id, status: 'paid' } },
                  { $group: { _id: null, total: { $sum: '$total' } } },
                ]),
              ]);
              stats = {
                jobsCount,
                revenue: revenueResult[0]?.total ?? 0,
              };
            }

            await sendEmail({
              to: user.email,
              ...trialWarningTemplate(user, daysLeft, stats),
            });

            user.trialWarningsSent = user.trialWarningsSent ?? {
              sevenDay: false,
              threeDay: false,
              oneDay: false,
            };
            user.trialWarningsSent[key] = true;
            await user.save();
            warningsSent++;
          }
        }
      } catch (err) {
        console.error('[cron/daily] Trial warning error for user', user._id, err);
      }
    }
    results.trialWarningsSent = warningsSent;
  } catch (err) {
    console.error('[cron/daily] Task 3 error:', err);
    results.trialWarningsError = String(err);
  }

  // Task 4 — Expired trials
  try {
    const expiredUsers = await User.find({
      plan: 'trial',
      trialEndsAt: { $lt: now },
      $or: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: { $exists: false } }],
    });

    let expiredCount = 0;
    for (const user of expiredUsers) {
      try {
        user.plan = 'expired';
        await user.save();
        await sendEmail({
          to: user.email,
          ...trialExpiredTemplate(user),
        });
        expiredCount++;
      } catch (err) {
        console.error('[cron/daily] Expired trial error for user', user._id, err);
      }
    }
    results.trialsExpired = expiredCount;
  } catch (err) {
    console.error('[cron/daily] Task 4 error:', err);
    results.expiredTrialsError = String(err);
  }

  return NextResponse.json({ ok: true, ...results });
}
