import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TimeEntry from '@/lib/models/TimeEntry';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'payroll');
  if (!perm.ok) return perm.response;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const ownerObjId = new Types.ObjectId(ownerId);

  type AggRow = {
    _id: Types.ObjectId;
    hoursLogged: number;
    gross: number;
    jobIds: Types.ObjectId[];
    rateSnapshot: number;
    member: { _id: Types.ObjectId; name: string; role: string; color: string; avatarInitials: string; hourlyRate?: number };
  };
  const rows = await TimeEntry.aggregate<AggRow>([
    {
      $match: {
        ownerUserId: ownerObjId,
        endedAt: { $ne: null, $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$teamMemberId',
        hoursLogged: { $sum: { $divide: ['$durationMinutes', 60] } },
        gross: { $sum: { $multiply: ['$hourlyRate', { $divide: ['$durationMinutes', 60] }] } },
        jobIds: { $addToSet: '$jobId' },
        rateSnapshot: { $first: '$hourlyRate' },
      },
    },
    {
      $lookup: {
        from: 'teammembers',
        localField: '_id',
        foreignField: '_id',
        as: 'member',
      },
    },
    { $unwind: '$member' },
  ]);

  // Fetch owner's hourlyRate as final fallback
  const ownerDoc = await User.findById(ownerId).select('hourlyRate').lean<{ hourlyRate?: number } | null>();
  const ownerRate = ownerDoc?.hourlyRate ?? 0;

  const response = rows.map((row) => {
    let ratePerHour = row.rateSnapshot;
    let gross = row.gross;

    // Rate fallback chain: TimeEntry.hourlyRate → TeamMember.hourlyRate → owner.hourlyRate
    if (ratePerHour === 0) {
      ratePerHour = row.member.hourlyRate ?? ownerRate;
      gross = row.hoursLogged * ratePerHour;
    }

    return {
      memberId: String(row._id),
      memberName: row.member.name,
      role: row.member.role,
      color: row.member.color,
      avatarInitials: row.member.avatarInitials,
      hoursLogged: +row.hoursLogged.toFixed(2),
      ratePerHour,
      gross: +gross.toFixed(2),
      jobsCount: row.jobIds.length,
      hasRate: ratePerHour > 0,
    };
  });

  return NextResponse.json({ rows: response, from: from.toISOString(), to: to.toISOString() });
}
