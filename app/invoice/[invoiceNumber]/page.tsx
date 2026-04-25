import { notFound } from 'next/navigation';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import InvoicePreview from '@/app/jobs/[jobId]/invoice/InvoicePreview';

function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: { invoiceNumber: string };
}) {
  await dbConnect();

  const invoice = await Invoice.findOne({
    invoiceNumber: decodeURIComponent(params.invoiceNumber),
  }).lean();

  if (!invoice) notFound();

  const user = await User.findById((invoice as { userId?: unknown }).userId)
    .select('businessName region')
    .lean<{ businessName: string; region: string } | null>();

  const business = {
    name: user?.businessName ?? '',
    region: user?.region ?? '',
  };

  return (
    <main className="public-invoice-wrap">
      <div className="public-invoice-header">
        <span className="public-invoice-brand">{business.name}</span>
      </div>

      <InvoicePreview invoice={serialize(invoice)} business={business} />

      <div className="public-invoice-pay">
        <button
          className="btn-accent"
          disabled
          title="Online payment coming soon"
        >
          Pay Now
        </button>
        <p className="public-invoice-pay-note">
          Online payment coming soon. Please contact {business.name} to arrange payment.
        </p>
      </div>
    </main>
  );
}
