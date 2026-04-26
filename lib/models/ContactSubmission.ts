import mongoose, { Schema, Document, Model } from 'mongoose';

export type ContactType =
  | 'feature_request'
  | 'bug_report'
  | 'feedback'
  | 'support'
  | 'partnership'
  | 'other';

export type ContactStatus =
  | 'new'
  | 'reviewing'
  | 'planned'
  | 'shipped'
  | 'closed'
  | 'wont_fix';

export type ContactPriority = 'low' | 'medium' | 'high' | 'critical';

export interface IContactSubmission extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userFirstName: string;
  userBusinessName: string;
  type: ContactType;

  // Shared
  title?: string;
  description: string;
  priority?: ContactPriority;

  // Feature request
  problemSolved?: string;
  willingToPay: boolean;

  // Bug report
  stepsToReproduce?: string;
  deviceInfo?: string;

  // Feedback
  rating?: number;

  // Status tracking
  status: ContactStatus;
  adminNotes?: string;
  adminReplyAt?: Date;
  publicReply?: string;

  // Voting
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    userFirstName: { type: String, default: '' },
    userBusinessName: { type: String, default: '' },
    type: {
      type: String,
      enum: ['feature_request', 'bug_report', 'feedback', 'support', 'partnership', 'other'],
      required: true,
    },

    title: { type: String },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: null,
    },

    problemSolved: { type: String },
    willingToPay: { type: Boolean, default: false },

    stepsToReproduce: { type: String },
    deviceInfo: { type: String },

    rating: { type: Number, min: 1, max: 5, default: null },

    status: {
      type: String,
      enum: ['new', 'reviewing', 'planned', 'shipped', 'closed', 'wont_fix'],
      default: 'new',
    },
    adminNotes: { type: String },
    adminReplyAt: { type: Date, default: null },
    publicReply: { type: String },

    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

ContactSubmissionSchema.index({ userId: 1, createdAt: -1 });
ContactSubmissionSchema.index({ type: 1, status: 1 });
ContactSubmissionSchema.index({ type: 1, upvotes: -1 });

const ContactSubmission: Model<IContactSubmission> =
  mongoose.models.ContactSubmission ||
  mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);

export default ContactSubmission;
