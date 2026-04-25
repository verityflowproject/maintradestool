import { dbConnect } from '@/lib/mongodb';
import AdminActionLog from '@/lib/models/AdminActionLog';
import mongoose from 'mongoose';

interface LogParams {
  adminEmail: string;
  action: string;
  targetUserId?: string | mongoose.Types.ObjectId;
  targetEmail?: string;
  changes?: Record<string, unknown>;
  reason?: string;
}

export async function logAdminAction(params: LogParams): Promise<void> {
  try {
    await dbConnect();
    await AdminActionLog.create({
      adminEmail: params.adminEmail,
      action: params.action,
      targetUserId: params.targetUserId
        ? new mongoose.Types.ObjectId(String(params.targetUserId))
        : undefined,
      targetEmail: params.targetEmail,
      changes: params.changes,
      reason: params.reason,
      createdAt: new Date(),
    });
  } catch (err) {
    // Logging failures must never break the mutation
    console.error('[AdminActionLog] Failed to log action:', err);
  }
}
