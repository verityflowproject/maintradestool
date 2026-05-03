import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { listInvoices, getInvoiceSummary } from '@/lib/invoices/listInvoices';
import User from '@/lib/models/User';
import { getPlanState } from '@/lib/planState';
import InvoicesClient from './InvoicesClient';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');

  const params = await searchParams;
  const filterParam = Array.isArray(params.filter)
    ? params.filter[0]
    : (params.filter ?? 'all');

  await dbConnect();

  const [{ invoices, counts }, summary, dbUser] = await Promise.all([
    listInvoices(session.user.id, 'all'),
    getInvoiceSummary(session.user.id),
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
    <InvoicesClient
      initialInvoices={invoices}
      initialCounts={counts}
      summary={summary}
      initialFilter={filterParam}
      isExpired={planState ? !planState.isActive : false}
      totalCount={counts.all}
    />
  );
}
