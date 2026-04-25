import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import type { IInvoice } from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import { renderInvoicePdf } from '@/lib/pdf/renderInvoicePdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function buildResponse(
  invoiceId: string,
  userId: string,
): Promise<Response> {
  if (!Types.ObjectId.isValid(invoiceId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    userId,
  }).lean<(IInvoice & { _id: Types.ObjectId }) | null>();

  if (!invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const user = await User.findById(userId)
    .select('businessName region')
    .lean<{ businessName: string; region: string } | null>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const buffer = await renderInvoicePdf(invoice, {
      name: user.businessName,
      region: user.region,
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[/api/invoices/[invoiceId]/pdf] render error', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return buildResponse(params.invoiceId, session.user.id);
}

export async function POST(
  _req: Request,
  { params }: { params: { invoiceId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return buildResponse(params.invoiceId, session.user.id);
}
