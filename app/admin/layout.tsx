import { notFound } from 'next/navigation';
import { isAdminUnlocked } from '@/lib/admin/adminUnlock';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unlocked = await isAdminUnlocked();
  if (!unlocked) {
    notFound();
  }

  return <>{children}</>;
}
