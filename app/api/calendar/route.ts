import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';

export const runtime = 'nodejs';

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();

  const year = Number(searchParams.get('year')) || now.getFullYear();
  const month = Number(searchParams.get('month')) || now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 1);

  await dbConnect();

  const [rows, unscheduledRows] = await Promise.all([
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
  ]);

  return NextResponse.json({
    jobs: rows.map(serializeJob),
    unscheduled: unscheduledRows.map(serializeJob),
  });
}
