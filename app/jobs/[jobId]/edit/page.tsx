import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import type { IJob } from '@/lib/models/Job';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import EditClient from './EditClient';
import { isTeamSize } from '@/lib/team/hasTeam';

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
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }

  if (!Types.ObjectId.isValid(params.jobId)) notFound();

  const { requirePerm } = await import('@/lib/auth/permissions');
  const { effectiveOwnerId: getEOId, memberId: getMId } = await import('@/lib/auth/scope');

  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) redirect('/dashboard');

  await dbConnect();

  const ownerId = getEOId(session);

  const job = await Job.findOne({
    _id: params.jobId,
    userId: ownerId,
  }).lean<(IJob & { _id: Types.ObjectId }) | null>();

  if (!job) notFound();

  // own-scope: member must be assigned to this job
  if (perm.scope === 'own') {
    const mid = getMId(session);
    const assignedIds = (job.assignedMemberIds ?? []).map(String);
    if (!mid || !assignedIds.includes(mid)) notFound();
  }

  // Paid jobs are locked — bounce back to detail
  if (job.status === 'paid') redirect(`/jobs/${params.jobId}`);

  const user = await User.findById(ownerId)
    .select(
      'hourlyRate partsMarkup plan trialEndsAt subscriptionStatus subscriptionEndsAt pastDueSince teamSize',
    )
    .lean<{
      hourlyRate?: number;
      partsMarkup?: number;
      plan: 'trial' | 'pro' | 'cancelled';
      trialEndsAt: Date;
      subscriptionStatus:
        | 'trialing'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'incomplete'
        | null;
      subscriptionEndsAt: Date | null;
      pastDueSince: Date | null;
      teamSize?: string;
    } | null>();

  if (user) {
    const planState = getPlanState(user);
    if (!planState.canCreateJobs) redirect('/billing-expired');
  }

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
    assignedMemberIds: (job.assignedMemberIds ?? []).map(String),
  };

  const hasTeam = isTeamSize(user?.teamSize);

  return (
    <EditClient
      jobId={params.jobId}
      jobValues={jobValues}
      defaultRate={user?.hourlyRate ?? 0}
      defaultMarkup={user?.partsMarkup ?? 0}
      fromVoice={searchParams?.fromVoice === '1'}
      hasTeam={hasTeam}
    />
  );
}
