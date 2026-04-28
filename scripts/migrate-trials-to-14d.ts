/**
 * One-shot migration: cap all active trials at 14 days from now.
 *
 * Run with:
 *   npx tsx scripts/migrate-trials-to-14d.ts
 *
 * Requires MONGODB_URI in environment (reads from .env.local automatically via dotenv).
 */

import path from 'path';
import fs from 'fs';

// Load .env.local manually (dotenv is not installed as a runtime dep)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Add it to .env.local');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB.');

  const now = new Date();
  const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const result = await User.updateMany(
    {
      plan: 'trial',
      trialEndsAt: { $gt: cutoff },
    },
    {
      $set: {
        trialEndsAt: cutoff,
        trialWarningsSent: {
          sevenDay: false,
          threeDay: false,
          oneDay: false,
          midpoint: false,
        },
      },
    },
  );

  console.log(`Migration complete. Updated ${result.modifiedCount} user(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
