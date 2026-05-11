import { notFound } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import AcceptInviteClient from './AcceptInviteClient';

interface Props {
  params: { token: string };
  searchParams: { memberId?: string };
}

function InvalidPage({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-card"
        style={{ maxWidth: 400, width: '100%', padding: '32px 24px', textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 12,
          }}
        >
          Invite invalid or expired
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
          {message}
        </p>
        <a
          href="/"
          style={{
            color: 'var(--accent-text)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Go to VerityFlow →
        </a>
      </div>
    </div>
  );
}

export default async function AcceptInvitePage({ params, searchParams }: Props) {
  const { token } = params;
  const memberId = searchParams.memberId ?? '';

  if (!token || !memberId || !Types.ObjectId.isValid(memberId)) {
    return <InvalidPage message="This invite link is invalid or has already been used." />;
  }

  await dbConnect();

  const member = await TeamMember.findById(memberId).lean<{
    _id: Types.ObjectId;
    ownerUserId: Types.ObjectId;
    linkedUserId: Types.ObjectId | null;
    name: string;
    email: string;
    inviteTokenHash: string | null;
    inviteTokenExpiresAt: Date | null;
    inviteAcceptedAt: Date | null;
  } | null>();

  if (!member) {
    return <InvalidPage message="This invite link is invalid or has already been used." />;
  }

  if (!member.inviteTokenHash || !member.inviteTokenExpiresAt) {
    return <InvalidPage message="This invite link is invalid or has already been used." />;
  }

  if (member.linkedUserId) {
    return <InvalidPage message="This invite was already accepted. Sign in to access your account." />;
  }

  if (member.inviteTokenExpiresAt.getTime() < Date.now()) {
    return (
      <InvalidPage message="This invite has expired. Ask the team owner to send a fresh invite." />
    );
  }

  const valid = await bcrypt.compare(token, member.inviteTokenHash);
  if (!valid) {
    return <InvalidPage message="This invite link is invalid or has already been used." />;
  }

  // Email collision check — someone may have registered between invite send and page load
  const emailConflict = await User.findOne({ email: member.email }).select('_id').lean();
  if (emailConflict) {
    return (
      <InvalidPage message="This email address is already registered on VerityFlow. Ask the owner to use a different email for this team member." />
    );
  }

  const owner = await User.findById(member.ownerUserId)
    .select('firstName businessName')
    .lean<{ firstName: string; businessName: string } | null>();

  if (!owner) notFound();

  return (
    <AcceptInviteClient
      memberName={member.name}
      memberEmail={member.email}
      ownerFirstName={owner.firstName}
      ownerBusinessName={owner.businessName}
      token={token}
      memberId={String(member._id)}
    />
  );
}
