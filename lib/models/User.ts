import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBookingProfile {
  headline: string;
  bio: string;
  services: string[];
  serviceArea: string;
  responseTime: string;
  showPhone: boolean;
  showEmail: boolean;
}

export interface INotificationPrefs {
  newBookingRequest: boolean;
  invoicePaid: boolean;
  invoiceOverdue: boolean;
  weeklyReport: boolean;
  productUpdates: boolean;
  trialReminders: boolean;
}

export interface ITrialWarningsSent {
  sevenDay: boolean;
  threeDay: boolean;
  oneDay: boolean;
}

export interface IUser extends Document {
  email: string;
  password: string | null;
  phone: string | null;
  businessEmail: string | null;
  firstName: string;
  businessName: string;
  trade: string;
  teamSize: string;
  jobType: string;
  experienceYears: string;
  painPoints: string[];
  hourlyRate: number;
  partsMarkup: number;
  defaultTaxRate: number;
  region: string;
  invoiceMethod: string;
  paymentTerms: 'due_on_receipt' | 'net_7' | 'net_14' | 'net_30';
  defaultInvoiceNote: string | null;
  lateFeePercent: number;
  notifications: INotificationPrefs;
  plan: 'trial' | 'pro' | 'cancelled' | 'expired';
  trialWarningsSent: ITrialWarningsSent;
  trialEndsAt: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null;
  subscriptionPlan: 'monthly' | 'annual' | null;
  subscriptionEndsAt: Date | null;
  pastDueSince: Date | null;
  onboardingCompleted: boolean;
  bookingSlug: string | null;
  bookingEnabled: boolean;
  bookingProfile: IBookingProfile;
  createdAt: Date;
  updatedAt: Date;
}

const BookingProfileSchema = new Schema<IBookingProfile>(
  {
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    services: { type: [String], default: [] },
    serviceArea: { type: String, default: '' },
    responseTime: { type: String, default: '' },
    showPhone: { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
  },
  { _id: false },
);

const NotificationPrefsSchema = new Schema<INotificationPrefs>(
  {
    newBookingRequest: { type: Boolean, default: true },
    invoicePaid: { type: Boolean, default: true },
    invoiceOverdue: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: false },
    productUpdates: { type: Boolean, default: true },
    trialReminders: { type: Boolean, default: true },
  },
  { _id: false },
);

const TrialWarningsSentSchema = new Schema<ITrialWarningsSent>(
  {
    sevenDay: { type: Boolean, default: false },
    threeDay: { type: Boolean, default: false },
    oneDay: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  businessEmail: {
    type: String,
    default: null,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  trade: {
    type: String,
    required: true,
  },
  teamSize: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
  },
  experienceYears: {
    type: String,
    required: true,
  },
  painPoints: {
    type: [String],
    default: [],
  },
  hourlyRate: {
    type: Number,
    required: true,
    default: 85,
  },
  partsMarkup: {
    type: Number,
    required: true,
    default: 20,
  },
  defaultTaxRate: {
    type: Number,
    default: 0,
  },
  region: {
    type: String,
    required: true,
  },
  invoiceMethod: {
    type: String,
    required: true,
    default: 'email',
  },
  paymentTerms: {
    type: String,
    enum: ['due_on_receipt', 'net_7', 'net_14', 'net_30'],
    default: 'net_14',
  },
  defaultInvoiceNote: {
    type: String,
    default: null,
  },
  lateFeePercent: {
    type: Number,
    default: 0,
  },
  notifications: {
    type: NotificationPrefsSchema,
    default: () => ({
      newBookingRequest: true,
      invoicePaid: true,
      invoiceOverdue: true,
      weeklyReport: false,
      productUpdates: true,
      trialReminders: true,
    }),
  },
  plan: {
    type: String,
    enum: ['trial', 'pro', 'cancelled', 'expired'],
    default: 'trial',
  },
  trialWarningsSent: {
    type: TrialWarningsSentSchema,
    default: () => ({ sevenDay: false, threeDay: false, oneDay: false }),
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
  subscriptionStatus: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete', null],
    default: null,
  },
  subscriptionPlan: {
    type: String,
    enum: ['monthly', 'annual', null],
    default: null,
  },
  subscriptionEndsAt: {
    type: Date,
    default: null,
  },
  pastDueSince: {
    type: Date,
    default: null,
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  bookingSlug: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
  },
  bookingEnabled: {
    type: Boolean,
    default: false,
  },
  bookingProfile: {
    type: BookingProfileSchema,
    default: () => ({
      headline: '',
      bio: '',
      services: [],
      serviceArea: '',
      responseTime: '',
      showPhone: false,
      showEmail: false,
    }),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
