import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import { listInvoices } from '@/lib/invoices/listInvoices';
import type { InvoiceStatusFilter } from '@/lib/invoices/listInvoices';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

const VALID: InvoiceStatusFilter[] = ['all', 'draft', 'sent', 'paid', 'overdue'];

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'invoice');
  if (!perm.ok) return perm.response;

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get('status') ?? 'all';
  const statusFilter: InvoiceStatusFilter = (VALID.includes(rawStatus as InvoiceStatusFilter)
    ? rawStatus
    : 'all') as InvoiceStatusFilter;

  await dbConnect();

  const result = await listInvoices(effectiveOwnerId(session!), statusFilter);
  return NextResponse.json(result);
}
