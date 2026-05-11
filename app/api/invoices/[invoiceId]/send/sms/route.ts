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

  const { effectiveOwnerId } = await import('@/lib/auth/scope');
  const ownerId = effectiveOwnerId(session);

  const invoice = await Invoice.findOne({
    _id: params.invoiceId,
    userId: ownerId,
  })
    .select('invoiceNumber publicAccessToken')
    .lean<{ invoiceNumber: string; publicAccessToken: string } | null>();

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!invoice.publicAccessToken) {
    return NextResponse.json({ error: 'Invoice is not yet published' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const link = `${origin}/invoice/${encodeURIComponent(invoice.invoiceNumber)}?t=${encodeURIComponent(invoice.publicAccessToken)}`;

  return NextResponse.json({ link });
}
