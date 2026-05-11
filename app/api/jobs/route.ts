import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';
import Job from '@/lib/models/Job';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';
import { findOrCreateCustomer } from '@/lib/utils/findOrCreateCustomer';
import { requireCapability } from '@/lib/requirePlan';
import { sendEmail } from '@/lib/email/sendEmail';
import { firstJobTemplate } from '@/lib/email/templates';
import { requirePerm } from '@/lib/auth/permissions';
import { effectiveOwnerId, memberId } from '@/lib/auth/scope';
import { jobReadFilter } from '@/lib/auth/jobScope';

export const runtime = 'nodejs';

interface PartBody {
  name?: string;
  quantity?: number | string;
  unitCost?: number | string;
  markup?: number | string;
}

// ── Helper: validate + ownership-check assignedMemberIds ────────────────

async function validateAssignedMemberIds(
  rawIds: unknown,
  ownerUserId: string,
): Promise<Types.ObjectId[]> {
  if (!Array.isArray(rawIds) || rawIds.length === 0) return [];
  const validStrings = (rawIds as unknown[])
    .map((id) => String(id))
    .filter((id) => Types.ObjectId.isValid(id));
  if (validStrings.length === 0) return [];
  const owned = await TeamMember.find({
    _id: { $in: validStrings },
    ownerUserId,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();
  return owned.map((m) => m._id);
}

// ── GET /api/jobs ───────────────────────────────────────────────────────

const VALID_STATUSES = ['draft', 'complete', 'invoiced', 'paid'] as const;
type JobStatus = (typeof VALID_STATUSES)[number];

export async function GET(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'read', 'job');
  if (!perm.ok) return perm.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status') ?? 'all';
  const limitParam = Math.min(Number(searchParams.get('limit') ?? '50') || 50, 200);
  const assignedToParam = searchParams.get('assignedTo');

  // Build base filter using role-aware scope (handles owner vs member data isolation)
  const filter: Record<string, unknown> = jobReadFilter(session!, perm.scope);

  if (statusParam !== 'all' && (VALID_STATUSES as readonly string[]).includes(statusParam)) {
    filter.status = statusParam as JobStatus;
  }
  // Only allow assignedTo filter for owner/manager (all-scope); members are already scoped to own
  if (assignedToParam && perm.scope === 'all') {
    if (assignedToParam === 'none') {
      filter.assignedMemberIds = { $size: 0 };
    } else if (Types.ObjectId.isValid(assignedToParam)) {
      filter.assignedMemberIds = new Types.ObjectId(assignedToParam);
    }
  }

  await dbConnect();

  const ownerId = effectiveOwnerId(session!);
  const [rows, totalCount] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitParam)
      .select(
        '_id title status customerName customerAddress total laborHours createdAt aiParsed invoiceNumber invoiceId assignedMemberIds',
      )
      .lean<Record<string, unknown>[]>(),
    Job.countDocuments({ userId: ownerId }),
  ]);

  const jobs = rows.map((j) => ({ ...j, _id: String(j._id) }));
  return NextResponse.json({ jobs, totalCount });
}

// ── POST /api/jobs ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  const perm = requirePerm(session, 'write', 'job');
  if (!perm.ok) return perm.response;

  const gate = await requireCapability(session!.user.id, 'canCreateJobs');
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || !(body.title as string | undefined)?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  await dbConnect();

  // ── Resolve customer ──────────────────────────────────────────────

  const ownerId = effectiveOwnerId(session!);

  let customerId: string | null = (body.customerId as string | null) ?? null;

  if (customerId) {
    // Verify the caller actually owns this customer
    if (!Types.ObjectId.isValid(customerId)) {
      customerId = null;
    } else {
      const owned = await Customer.exists({ _id: customerId, userId: ownerId });
      if (!owned) customerId = null;
    }
  }

  if (!customerId) {
    const resolved = await findOrCreateCustomer(ownerId, {
      customerName: body.customerName as string | undefined,
      customerPhone: body.customerPhone as string | undefined,
      customerAddress: body.customerAddress as string | undefined,
      customerEmail: body.customerEmail as string | undefined,
    });
    customerId = resolved?.customerId ?? null;
  }

  // ── Validate assigned members ─────────────────────────────────────

  let rawAssignedIds = body.assignedMemberIds;
  // 'own' scope: member creates job assigned to themselves
  if (perm.scope === 'own') {
    const mid = memberId(session!);
    rawAssignedIds = mid ? [mid] : [];
  }

  const assignedMemberIds = await validateAssignedMemberIds(rawAssignedIds, ownerId);

  // ── Create job ────────────────────────────────────────────────────

  try {
    const job = await Job.create({
      userId: ownerId,
      customerId: customerId || null,
      customerName: (body.customerName as string) ?? '',
      customerPhone: (body.customerPhone as string) ?? '',
      customerAddress: (body.customerAddress as string) ?? '',
      title: (body.title as string).trim(),
      description: (body.description as string) ?? '',
      trade: '',
      jobType: (body.jobType as string) ?? 'residential',
      status: (body.status as string) === 'complete' ? 'complete' : 'draft',
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate as string) : null,
      scheduledStart: (body.scheduledStart as string) || null,
      scheduledEnd: (body.scheduledEnd as string) || null,
      completedDate: (body.status as string) === 'complete' ? new Date() : null,
      laborHours: Number(body.laborHours) || 0,
      laborRate: Number(body.laborRate) || 0,
      parts: ((body.parts as PartBody[]) ?? []).map((p) => ({
        name: p.name ?? '',
        quantity: Number(p.quantity) || 0,
        unitCost: Number(p.unitCost) || 0,
        markup: Number(p.markup) || 0,
      })),
      taxRate: Number(body.taxRate) || 0,
      aiParsed: Boolean(body.aiParsed),
      voiceTranscript: (body.voiceTranscript as string | null) ?? null,
      internalNotes: (body.internalNotes as string) ?? '',
      assignedMemberIds,
    });

    // Increment customer job count
    if (customerId) {
      await Customer.updateOne(
        { _id: customerId, userId: ownerId },
        { $inc: { jobCount: 1 }, $set: { updatedAt: new Date() } },
      );
    }

    // First job email — send to the owner (not the member)
    const jobCount = await Job.countDocuments({ userId: ownerId });
    if (jobCount === 1) {
      const user = await User.findById(ownerId).lean();
      if (user) {
        sendEmail({ to: user.email, ...firstJobTemplate(user, String(job._id)) }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, jobId: String(job._id) }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/jobs]', err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
