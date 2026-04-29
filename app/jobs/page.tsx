import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import BookingRequest from '@/lib/models/BookingRequest';
import JobsClient, { type JobRow, type RequestRow } from './JobsClient';

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  await dbConnect();

  const [rows, totalCount, rawRequests] = await Promise.all([
    Job.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select(
        '_id title status customerName customerAddress total laborHours createdAt aiParsed invoiceNumber invoiceId bookingRequestId',
      )
      .lean<JobRow[]>(),
    Job.countDocuments({ userId: session.user.id }),
    BookingRequest.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean<RequestRow[]>(),
  ]);

  return (
    <JobsClient
      initial={rows.map(serialize)}
      totalCount={totalCount}
      initialRequests={rawRequests.map(serialize)}
    />
  );
}
