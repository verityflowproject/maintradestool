import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { listInvoices } from '@/lib/invoices/listInvoices';
import type { InvoiceStatusFilter } from '@/lib/invoices/listInvoices';

export const runtime = 'nodejs';

const VALID: InvoiceStatusFilter[] = ['all', 'draft', 'sent', 'paid', 'overdue'];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get('status') ?? 'all';
  const statusFilter: InvoiceStatusFilter = (VALID.includes(rawStatus as InvoiceStatusFilter)
    ? rawStatus
    : 'all') as InvoiceStatusFilter;

  await dbConnect();

  const result = await listInvoices(session.user.id, statusFilter);
  return NextResponse.json(result);
}
