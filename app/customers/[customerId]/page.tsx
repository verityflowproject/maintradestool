import { notFound, redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import Job from '@/lib/models/Job';
import { deriveFullName } from '@/lib/utils/customerName';
import CustomerDetailClient, { type CustomerData, type JobRow } from './CustomerDetailClient';

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { customerId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (!Types.ObjectId.isValid(params.customerId)) notFound();

  await dbConnect();

  const [customerDoc, jobDocs] = await Promise.all([
    Customer.findOne({
      _id: params.customerId,
      userId: session.user.id,
    }).lean<CustomerData | null>(),
    Job.find({
      customerId: params.customerId,
      userId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .select(
        '_id title status total laborHours createdAt completedDate invoiceId invoiceNumber aiParsed',
      )
      .lean<JobRow[]>(),
  ]);

  if (!customerDoc) notFound();

  return (
    <CustomerDetailClient
      customer={{ ...serialize(customerDoc), fullName: deriveFullName(customerDoc) }}
      initialJobs={jobDocs.map(serialize)}
    />
  );
}
