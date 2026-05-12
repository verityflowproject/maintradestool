import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import Job from '@/lib/models/Job';
import { deriveFullName } from '@/lib/utils/customerName';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';
import {
  validatePhone,
  validateEmail,
  validatePersonName,
  validateBusinessName,
  validateAddress,
  validateFreeTextLong,
  stripNullBytes,
} from '@/lib/utils/validators';

export const runtime = 'nodejs';

// ── Helpers ────────────────────────────────────────────────────────────

const PATCHABLE_FIELDS = [
  'firstName',
  'lastName',
  'businessName',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'notes',
] as const;

type PatchableField = (typeof PATCHABLE_FIELDS)[number];

// ── GET /api/customers/[customerId] ────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { customerId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'customer');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const raw = await Customer.findOne({
    _id: params.customerId,
    userId: ownerId,
  }).lean<Record<string, unknown> | null>();

  if (!raw) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const customer = { ...raw, _id: String(raw._id), fullName: deriveFullName(raw) };
  return NextResponse.json({ customer });
}

// ── PATCH /api/customers/[customerId] ──────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: { customerId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'customer');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Whitelist + sanitise
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of PATCHABLE_FIELDS) {
    if (field in body && body[field] !== undefined) {
      const val = String(body[field] ?? '').trim();
      $set[field] = field === 'email' ? val.toLowerCase() : val;
    }
  }

  if (Object.keys($set).length === 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Format validation
  if ('firstName' in $set) {
    const err = validatePersonName($set.firstName as string, 'First name');
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('lastName' in $set) {
    const err = validatePersonName($set.lastName as string, 'Last name');
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('businessName' in $set) {
    const err = validateBusinessName($set.businessName as string);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('phone' in $set) {
    const err = validatePhone($set.phone as string);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('email' in $set) {
    const err = validateEmail($set.email as string);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('address' in $set) {
    const err = validateAddress($set.address as string);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }
  if ('notes' in $set) {
    const err = validateFreeTextLong($set.notes as string, 'Notes');
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    $set.notes = stripNullBytes($set.notes as string);
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const raw = await Customer.findOneAndUpdate(
    { _id: params.customerId, userId: ownerId },
    { $set },
    { new: true },
  ).lean<Record<string, unknown> | null>();

  if (!raw) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const customer = { ...raw, _id: String(raw._id), fullName: deriveFullName(raw) };
  return NextResponse.json({ customer });
}

// ── DELETE /api/customers/[customerId] ─────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: { customerId: string } },
) {
  const session = await auth();
  const perm = requirePerm(session, 'delete', 'customer');
  if (!perm.ok) return perm.response;
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  // Null out customerId on all jobs that belong to this owner + customer (preserves job history)
  await Job.updateMany(
    { customerId: params.customerId, userId: ownerId },
    { $set: { customerId: null, updatedAt: new Date() } },
  );

  const result = await Customer.deleteOne({
    _id: params.customerId,
    userId: ownerId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

