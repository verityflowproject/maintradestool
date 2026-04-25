import UserDetailClient from './UserDetailClient';

export const metadata = { title: 'User Detail — TradesBrain Admin' };

export default function AdminUserDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  return <UserDetailClient userId={params.userId} />;
}
