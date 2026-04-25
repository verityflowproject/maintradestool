import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export interface BillingInvoiceItem {
  id: string;
  number: string | null;
  total: number;
  status: string | null;
  created: number;
  invoicePdf: string | null;
  periodStart: number | null;
  periodEnd: number | null;
}

export async function GET(req: Request) {
  void req;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select('stripeCustomerId').lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.stripeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  const stripeInvoices = await stripe.invoices.list({
    customer: user.stripeCustomerId,
    limit: 20,
  });

  const invoices: BillingInvoiceItem[] = stripeInvoices.data.map((inv) => {
    const line = inv.lines?.data?.[0];
    return {
      id: inv.id,
      number: inv.number ?? null,
      total: inv.total,
      status: inv.status ?? null,
      created: inv.created,
      invoicePdf: inv.invoice_pdf ?? null,
      periodStart: line?.period?.start ?? null,
      periodEnd: line?.period?.end ?? null,
    };
  });

  return NextResponse.json({ invoices });
}
