import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import Job from '@/lib/models/Job';
import { deriveFullName } from '@/lib/utils/customerName';

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  const raw = await Customer.findOne({
    _id: params.customerId,
    userId: session.user.id,
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

  await dbConnect();

  const raw = await Customer.findOneAndUpdate(
    { _id: params.customerId, userId: session.user.id },
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Types.ObjectId.isValid(params.customerId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await dbConnect();

  // Null out customerId on all jobs that belong to this user + customer (preserves job history)
  await Job.updateMany(
    { customerId: params.customerId, userId: session.user.id },
    { $set: { customerId: null, updatedAt: new Date() } },
  );

  const result = await Customer.deleteOne({
    _id: params.customerId,
    userId: session.user.id,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

