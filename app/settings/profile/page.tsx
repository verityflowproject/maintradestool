import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ProfileSettingsClient from './ProfileSettingsClient';

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('firstName trade teamSize experienceYears')
    .lean();

  if (!user) redirect('/');

  return (
    <ProfileSettingsClient
      initialFirstName={user.firstName}
      initialTrade={user.trade}
      initialTeamSize={user.teamSize}
      initialExperienceYears={user.experienceYears}
    />
  );
}
