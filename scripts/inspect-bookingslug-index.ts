/**
 * Read-only diagnostic: list the bookingSlug index on `users` and show how
 * many docs have null vs string slugs, so we can plan the index fix safely.
 *
 * Run:  npx tsx scripts/inspect-bookingslug-index.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  const Users = mongoose.connection.collection('users');
  const indexes = await Users.indexes();
  const bookingIdx = indexes.find((i) => i.name?.startsWith('bookingSlug'));

  console.log('--- bookingSlug index ---');
  console.log(JSON.stringify(bookingIdx, null, 2));

  const total = await Users.countDocuments({});
  const withNullSlug = await Users.countDocuments({ bookingSlug: null });
  const withStringSlug = await Users.countDocuments({
    bookingSlug: { $type: 'string' },
  });

  console.log('--- counts ---');
  console.log({ total, withNullSlug, withStringSlug });

  // Are any string slugs duplicated? (would block a unique partial index build)
  const dupes = await Users.aggregate([
    { $match: { bookingSlug: { $type: 'string' } } },
    { $group: { _id: '$bookingSlug', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  console.log('--- duplicate string slugs ---');
  console.log(dupes);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
