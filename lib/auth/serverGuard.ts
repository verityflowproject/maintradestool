import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { can, type Action, type Resource, type Role } from './permissions';

/**
 * SSR page guard — call at the top of server-component pages.
 * Redirects unauthenticated users to /onboarding.
 * Redirects deactivated members to /team-access-revoked.
 * Redirects users without sufficient permission to /dashboard.
 * Returns the session and resolved scope on success.
 */
export async function requirePagePerm(action: Action, resource: Resource) {
  const session = await auth();
  if (!session?.user?.id) redirect('/onboarding');
  if (session.user.accountType === 'member' && !session.user.memberActive) {
    redirect('/team-access-revoked');
  }
  const r = can(session.user.role as Role, action, resource);
  if (!r.allowed) redirect('/dashboard');
  return { session, scope: r.scope };
}
