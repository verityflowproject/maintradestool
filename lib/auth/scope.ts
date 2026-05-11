import type { Session } from 'next-auth';

/**
 * Returns the userId that owns the data the current session should read/write under.
 * - Owners: their own id
 * - Members: their parent owner's id
 */
export function effectiveOwnerId(session: Session): string {
  return session.user.effectiveOwnerId;
}

/**
 * Returns the member's linkedTeamMemberId, or null if the session is an owner.
 * Used for filtering "own assigned jobs" queries.
 */
export function memberId(session: Session): string | null {
  return session.user.accountType === 'member'
    ? (session.user.linkedTeamMemberId ?? null)
    : null;
}
