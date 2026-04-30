/**
 * One-time backfill: mint a publicAccessToken for every invoice that doesn't have one.
 *
 * Run with:
 *   npx tsx scripts/backfillInvoiceTokens.ts
 *
 * Requires MONGODB_URI in environment (copy from .env.local before running).
 */

import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy it from .env.local first.');
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
