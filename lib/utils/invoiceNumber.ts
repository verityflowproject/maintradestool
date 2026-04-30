import { randomBytes } from 'crypto';
import Invoice from '@/lib/models/Invoice';
import type { Types } from 'mongoose';

export function generateInvoiceAccessToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function generateInvoiceNumber(
  userId: Types.ObjectId | string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TB-${year}-`;

  const latest = await Invoice.findOne({
    userId,
    invoiceNumber: { $regex: `^${prefix}` },
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean<{ invoiceNumber: string } | null>();

  const nextSeq = latest
    ? parseInt(latest.invoiceNumber.split('-').pop() ?? '0', 10) + 1
    : 1;

  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}
