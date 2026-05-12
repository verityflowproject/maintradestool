import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { deriveFullName } from '@/lib/utils/customerName';
import { requireCapability } from '@/lib/requirePlan';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';
import {
  validatePhone,
  validateEmail,
  validatePersonName,
  validateBusinessName,
  validateAddress,
} from '@/lib/utils/validators';

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
  const lastName = body?.lastName?.trim() ?? '';
  const businessName = body?.businessName?.trim() ?? '';
  const phone = body?.phone?.trim() ?? '';
  const email = body?.email?.trim().toLowerCase() ?? '';

  if (!firstName && !businessName) {
    return NextResponse.json(
      { error: 'Please enter a first name or business name.' },
      { status: 400 },
    );
  }

  const nameErr = validatePersonName(firstName, 'First name');
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  const lastNameErr = validatePersonName(lastName, 'Last name');
  if (lastNameErr) return NextResponse.json({ error: lastNameErr }, { status: 400 });
  const bizErr = validateBusinessName(businessName);
  if (bizErr) return NextResponse.json({ error: bizErr }, { status: 400 });
  const phoneErr = validatePhone(phone);
  if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
  const emailErr = validateEmail(email);
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  const addressErr = validateAddress(body?.address?.trim() ?? '');
  if (addressErr) return NextResponse.json({ error: addressErr }, { status: 400 });

  await dbConnect();
  const ownerId = effectiveOwnerId(session!);

  try {
    const doc = await Customer.create({
      userId: ownerId,
      firstName,
      lastName,
      businessName,
      phone,
      email,
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
