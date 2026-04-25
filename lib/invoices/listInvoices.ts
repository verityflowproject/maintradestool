import Invoice from '@/lib/models/Invoice';
import { Types } from 'mongoose';

export type InvoiceStatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceRow {
  _id: string;
  invoiceNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  total: number;
  dueDate: string;
  sentAt: string | null;
  paidDate: string | null;
  createdAt: string;
  deliveryMethod: string;
  jobId: string;
  reminderSentAt: string | null;
}

export interface InvoiceCounts {
  all: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
}

export interface InvoiceSummary {
  outstanding: number;
  collectedThisMonth: number;
  totalPaidAllTime: number;
}

function serializeRow(doc: Record<string, unknown>): InvoiceRow {
  return {
    _id: String(doc._id),
    invoiceNumber: String(doc.invoiceNumber ?? ''),
    status: String(doc.status ?? 'draft'),
    customerName: String(doc.customerName ?? ''),
    customerPhone: String(doc.customerPhone ?? ''),
    total: Number(doc.total ?? 0),
    dueDate: doc.dueDate ? new Date(doc.dueDate as string | Date).toISOString() : '',
    sentAt: doc.sentAt ? new Date(doc.sentAt as string | Date).toISOString() : null,
    paidDate: doc.paidDate ? new Date(doc.paidDate as string | Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : '',
    deliveryMethod: String(doc.deliveryMethod ?? 'download'),
    jobId: doc.jobId ? String(doc.jobId) : '',
    reminderSentAt: doc.reminderSentAt
      ? new Date(doc.reminderSentAt as string | Date).toISOString()
      : null,
  };
}

export async function listInvoices(
  userId: string,
  statusFilter: InvoiceStatusFilter = 'all',
): Promise<{ invoices: InvoiceRow[]; counts: InvoiceCounts }> {
  const now = new Date();

  // Build the query filter for the invoice list
  const listFilter: Record<string, unknown> = { userId };
  if (statusFilter === 'overdue') {
    listFilter.status = 'sent';
    listFilter.dueDate = { $lt: now };
  } else if (statusFilter !== 'all') {
    listFilter.status = statusFilter;
  }

  // Counts aggregation — always over ALL statuses for the userId
  const baseMatch = { userId: new Types.ObjectId(userId) };

  const [rows, countAgg] = await Promise.all([
    Invoice.find(listFilter)
      .sort({ createdAt: -1 })
      .select(
        '_id invoiceNumber status customerName customerPhone total dueDate sentAt paidDate createdAt deliveryMethod jobId reminderSentAt',
      )
      .lean<Record<string, unknown>[]>(),

    Invoice.aggregate<{ _id: string; count: number }>([
      { $match: baseMatch },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          overdue: [
            {
              $match: {
                status: 'sent',
                dueDate: { $lt: now },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]),
  ]);

  // Parse aggregation result
  const facet = countAgg[0] ?? { byStatus: [], overdue: [] };
  const byStatus = (facet as unknown as {
    byStatus: { _id: string; count: number }[];
    overdue: { count: number }[];
  });

  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  let allCount = 0;
  for (const b of byStatus.byStatus) {
    allCount += b.count;
    if (b._id === 'draft') draftCount = b.count;
    else if (b._id === 'sent') sentCount = b.count;
    else if (b._id === 'paid') paidCount = b.count;
  }
  const overdueCount = byStatus.overdue[0]?.count ?? 0;

  const counts: InvoiceCounts = {
    all: allCount,
    draft: draftCount,
    sent: sentCount,
    paid: paidCount,
    overdue: overdueCount,
  };

  return {
    invoices: rows.map(serializeRow),
    counts,
  };
}

export async function getInvoiceSummary(userId: string): Promise<InvoiceSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const oid = new Types.ObjectId(userId);

  const [outstanding, thisMonth, allTime] = await Promise.all([
    Invoice.aggregate<{ total: number }>([
      { $match: { userId: oid, status: { $in: ['sent', 'draft'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Invoice.aggregate<{ total: number }>([
      {
        $match: {
          userId: oid,
          status: 'paid',
          paidDate: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Invoice.aggregate<{ total: number }>([
      { $match: { userId: oid, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  return {
    outstanding: outstanding[0]?.total ?? 0,
    collectedThisMonth: thisMonth[0]?.total ?? 0,
    totalPaidAllTime: allTime[0]?.total ?? 0,
  };
}
