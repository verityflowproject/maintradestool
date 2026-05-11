import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import TimeEntry from '@/lib/models/TimeEntry';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'time');
  if (!perm.ok) return perm.response;

  const url = new URL(req.url);
  const period = url.searchParams.get('period');

  const now = new Date();
  const from = period === 'current'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const mid = memberId(session!);

  if (!mid) {
    // Owner accessing their own payroll: return empty for now
    return NextResponse.json({ hoursLogged: 0, gross: 0, ratePerHour: 0, hasRate: false });
  }

  const memberObjId = new Types.ObjectId(mid);
  const ownerObjId = new Types.ObjectId(ownerId);

  const [entries, tmDoc, ownerDoc] = await Promise.all([
    TimeEntry.find({
      ownerUserId: ownerObjId,
      teamMemberId: memberObjId,
      endedAt: { $ne: null, $gte: from, $lte: to },
    }).select('durationMinutes hourlyRate').lean<{ durationMinutes: number; hourlyRate: number }[]>(),
    TeamMember.findById(mid).select('hourlyRate').lean<{ hourlyRate?: number } | null>(),
    User.findById(ownerId).select('hourlyRate businessName').lean<{ hourlyRate?: number; businessName?: string } | null>(),
  ]);

  const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);
  const hoursLogged = +(totalMinutes / 60).toFixed(2);

  const snapshotRate = entries[0]?.hourlyRate ?? 0;
  const ratePerHour = snapshotRate > 0 ? snapshotRate : (tmDoc?.hourlyRate ?? ownerDoc?.hourlyRate ?? 0);
  const gross = +(hoursLogged * ratePerHour).toFixed(2);

  return NextResponse.json({
    hoursLogged,
    gross,
    ratePerHour,
    hasRate: ratePerHour > 0,
    ownerBusinessName: ownerDoc?.businessName ?? null,
  });
}
