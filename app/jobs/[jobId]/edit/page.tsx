import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import type { IJob } from '@/lib/models/Job';
import User from '@/lib/models/User';
import EditClient from './EditClient';

function toDateStr(d: Date | null | undefined): string {
  if (!d) return '';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: { jobId: string };
  searchParams?: { fromVoice?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  await dbConnect();

  const job = await Job.findOne({
    _id: params.jobId,
    userId: session.user.id,
  }).lean<(IJob & { _id: Types.ObjectId }) | null>();

  if (!job) notFound();

  // Paid jobs are locked — bounce back to detail
  if (job.status === 'paid') redirect(`/jobs/${params.jobId}`);

  const user = await User.findById(session.user.id)
    .select('hourlyRate partsMarkup')
    .lean<{ hourlyRate?: number; partsMarkup?: number } | null>();

  const jobValues = {
    customerId: job.customerId ? String(job.customerId) : null,
    customerName: job.customerName ?? '',
    customerPhone: job.customerPhone ?? '',
    customerAddress: job.customerAddress ?? '',
    title: job.title ?? '',
    description: job.description ?? '',
    jobType: (job.jobType ?? 'residential') as 'residential' | 'commercial' | 'other',
    scheduledDate: toDateStr(job.scheduledDate),
    scheduledStart: job.scheduledStart ?? '',
    scheduledEnd: job.scheduledEnd ?? '',
    laborHours: (job.laborHours ?? 0) as number | '',
    laborRate: (job.laborRate ?? 0) as number | '',
    parts: (job.parts ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity as number | '',
      unitCost: p.unitCost as number | '',
      markup: p.markup as number | '',
    })),
    taxRate: (job.taxRate ?? 0) as number | '',
    internalNotes: job.internalNotes ?? '',
    status: job.status ?? 'draft',
  };

  return (
    <EditClient
      jobId={params.jobId}
      jobValues={jobValues}
      defaultRate={user?.hourlyRate ?? 0}
      defaultMarkup={user?.partsMarkup ?? 0}
      fromVoice={searchParams?.fromVoice === '1'}
    />
  );
}
