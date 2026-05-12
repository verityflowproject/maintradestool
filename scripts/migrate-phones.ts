/**
 * Phone E.164 migration script.
 *
 * Migrates all stored phone numbers in Customer, TeamMember, and User collections
 * to E.164 format using libphonenumber-js (best-effort, region US as default).
 *
 * Behaviour per record:
 *   - Already valid E.164 (starts with +, isValidPhoneNumber) → counted as alreadyValid, not touched.
 *   - Parseable → saved in E.164.
 *   - Unparseable → phoneOriginal field set to original value, main phone field left as-is.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/migrate-phones.ts
 *
 * Requires MONGODB_URI env var (same as the app).
 */

import mongoose from 'mongoose';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

const DEFAULT_REGION: CountryCode = 'US';

interface PhoneMigrationResult {
  collection: string;
  parsed: number;
  unparseable: number;
  alreadyValid: number;
  skipped: number; // empty / null / undefined
  errors: number;
}

function tryE164(rawPhone: string): string | null {
  if (!rawPhone?.trim()) return null;
  try {
    const parsed = parsePhoneNumber(rawPhone, DEFAULT_REGION);
    if (parsed && parsed.isValid()) return parsed.format('E.164');
  } catch {
    // not parseable
  }
  return null;
}

function isAlreadyE164(phone: string): boolean {
  if (!phone?.startsWith('+')) return false;
  try {
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
}

async function migrateCollection(
  collectionName: string,
  phoneField: string,
  originalField: string,
): Promise<PhoneMigrationResult> {
  const result: PhoneMigrationResult = {
    collection: collectionName,
    parsed: 0,
    unparseable: 0,
    alreadyValid: 0,
    skipped: 0,
    errors: 0,
  };

  const collection = mongoose.connection.db!.collection(collectionName);
  const cursor = collection.find(
    { [phoneField]: { $exists: true, $ne: null, $ne: '' } },
    { projection: { _id: 1, [phoneField]: 1 } },
  );

  const bulkOps: mongoose.mongo.AnyBulkWriteOperation[] = [];

  for await (const doc of cursor) {
    const raw = doc[phoneField] as string | undefined;
    if (!raw || !raw.trim()) {
      result.skipped++;
      continue;
    }

    if (isAlreadyE164(raw)) {
      result.alreadyValid++;
      continue;
    }

    const e164 = tryE164(raw);
    if (e164) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { [phoneField]: e164 } },
        },
      });
      result.parsed++;
    } else {
      // Preserve original in phoneOriginal; leave phone as-is
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { [originalField]: raw },
          },
        },
      });
      result.unparseable++;
    }
  }

  if (bulkOps.length > 0) {
    try {
      await collection.bulkWrite(bulkOps, { ordered: false });
    } catch (err) {
      console.error(`[migrate-phones] Bulk write error on ${collectionName}:`, err);
      result.errors++;
    }
  }

  return result;
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI env var is required. Add it to .env.local or set it in your shell.');
    process.exit(1);
  }

  console.log('[migrate-phones] Connecting to MongoDB…');
  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB });
  console.log('[migrate-phones] Connected.');

  const collections = [
    { name: 'customers', phoneField: 'phone', originalField: 'phoneOriginal' },
    { name: 'teammembers', phoneField: 'phone', originalField: 'phoneOriginal' },
    { name: 'users', phoneField: 'phone', originalField: 'phoneOriginal' },
  ];

  const totals = { parsed: 0, unparseable: 0, alreadyValid: 0, skipped: 0, errors: 0 };

  for (const { name, phoneField, originalField } of collections) {
    console.log(`\n[migrate-phones] Migrating ${name}.${phoneField}…`);
    const result = await migrateCollection(name, phoneField, originalField);
    console.log(
      `  alreadyValid: ${result.alreadyValid} | parsed → E.164: ${result.parsed} | unparseable: ${result.unparseable} | skipped (empty): ${result.skipped} | errors: ${result.errors}`,
    );
    totals.parsed += result.parsed;
    totals.unparseable += result.unparseable;
    totals.alreadyValid += result.alreadyValid;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }

  console.log('\n[migrate-phones] ─── TOTALS ───────────────────────────────────');
  console.log(`  Already valid E.164 : ${totals.alreadyValid}`);
  console.log(`  Parsed → E.164      : ${totals.parsed}`);
  console.log(`  Unparseable (kept)  : ${totals.unparseable}  ← phoneOriginal field set for manual review`);
  console.log(`  Skipped (empty)     : ${totals.skipped}`);
  console.log(`  Write errors        : ${totals.errors}`);
  console.log('[migrate-phones] Done.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[migrate-phones] Fatal error:', err);
  process.exit(1);
});
