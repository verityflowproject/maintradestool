import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/mongodb';
import Job from '@/lib/models/Job';
import type { IJob } from '@/lib/models/Job';
import Invoice from '@/lib/models/Invoice';
import type { IInvoiceLineItem } from '@/lib/models/Invoice';
import User from '@/lib/models/User';
import Customer from '@/lib/models/Customer';
import { generateInvoiceNumber } from '@/lib/utils/invoiceNumber';
import { requireCapability } from '@/lib/requirePlan';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── Types ──────────────────────────────────────────────────────────────

interface UserCtx {
  businessName: string;
  region: string;
  hourlyRate: number;
  invoiceMethod: 'email' | 'sms' | 'download';
}

interface ClaudeLineItem {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  total?: unknown;
}

interface ClaudeInvoiceJson {
  lineItems?: ClaudeLineItem[];
  notes?: unknown;
  dueDate?: unknown;
}

class ParseJsonError extends Error {
  constructor() {
    super('Claude response was not valid JSON');
    this.name = 'ParseJsonError';
  }
}

// ── Prompt helpers ─────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are an expert invoice writer for trade businesses. ' +
  'You write clear, professional invoice line items based on job data. ' +
  'Respond with valid JSON only — no markdown, no explanation.';

function buildUserPrompt(
  job: IJob & { _id: Types.ObjectId },
  user: UserCtx,
  strict: boolean,
): string {
  const base = `Generate professional invoice line items for this job completed by ${user.businessName}.

Job details:
- Title: ${job.title}
- Description: ${job.description}
- Trade: ${job.trade}
- Labor: ${job.laborHours} hours at $${job.laborRate}/hr = $${job.laborTotal}
- Parts: ${JSON.stringify(job.parts)}
- Customer: ${job.customerName}
- Region: ${user.region}

Return a JSON object:
{
  "lineItems": [
    {
      "description": string (clear, professional line item description),
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ],
  "notes": string (professional closing note to customer, 1-2 sentences, warm but brief),
  "dueDate": string (ISO date, 14 days from today)
}

Rules:
- Labor should be one line item: 'Professional Labor — ${job.title}'
- Each part gets its own line item with marked-up price as unitPrice
- Be specific and professional — customers will see this
- notes should thank the customer and mention any warranty or follow-up if relevant from the job description`;

  return strict
    ? `${base}\n\nReturn ONLY the JSON object, nothing else.`
    : base;
}

// ── Claude call ────────────────────────────────────────────────────────

async function askClaude(
  client: Anthropic,
  job: IJob & { _id: Types.ObjectId },
  user: UserCtx,
  strict: boolean,
): Promise<ClaudeInvoiceJson> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(job, user, strict) }],
  });

  const raw = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  try {
    return JSON.parse(raw) as ClaudeInvoiceJson;
  } catch {
    throw new ParseJsonError();
  }
}

// ── Sanitizers ─────────────────────────────────────────────────────────

function sanitizeLineItems(arr: unknown): IInvoiceLineItem[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item: ClaudeLineItem) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const total = Number(item.total) || +(qty * unitPrice).toFixed(2);
    return {
      description: String(item.description ?? '').slice(0, 500),
      quantity: qty,
      unitPrice: +unitPrice.toFixed(2),
      total: +total.toFixed(2),
    };
  });
}

function safeDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── 1. Auth ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireCapability(session.user.id, 'canGenerateInvoices');
  if (!gate.ok) return gate.response;

  // ── 2. Parse + validate request body ──
  const body = (await req.json().catch(() => null)) as { jobId?: string } | null;
  if (!body?.jobId || !Types.ObjectId.isValid(body.jobId)) {
    return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
  }

  await dbConnect();

  // ── 3. Ownership-scoped job lookup ──
  const job = await Job.findOne({
    _id: body.jobId,
    userId: session.user.id,
  }).lean<(IJob & { _id: Types.ObjectId }) | null>();

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // ── 4. Duplicate-invoice guard (409) ──
  if (job.status === 'invoiced' && job.invoiceId) {
    return NextResponse.json(
      {
        error: 'Invoice already exists for this job',
        invoiceId: String(job.invoiceId),
      },
      { status: 409 },
    );
  }

  // ── 5. Load user context ──
  const user = await User.findById(session.user.id)
    .select('businessName region hourlyRate invoiceMethod')
    .lean<UserCtx | null>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // ── 6. Resolve customer email (Job doesn't store it; Customer does) ──
  let customerEmail = '';
  if (job.customerId) {
    const cust = await Customer.findById(job.customerId)
      .select('email')
      .lean<{ email?: string } | null>();
    customerEmail = cust?.email ?? '';
  }

  // ── 7. Claude — with one retry on JSON parse failure ──
  let claudeJson: ClaudeInvoiceJson;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    try {
      claudeJson = await askClaude(anthropic, job, user, false);
    } catch (e) {
      if (e instanceof ParseJsonError) {
        claudeJson = await askClaude(anthropic, job, user, true);
      } else {
        throw e;
      }
    }
  } catch (e) {
    if (e instanceof ParseJsonError) {
      return NextResponse.json(
        { error: 'Could not parse invoice data. Please try again.' },
        { status: 422 },
      );
    }
    console.error('[POST /api/invoices/generate] Claude error', e);
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 });
  }

  // ── 8. Assemble invoice document ──
  const invoiceNumber = await generateInvoiceNumber(session.user.id);
  const lineItems = sanitizeLineItems(claudeJson.lineItems);
  const subtotal = +lineItems.reduce((s, li) => s + li.total, 0).toFixed(2);
  const taxRate = Number(job.taxRate) || 0;
  const taxTotal = +(subtotal * (taxRate / 100)).toFixed(2);
  const total = +(subtotal + taxTotal).toFixed(2);
  const dueDate =
    safeDate(claudeJson.dueDate) ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // ── 9. Persist invoice ──
  let invoice;
  try {
    invoice = await Invoice.create({
      userId: session.user.id,
      jobId: job._id,
      customerId: job.customerId ?? null,
      invoiceNumber,
      status: 'draft',
      businessName: user.businessName ?? '',
      businessRegion: user.region ?? '',
      businessPhone: '',
      businessEmail: '',
      customerName: job.customerName ?? '',
      customerEmail,
      customerPhone: job.customerPhone ?? '',
      customerAddress: job.customerAddress ?? '',
      lineItems,
      subtotal,
      taxRate,
      taxTotal,
      total,
      notes: String(claudeJson.notes ?? '').slice(0, 2000),
      dueDate,
      deliveryMethod: user.invoiceMethod ?? 'email',
    });
  } catch (e) {
    console.error('[POST /api/invoices/generate] Invoice.create error', e);
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 });
  }

  // ── 10. Flip job to invoiced; roll back invoice on failure ──
  try {
    await Job.updateOne(
      { _id: job._id, userId: session.user.id },
      {
        $set: {
          status: 'invoiced',
          invoiceId: invoice._id,
          invoiceNumber,
          updatedAt: new Date(),
        },
      },
    );
  } catch (e) {
    await Invoice.deleteOne({ _id: invoice._id });
    console.error('[POST /api/invoices/generate] job-update rollback', e);
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 });
  }

  return NextResponse.json(
    { invoiceId: String(invoice._id), invoiceNumber, invoice },
    { status: 201 },
  );
}
