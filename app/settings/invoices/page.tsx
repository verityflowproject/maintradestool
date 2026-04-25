import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import InvoicesSettingsClient from './InvoicesSettingsClient';

export default async function InvoicesSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('invoiceMethod paymentTerms defaultInvoiceNote lateFeePercent')
    .lean();

  if (!user) redirect('/');

  return (
    <InvoicesSettingsClient
      initialInvoiceMethod={user.invoiceMethod}
      initialPaymentTerms={user.paymentTerms ?? 'net_14'}
      initialDefaultInvoiceNote={user.defaultInvoiceNote ?? ''}
      initialLateFeePercent={user.lateFeePercent ?? 0}
    />
  );
}
