import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import CalendarClient from './CalendarClient';

function serializeJob(doc: Record<string, unknown>) {
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ''),
    customerName: String(doc.customerName ?? ''),
    scheduledDate: doc.scheduledDate
      ? new Date(doc.scheduledDate as string | Date).toISOString()
      : null,
    scheduledStart: doc.scheduledStart ? String(doc.scheduledStart) : null,
    scheduledEnd: doc.scheduledEnd ? String(doc.scheduledEnd) : null,
    status: String(doc.status ?? 'draft'),
    total: Number(doc.total ?? 0),
  };
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await dbConnect();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  const [rows, unscheduledRows, dbUser] = await Promise.all([
    Job.find({
      userId: session.user.id,
      scheduledDate: { $gte: startOfMonth, $lt: endOfMonth },
    })
      .select('_id title customerName scheduledDate scheduledStart scheduledEnd status total')
      .lean<Record<string, unknown>[]>(),

    Job.find({
      userId: session.user.id,
      status: 'complete',
      $or: [{ scheduledDate: null }, { scheduledDate: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id title customerName scheduledDate scheduledStart scheduledEnd status total')
      .lean<Record<string, unknown>[]>(),

    User.findById(session.user.id)
      .select('plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince')
      .lean<{
        plan: string;
        trialEndsAt?: Date;
        subscriptionStatus?: string | null;
        subscriptionEndsAt?: Date | null;
        pastDueSince?: Date | null;
      }>(),
  ]);

  const planState = dbUser ? getPlanState(dbUser as Parameters<typeof getPlanState>[0]) : null;

  return (
    <CalendarClient
      initialYear={year}
      initialMonth={month}
      initialJobs={rows.map(serializeJob)}
      initialUnscheduled={unscheduledRows.map(serializeJob)}
      isExpired={planState ? !planState.isActive : false}
    />
  );
}
