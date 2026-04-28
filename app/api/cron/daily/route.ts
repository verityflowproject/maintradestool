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
  trialMidpointTemplate,
  trialExpiredTemplate,
  winBackTemplate,
  dunningEscalationTemplate,
  earlyBirdEndingTemplate,
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

  // Task 3 — Trial ending warnings + midpoint email
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

        type WarningKey = 'sevenDay' | 'threeDay' | 'oneDay' | 'midpoint';
        const checkpoints: Array<{ days: number; key: WarningKey }> = [
          { days: 7, key: 'midpoint' },  // midpoint email at 7 days left (day 7 of 14)
          { days: 3, key: 'threeDay' },
          { days: 1, key: 'oneDay' },
        ];

        for (const { days, key } of checkpoints) {
          if (daysLeft === days && !user.trialWarningsSent?.[key]) {
            let stats: { jobsCount: number; revenue: number } | undefined;

            if (days === 7 || days === 3) {
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

            if (key === 'midpoint' && stats) {
              await sendEmail({
                to: user.email,
                ...trialMidpointTemplate(user, stats),
              });
            } else {
              await sendEmail({
                to: user.email,
                ...trialWarningTemplate(user, daysLeft, stats),
              });
            }

            user.trialWarningsSent = user.trialWarningsSent ?? {
              sevenDay: false,
              threeDay: false,
              oneDay: false,
              midpoint: false,
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

  // Task 5 — Win-back email (30 days after subscription ended)
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const thirtyOneDaysAgo = new Date(now.getTime() - 31 * 86_400_000);

    const winBackCandidates = await User.find({
      plan: { $in: ['cancelled', 'expired'] },
      subscriptionEndsAt: { $gte: thirtyOneDaysAgo, $lte: thirtyDaysAgo },
      winBackSent: { $ne: true },
    });

    let winBackSent = 0;
    for (const user of winBackCandidates) {
      try {
        await sendEmail({ to: user.email, ...winBackTemplate(user) });
        user.winBackSent = true;
        await user.save();
        winBackSent++;
      } catch (err) {
        console.error('[cron/daily] Win-back error for user', user._id, err);
      }
    }
    results.winBackSent = winBackSent;
  } catch (err) {
    console.error('[cron/daily] Task 5 error:', err);
    results.winBackError = String(err);
  }

  // Task 6 — Dunning escalation (day 5 past_due warning)
  try {
    const GRACE_DAYS = 7;
    const pastDueUsers = await User.find({
      subscriptionStatus: 'past_due',
      pastDueSince: { $ne: null },
      pastDueReminder2Sent: { $ne: true },
    });

    let dunningEscalations = 0;
    for (const user of pastDueUsers) {
      try {
        const daysSincePastDue = Math.floor(
          (now.getTime() - new Date(user.pastDueSince!).getTime()) / 86_400_000
        );
        if (daysSincePastDue >= 4 && daysSincePastDue <= 6) {
          const graceDaysLeft = Math.max(0, GRACE_DAYS - daysSincePastDue);
          await sendEmail({
            to: user.email,
            ...dunningEscalationTemplate(user, graceDaysLeft),
          });
          user.pastDueReminder2Sent = true;
          await user.save();
          dunningEscalations++;
        }
      } catch (err) {
        console.error('[cron/daily] Dunning escalation error for user', user._id, err);
      }
    }
    results.dunningEscalationsSent = dunningEscalations;
  } catch (err) {
    console.error('[cron/daily] Task 6 error:', err);
    results.dunningEscalationsError = String(err);
  }

  // Task 7 — Early-bird ending email (day 5 of trial, ~2 days before window closes)
  try {
    const EARLY_BIRD_MS = 7 * 86_400_000;
    const fiveDaysMs = 5 * 86_400_000;
    const sevenDaysMs = 7 * 86_400_000;

    // Find trial users who signed up 5-7 days ago (haven't exhausted EB window) and haven't had this email sent
    const ebCandidates = await User.find({
      plan: 'trial',
      createdAt: {
        $gte: new Date(now.getTime() - sevenDaysMs),
        $lte: new Date(now.getTime() - fiveDaysMs),
      },
      earlyBirdEndingEmailSent: { $ne: true },
      $or: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: { $exists: false } }],
    });

    let earlyBirdEmailsSent = 0;
    for (const user of ebCandidates) {
      try {
        const earlyBirdEndsAt = new Date(new Date(user.createdAt).getTime() + EARLY_BIRD_MS);
        if (earlyBirdEndsAt.getTime() <= now.getTime()) continue; // already expired
        const hoursLeft = Math.ceil((earlyBirdEndsAt.getTime() - now.getTime()) / 3_600_000);
        await sendEmail({ to: user.email, ...earlyBirdEndingTemplate(user, hoursLeft) });
        user.earlyBirdEndingEmailSent = true;
        await user.save();
        earlyBirdEmailsSent++;
      } catch (err) {
        console.error('[cron/daily] Early-bird ending email error for user', user._id, err);
      }
    }
    results.earlyBirdEmailsSent = earlyBirdEmailsSent;
  } catch (err) {
    console.error('[cron/daily] Task 7 error:', err);
    results.earlyBirdEmailsError = String(err);
  }

  return NextResponse.json({ ok: true, ...results });
}
