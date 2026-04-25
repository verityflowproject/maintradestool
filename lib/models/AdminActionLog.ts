import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminActionLog extends Document {
  adminEmail: string;
  action: string;
  targetUserId?: mongoose.Types.ObjectId;
  targetEmail?: string;
  changes?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

const AdminActionLogSchema = new Schema<IAdminActionLog>(
  {
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetEmail: { type: String },
    changes: { type: Schema.Types.Mixed },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AdminActionLogSchema.index({ createdAt: -1 });
AdminActionLogSchema.index({ targetUserId: 1 });

const AdminActionLog: Model<IAdminActionLog> =
  mongoose.models.AdminActionLog ||
  mongoose.model<IAdminActionLog>('AdminActionLog', AdminActionLogSchema);

export default AdminActionLog;
