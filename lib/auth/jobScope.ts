import { Types } from 'mongoose';
import type { Session } from 'next-auth';
import { effectiveOwnerId, memberId } from './scope';

/**
 * Returns a Mongoose filter object for jobs the current session is allowed to read.
 * Pass `scope` from the requirePerm result.
 *
 * 'all'  → all jobs owned by the effective owner
 * 'own'  → only jobs where the member's linkedTeamMemberId is in assignedMemberIds
 * 'self' → treated the same as 'all' for jobs (no per-job self concept)
 */
export function jobReadFilter(
  session: Session,
  scope: 'all' | 'own' | 'self',
): Record<string, unknown> {
  const ownerId = effectiveOwnerId(session);

  if (scope === 'own') {
    const mid = memberId(session);
    // Guard: if somehow a member has no linkedTeamMemberId, return an impossible filter
    if (!mid) return { userId: ownerId, _id: { $exists: false } };
    return { userId: ownerId, assignedMemberIds: new Types.ObjectId(mid) };
  }

  // 'all' and 'self' both return the full owner scope for jobs
  return { userId: ownerId };
}
