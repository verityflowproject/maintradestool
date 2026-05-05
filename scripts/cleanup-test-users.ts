/**
 * One-off / on-demand: delete obvious test accounts so QA can re-test signup
 * without the "email already registered" wall.
 *
 * Run with:
 *   npx tsx scripts/cleanup-test-users.ts
 *
 * Reads MONGODB_URI automatically from .env.local in the project root.
 *
 * Matching rule: any user whose email matches /testingu|fiverr|test|qa/i
 * is deleted, along with any of their owned customers / jobs / invoices /
 * requests / bookingrequests so we don't leave orphans.
 *
 * Real users will never match the regex (it's anchored to QA-style strings),
 * but the script also prints every match before deleting so we can sanity-
 * check the list.
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

const TEST_EMAIL_RX = /testingu|fiverr|test|qa/i;

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set and was not found in .env.local.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Users = mongoose.connection.collection('users');
  const Customers = mongoose.connection.collection('customers');
  const Jobs = mongoose.connection.collection('jobs');
  const Invoices = mongoose.connection.collection('invoices');
  const Requests = mongoose.connection.collection('bookingrequests');
  const ContactSubs = mongoose.connection.collection('contactsubmissions');

  const matches = await Users.find(
    { email: { $regex: TEST_EMAIL_RX } },
    {
      projection: {
        email: 1,
        firstName: 1,
        businessName: 1,
        plan: 1,
        onboardingCompleted: 1,
        createdAt: 1,
      },
    },
  ).toArray();

  if (matches.length === 0) {
    console.log('No test users matched. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${matches.length} test user(s):`);
  for (const u of matches) {
    console.log(
      ` - ${u.email}  (${u.firstName ?? '?'} / ${u.businessName ?? '?'}, plan=${u.plan}, onboarded=${u.onboardingCompleted}, _id=${u._id})`,
    );
  }

  const userIds = matches.map((u) => u._id);

  const customersRes = await Customers.deleteMany({ userId: { $in: userIds } });
  const jobsRes = await Jobs.deleteMany({ userId: { $in: userIds } });
  const invoicesRes = await Invoices.deleteMany({ userId: { $in: userIds } });
  const requestsRes = await Requests.deleteMany({ userId: { $in: userIds } });
  const contactRes = await ContactSubs.deleteMany({ userId: { $in: userIds } });
  const usersRes = await Users.deleteMany({ _id: { $in: userIds } });

  console.log('Deletion summary:');
  console.log(`  users:               ${usersRes.deletedCount}`);
  console.log(`  customers:           ${customersRes.deletedCount}`);
  console.log(`  jobs:                ${jobsRes.deletedCount}`);
  console.log(`  invoices:            ${invoicesRes.deletedCount}`);
  console.log(`  bookingrequests:     ${requestsRes.deletedCount}`);
  console.log(`  contactsubmissions:  ${contactRes.deletedCount}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
