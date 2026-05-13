import mongoose, { Schema, Document, Model, Types } from 'mongoose';

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

export interface ITeamPreferences {
  showAvatarsOnJobs: boolean;
  requireAssignmentBeforeInvoice: boolean;
}

export interface ITrialWarningsSent {
  sevenDay: boolean;
  threeDay: boolean;
  oneDay: boolean;
  midpoint: boolean;
}

export interface IPendingEmailChange {
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IAcquisitionSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landedAt?: string;
}

export interface IUser extends Document {
  email: string;
  password: string | null;
  // Email verification
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  emailVerificationLastSentAt: Date | null;
  pendingEmailChange: IPendingEmailChange | null;
  phone: string | null;
  businessEmail: string | null;
  firstName: string;
  // null = standalone owner; set = invited member under a parent owner
  parentOwnerId: Types.ObjectId | null;
  linkedTeamMemberId: Types.ObjectId | null;
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
  pastDueReminder2Sent: boolean;
  firstInvoicePaidSent: boolean;
  winBackSent: boolean;
  cardCapturePromptShown: boolean;
  earlyBirdEndingEmailSent: boolean;
  onboardingCompleted: boolean;
  bookingSlug: string | null;
  bookingEnabled: boolean;
  bookingProfile: IBookingProfile;
  teamPreferences: ITeamPreferences;
  acquisitionSource: IAcquisitionSource | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeamPreferencesSchema = new Schema<ITeamPreferences>(
  {
    showAvatarsOnJobs: { type: Boolean, default: true },
    requireAssignmentBeforeInvoice: { type: Boolean, default: false },
  },
  { _id: false },
);

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
    midpoint: { type: Boolean, default: false },
  },
  { _id: false },
);

const PendingEmailChangeSchema = new Schema<IPendingEmailChange>(
  {
    newEmail: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
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
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },
  emailVerificationTokenHash: {
    type: String,
    default: null,
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null,
  },
  emailVerificationLastSentAt: {
    type: Date,
    default: null,
  },
  pendingEmailChange: {
    type: PendingEmailChangeSchema,
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
  // null = standalone owner account; populated = invited team member
  parentOwnerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  linkedTeamMemberId: {
    type: Schema.Types.ObjectId,
    ref: 'TeamMember',
    default: null,
  },
  // Owner-only fields: required only when the user is not an invited member
  businessName: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    trim: true,
    default: '',
  },
  trade: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: '',
  },
  teamSize: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: '',
  },
  jobType: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: '',
  },
  experienceYears: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: '',
  },
  painPoints: {
    type: [String],
    default: [],
  },
  hourlyRate: {
    type: Number,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: 85,
  },
  partsMarkup: {
    type: Number,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: 20,
  },
  defaultTaxRate: {
    type: Number,
    default: 0,
  },
  region: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
    default: '',
  },
  invoiceMethod: {
    type: String,
    required: function (this: IUser) { return this.parentOwnerId == null; },
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
    default: () => ({ sevenDay: false, threeDay: false, oneDay: false, midpoint: false }),
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
  pastDueReminder2Sent: {
    type: Boolean,
    default: false,
  },
  firstInvoicePaidSent: {
    type: Boolean,
    default: false,
  },
  winBackSent: {
    type: Boolean,
    default: false,
  },
  cardCapturePromptShown: {
    type: Boolean,
    default: false,
  },
  earlyBirdEndingEmailSent: {
    type: Boolean,
    default: false,
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  bookingSlug: {
    type: String,
    default: null,
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
  teamPreferences: {
    type: TeamPreferencesSchema,
    default: () => ({
      showAvatarsOnJobs: true,
      requireAssignmentBeforeInvoice: false,
    }),
  },
  acquisitionSource: {
    type: Schema.Types.Mixed,
    default: null,
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

// Unique only for users who have actually claimed a booking slug. We can't
// use `sparse: true` here because the field defaults to `null` (not missing),
// and a sparse unique index still considers `null` a value — which collides
// across every user without a slug. A partial filter excludes the nulls
// entirely from the index.
UserSchema.index(
  { bookingSlug: 1 },
  {
    unique: true,
    partialFilterExpression: { bookingSlug: { $type: 'string' } },
    name: 'bookingSlug_1_partial',
  },
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
