import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IJobPart {
  name: string;
  quantity: number;
  unitCost: number;
  markup: number;
  total: number;
}

export interface IJob extends Document {
  userId: Types.ObjectId;
  customerId: Types.ObjectId | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;

  title: string;
  description: string;
  trade: string;

  jobType: 'residential' | 'commercial' | 'other';
  status: 'draft' | 'complete' | 'invoiced' | 'paid';

  scheduledDate: Date | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedDate: Date | null;

  laborHours: number;
  laborRate: number;
  laborTotal: number;

  parts: IJobPart[];
  partsTotal: number;
  subtotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;

  invoiceId: Types.ObjectId | null;
  invoiceNumber: string | null;

  voiceTranscript: string | null;
  aiParsed: boolean;

  tags: string[];
  internalNotes: string;

  createdAt: Date;
  updatedAt: Date;
}

const PartSchema = new Schema<IJobPart>(
  {
    name: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitCost: { type: Number, default: 0 },
    markup: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
);

const JobSchema = new Schema<IJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerAddress: { type: String, default: '' },

  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  trade: { type: String, default: '' },

  jobType: {
    type: String,
    enum: ['residential', 'commercial', 'other'],
    default: 'residential',
  },
  status: {
    type: String,
    enum: ['draft', 'complete', 'invoiced', 'paid'],
    default: 'draft',
  },

  scheduledDate: { type: Date, default: null },
  scheduledStart: { type: String, default: null },
  scheduledEnd: { type: String, default: null },
  completedDate: { type: Date, default: null },

  laborHours: { type: Number, default: 0 },
  laborRate: { type: Number, default: 0 },
  laborTotal: { type: Number, default: 0 },

  parts: { type: [PartSchema], default: [] },
  partsTotal: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null,
  },
  invoiceNumber: { type: String, default: null },

  voiceTranscript: { type: String, default: null },
  aiParsed: { type: Boolean, default: false },

  tags: { type: [String], default: [] },
  internalNotes: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

JobSchema.index({ userId: 1, createdAt: -1 });
JobSchema.index({ userId: 1, status: 1 });
JobSchema.index({ userId: 1, customerId: 1 });
JobSchema.index({ userId: 1, scheduledDate: 1 });

JobSchema.pre('save', async function () {
  const hours = Number(this.laborHours) || 0;
  const rate = Number(this.laborRate) || 0;
  this.laborTotal = +(hours * rate).toFixed(2);

  let partsSum = 0;
  for (const p of this.parts ?? []) {
    const qty = Number(p.quantity) || 0;
    const cost = Number(p.unitCost) || 0;
    const markup = Number(p.markup) || 0;
    p.total = +(cost * qty * (1 + markup / 100)).toFixed(2);
    partsSum += p.total;
  }
  this.partsTotal = +partsSum.toFixed(2);

  this.subtotal = +(this.laborTotal + this.partsTotal).toFixed(2);

  const taxRate = Number(this.taxRate) || 0;
  this.taxTotal = +(this.subtotal * (taxRate / 100)).toFixed(2);

  this.total = +(this.subtotal + this.taxTotal).toFixed(2);

  this.updatedAt = new Date();
});

const Job: Model<IJob> =
  (mongoose.models.Job as Model<IJob>) ||
  mongoose.model<IJob>('Job', JobSchema);

export default Job;
