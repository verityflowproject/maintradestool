import { auth } from '@/auth';
import { isAdminUnlocked } from '@/lib/admin/adminUnlock';
import type { Session } from 'next-auth';

export async function requireAdmin(): Promise<Session | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const unlocked = await isAdminUnlocked();
  if (!unlocked) return null;
  return session;
}
