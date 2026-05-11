import { requirePagePerm } from '@/lib/auth/serverGuard';
import PayrollClient from './PayrollClient';

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  // only owner + manager can access
  await requirePagePerm('read', 'payroll');

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const from = searchParams.from ?? defaultFrom;
  const to = searchParams.to ?? defaultTo;

  return <PayrollClient defaultFrom={from} defaultTo={to} />;
}
