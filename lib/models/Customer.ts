import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICustomer extends Document {
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  notes: string;
  jobCount: number;
  totalBilled: number;
  createdAt: Date;
  updatedAt: Date;
  // virtual
  fullName: string;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    businessName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    jobCount: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CustomerSchema.virtual('fullName').get(function (this: ICustomer) {
  const full = `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  return full || this.businessName || 'Unknown Customer';
});

CustomerSchema.index({ userId: 1 });
CustomerSchema.index({ userId: 1, phone: 1 });
CustomerSchema.index({ userId: 1, email: 1 });

CustomerSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

const Customer: Model<ICustomer> =
  (mongoose.models.Customer as Model<ICustomer>) ||
  mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
