import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { listInvoices, getInvoiceSummary } from '@/lib/invoices/listInvoices';
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

  const [{ invoices, counts }, summary] = await Promise.all([
    listInvoices(session.user.id, 'all'),
    getInvoiceSummary(session.user.id),
  ]);

  return (
    <InvoicesClient
      initialInvoices={invoices}
      initialCounts={counts}
      summary={summary}
      initialFilter={filterParam}
    />
  );
}
