import React from 'react';
import type { IInvoice } from '@/lib/models/Invoice';
import type { Types } from 'mongoose';

export async function renderInvoicePdf(
  invoice: IInvoice & { _id: Types.ObjectId },
  business: { name: string; region: string },
): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { InvoicePDF } = await import('@/lib/pdf/InvoicePDF');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(React.createElement(InvoicePDF, { invoice, business }) as any);
}
