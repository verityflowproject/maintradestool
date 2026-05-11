import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITimeEntry extends Document {
  ownerUserId: Types.ObjectId;
  jobId: Types.ObjectId;
  teamMemberId: Types.ObjectId;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number;
  hourlyRate: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  teamMemberId: { type: Schema.Types.ObjectId, ref: 'TeamMember', required: true, index: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Composite indexes for efficient queries
TimeEntrySchema.index({ ownerUserId: 1, jobId: 1 });
TimeEntrySchema.index({ ownerUserId: 1, teamMemberId: 1, startedAt: -1 });
// One open entry per member at a time — enforced at the DB level via partial unique index
TimeEntrySchema.index(
  { teamMemberId: 1, endedAt: 1 },
  { unique: true, partialFilterExpression: { endedAt: null } },
);

TimeEntrySchema.pre('save', function () {
  this.updatedAt = new Date();
  if (this.endedAt && this.startedAt) {
    this.durationMinutes = Math.max(
      0,
      Math.round((this.endedAt.getTime() - this.startedAt.getTime()) / 60_000),
    );
  }
});

const TimeEntry: Model<ITimeEntry> =
  (mongoose.models.TimeEntry as Model<ITimeEntry>) ||
  mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);

export default TimeEntry;
