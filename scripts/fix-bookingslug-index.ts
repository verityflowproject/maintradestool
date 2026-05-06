/**
 * One-time migration: drop the broken `bookingSlug_1` unique+sparse index and
 * replace it with a partial unique index that only covers documents where
 * bookingSlug is a string.
 *
 * Why: the old index considered `null` a value, so every user (whose default
 * bookingSlug is null) collided with the first user inserted, causing
 * `User.create` to throw E11000 on signup.
 *
 * Run:  npx tsx scripts/fix-bookingslug-index.ts
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

  const before = await Users.indexes();
  console.log(
    'Before:',
    before
      .filter((i) => i.name?.startsWith('bookingSlug'))
      .map((i) => ({
        name: i.name,
        key: i.key,
        unique: i.unique,
        sparse: i.sparse,
        partialFilterExpression: i.partialFilterExpression,
      })),
  );

  // Drop any/all bookingSlug indexes (old broken one, plus the new one if a
  // previous run already created it — makes this script idempotent).
  for (const idx of before) {
    if (idx.name && idx.name.startsWith('bookingSlug') && idx.name !== '_id_') {
      console.log(`Dropping index: ${idx.name}`);
      await Users.dropIndex(idx.name);
    }
  }

  console.log('Creating partial unique index bookingSlug_1_partial...');
  await Users.createIndex(
    { bookingSlug: 1 },
    {
      unique: true,
      partialFilterExpression: { bookingSlug: { $type: 'string' } },
      name: 'bookingSlug_1_partial',
    },
  );

  const after = await Users.indexes();
  console.log(
    'After:',
    after
      .filter((i) => i.name?.startsWith('bookingSlug'))
      .map((i) => ({
        name: i.name,
        key: i.key,
        unique: i.unique,
        sparse: i.sparse,
        partialFilterExpression: i.partialFilterExpression,
      })),
  );

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
