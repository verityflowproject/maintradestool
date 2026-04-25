import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import NotificationsSettingsClient from './NotificationsSettingsClient';

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id).select('notifications').lean();
  if (!user) redirect('/');

  const notifications = user.notifications ?? {};

  return (
    <NotificationsSettingsClient
      initialPrefs={{
        newBookingRequest: notifications.newBookingRequest ?? true,
        invoicePaid: notifications.invoicePaid ?? true,
        invoiceOverdue: notifications.invoiceOverdue ?? true,
        weeklyReport: notifications.weeklyReport ?? false,
        productUpdates: notifications.productUpdates ?? true,
      }}
    />
  );
}
