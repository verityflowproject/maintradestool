/**
 * One-time backfill: mint a publicAccessToken for every invoice that doesn't have one.
 *
 * Run with:
 *   npx tsx scripts/backfillInvoiceTokens.ts
 *
 * Reads MONGODB_URI automatically from .env.local in the project root.
 */

import { randomBytes } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load .env.local into process.env (Next.js convention)
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
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set and was not found in .env.local.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const InvoiceCollection = mongoose.connection.collection('invoices');

  const cursor = InvoiceCollection.find({ publicAccessToken: { $exists: false } });
  let count = 0;

  for await (const doc of cursor) {
    const token = randomBytes(24).toString('base64url');
    await InvoiceCollection.updateOne(
      { _id: doc._id },
      { $set: { publicAccessToken: token } },
    );
    count++;
  }

  console.log(`Backfilled ${count} invoice(s) with publicAccessToken.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
