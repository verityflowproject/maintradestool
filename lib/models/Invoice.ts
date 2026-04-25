import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  customerId: Types.ObjectId | null;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';

  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessRegion: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;

  lineItems: IInvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;

  notes: string;
  dueDate: Date;
  paidDate: Date | null;
  sentAt: Date | null;
  deliveryMethod: 'email' | 'sms' | 'download';

  pdfUrl: string | null;
  reminderSentAt: Date | null;
  overdueEmailsSent: number;

  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<IInvoiceLineItem>(
  {
    description: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new Schema<IInvoice>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue'],
    default: 'draft',
  },

  businessName: { type: String, default: '' },
  businessPhone: { type: String, default: '' },
  businessEmail: { type: String, default: '' },
  businessRegion: { type: String, default: '' },

  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, default: '' },

  lineItems: { type: [LineItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  deliveryMethod: {
    type: String,
    enum: ['email', 'sms', 'download'],
    required: true,
  },

  pdfUrl: { type: String, default: null },
  reminderSentAt: { type: Date, default: null },
  overdueEmailsSent: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ userId: 1, status: 1 });
// invoiceNumber unique index is set via field-level `unique: true`

InvoiceSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

const Invoice: Model<IInvoice> =
  (mongoose.models.Invoice as Model<IInvoice>) ||
  mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
