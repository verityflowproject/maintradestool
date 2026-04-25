import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { deriveFullName } from '@/lib/utils/customerName';

export const runtime = 'nodejs';

// ── GET /api/customers ─────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const raw = await Customer.find({ userId: session.user.id })
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  try {
    const doc = await Customer.create({
      userId: session.user.id,
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
