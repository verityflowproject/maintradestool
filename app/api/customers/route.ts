import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { deriveFullName } from '@/lib/utils/customerName';
import { requireCapability } from '@/lib/requirePlan';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

// ── GET /api/customers ─────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'customer');
  if (!perm.ok) return perm.response;

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  const raw = await Customer.find({ userId: ownerId })
    .sort({ updatedAt: -1 })
    .select(
      '_id firstName lastName businessName phone email address city state jobCount totalBilled createdAt',
    )
    .lean<
      {
        _id: unknown;
        firstName?: string;
        lastName?: string;
        businessName?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        state?: string;
        jobCount?: number;
        totalBilled?: number;
        createdAt?: Date;
      }[]
    >();

  const customers = raw.map((c) => ({
    ...c,
    _id: String(c._id),
    fullName: deriveFullName(c),
  }));

  return NextResponse.json({ customers });
}

// ── POST /api/customers ────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'customer');
  if (!perm.ok) return perm.response;

  const gate = await requireCapability(session!.user.id, 'canCreateJobs');
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;

  const firstName = body?.firstName?.trim() ?? '';
  const businessName = body?.businessName?.trim() ?? '';

  if (!firstName && !businessName) {
    return NextResponse.json(
      { error: 'Please enter a first name or business name.' },
      { status: 400 },
    );
  }

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  try {
    const doc = await Customer.create({
      userId: ownerId,
      firstName,
      lastName: body?.lastName?.trim() ?? '',
      businessName,
      phone: body?.phone?.trim() ?? '',
      email: body?.email?.trim().toLowerCase() ?? '',
      address: body?.address?.trim() ?? '',
    });

    const lean = doc.toObject();
    const customer = {
      ...lean,
      _id: String(lean._id),
      fullName: deriveFullName(lean),
    };

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/customers]', err);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
