import mongoose, { Schema, Document, Model, Types } from 'mongoose';
export { TEAM_MEMBER_ROLES } from '@/lib/team/roles';
export type { TeamMemberRole } from '@/lib/team/roles';
import type { TeamMemberRole } from '@/lib/team/roles';

export interface ITeamMember extends Document {
  ownerUserId: Types.ObjectId;
  linkedUserId: Types.ObjectId | null;
  name: string;
  email: string;
  phone: string;
  role: TeamMemberRole;
  hourlyRate: number | null;
  color: string;
  avatarInitials: string;
  active: boolean;
  inviteSentAt: Date | null;
  inviteAcceptedAt: Date | null;
  inviteTokenHash: string | null;
  inviteTokenExpiresAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>({
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  linkedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  phone: { type: String, default: '', trim: true },
  role: {
    type: String,
    enum: ['owner', 'manager', 'lead', 'tech', 'apprentice', 'office'],
    default: 'tech',
  },
  hourlyRate: { type: Number, default: null },
  color: { type: String, default: '#4A9EFF' },
  avatarInitials: { type: String, default: '' },
  active: { type: Boolean, default: true },
  inviteSentAt: { type: Date, default: null },
  inviteAcceptedAt: { type: Date, default: null },
  inviteTokenHash: { type: String, default: null },
  inviteTokenExpiresAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TeamMemberSchema.index({ ownerUserId: 1, active: 1 });
TeamMemberSchema.index({ ownerUserId: 1, role: 1 });
TeamMemberSchema.index({ inviteTokenHash: 1 });

TeamMemberSchema.pre('save', function () {
  this.updatedAt = new Date();
  const parts = (this.name || '').trim().split(/\s+/).filter(Boolean);
  this.avatarInitials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
});

const TeamMember: Model<ITeamMember> =
  (mongoose.models.TeamMember as Model<ITeamMember>) ||
  mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);

export default TeamMember;
