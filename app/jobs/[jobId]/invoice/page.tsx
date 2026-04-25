import { notFound, redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import InvoiceClient from './InvoiceClient';

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export default async function InvoicePage({
  params,
}: {
  params: { jobId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  await dbConnect();

  const job = await Job.findOne({
    _id: params.jobId,
    userId: session.user.id,
  })
    .select('_id title userId')
    .lean();

  if (!job) notFound();

  const invoice = await Invoice.findOne({
    jobId: job._id,
    userId: session.user.id,
  }).lean();

  const user = await User.findById(session.user.id)
    .select('businessName region')
    .lean<{ businessName: string; region: string } | null>();

  return (
    <InvoiceClient
      jobId={params.jobId}
      jobTitle={String((job as { title?: string }).title ?? '')}
      invoice={invoice ? serialize(invoice) : null}
      business={{
        name: user?.businessName ?? '',
        region: user?.region ?? '',
      }}
    />
  );
}
