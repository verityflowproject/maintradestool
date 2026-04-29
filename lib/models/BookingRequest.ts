import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBookingRequest extends Document {
  userId: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceNeeded: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: 'new' | 'viewed' | 'accepted' | 'declined' | 'converted';
  linkedJobId: Types.ObjectId | null;
  createdAt: Date;
}

const BookingRequestSchema = new Schema<IBookingRequest>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  address: { type: String, default: '' },
  serviceNeeded: { type: String, required: true },
  preferredDate: { type: String, default: '' },
  preferredTime: { type: String, default: '' },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['new', 'viewed', 'accepted', 'declined', 'converted'],
    default: 'new',
  },
  linkedJobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

BookingRequestSchema.index({ userId: 1, createdAt: -1 });

const BookingRequest: Model<IBookingRequest> =
  (mongoose.models.BookingRequest as Model<IBookingRequest>) ||
  mongoose.model<IBookingRequest>('BookingRequest', BookingRequestSchema);

export default BookingRequest;
