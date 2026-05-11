import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId } from '@/lib/auth/scope';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'customer');
  if (!perm.ok) return perm.response;

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  await dbConnect();

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(escaped, 'i');

  const rows = await Customer.find({
    userId: effectiveOwnerId(session!),
    $or: [
      { firstName: rx },
      { lastName: rx },
      { businessName: rx },
      { phone: rx },
    ],
  })
    .select('firstName lastName businessName phone address')
    .limit(5)
    .lean<{
      _id: unknown;
      firstName?: string;
      lastName?: string;
      businessName?: string;
      phone?: string;
      address?: string;
    }[]>();

  const results = rows.map((c) => ({
    _id: String(c._id),
    fullName:
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
      c.businessName ||
      'Unknown',
    phone: c.phone ?? '',
    address: c.address ?? '',
  }));

  return NextResponse.json({ results });
}
