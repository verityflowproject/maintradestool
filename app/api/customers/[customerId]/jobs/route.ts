import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { customerId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const raw = await Job.find({
    customerId: params.customerId,
    userId: session.user.id,
  })
    .sort({ createdAt: -1 })
    .select(
      '_id title status total laborHours createdAt completedDate invoiceId invoiceNumber aiParsed',
    )
    .lean<Record<string, unknown>[]>();

  const jobs = raw.map((j) => ({ ...j, _id: String(j._id) }));
  return NextResponse.json({ jobs });
}
