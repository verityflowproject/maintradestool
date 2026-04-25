import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import { requireCapability } from '@/lib/requirePlan';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireCapability(session.user.id, 'canGenerateInvoices');
  if (!gate.ok) return gate.response;

  if (!Types.ObjectId.isValid(params.invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: params.invoiceId,
    userId: session.user.id,
  })
    .select('invoiceNumber')
    .lean<{ invoiceNumber: string } | null>();

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const link = `${origin}/invoice/${encodeURIComponent(invoice.invoiceNumber)}`;

  return NextResponse.json({ link });
}
