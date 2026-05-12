/**
 * One-time idempotent backfill: marks every existing User as emailVerified.
 *
 * Run BEFORE the new email-confirmation code paths go live:
 *   MONGODB_URI=... npx ts-node --project tsconfig.json scripts/backfill-email-verified.ts
 *
 * Safe to run multiple times — already-processed documents are skipped.
 */

import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI env var is required');

  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');

  // Count documents that already have the field (idempotency check)
  const alreadyHadField = await users.countDocuments({
    emailVerified: { $exists: true },
  });

  // Update only documents where the field does not yet exist
  const result = await users.updateMany(
    { emailVerified: { $exists: false } },
    [
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: '$createdAt',
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
          emailVerificationLastSentAt: null,
          pendingEmailChange: null,
        },
      },
    ],
  );

  console.log(
    JSON.stringify({
      markedVerified: result.modifiedCount,
      alreadyHadField,
    }),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
