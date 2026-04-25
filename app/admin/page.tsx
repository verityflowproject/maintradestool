import { auth } from '@/auth';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata = {
  title: 'Admin — TradesBrain',
};

export default async function AdminPage() {
  const session = await auth();
  const adminEmail = session?.user?.email ?? '';

  return <AdminDashboardClient adminEmail={adminEmail} />;
}
