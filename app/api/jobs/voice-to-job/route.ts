import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireCapability } from '@/lib/requirePlan';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

interface UserCtx {
  firstName: string;
  trade: string;
  hourlyRate: number;
  partsMarkup: number;
  region: string;
}

class ParseJsonError extends Error {
  constructor() {
    super('Could not parse job data');
    this.name = 'ParseJsonError';
  }
}

const SYSTEM_PROMPT =
  'You are an AI assistant that helps tradespeople log their jobs. ' +
  'You extract structured job data from voice descriptions. ' +
  'Always respond with valid JSON only — no markdown, no explanation, just the JSON object.';

function buildUserPrompt(transcript: string, ctx: UserCtx): string {
  return `Extract job details from this voice description by a ${ctx.trade} named ${ctx.firstName} based in ${ctx.region}.

Their default hourly rate is $${ctx.hourlyRate}/hr and default parts markup is ${ctx.partsMarkup}%.

Voice transcript:
"${transcript}"

Return a JSON object with exactly these fields:
{
  "customerName": string or null,
  "customerPhone": string or null,
  "customerAddress": string or null,
  "title": string (short job title, max 60 chars),
  "description": string (full job summary in professional language),
  "jobType": "residential" | "commercial" | "other",
  "laborHours": number or null,
  "laborRate": number (use ${ctx.hourlyRate} as default if not mentioned),
  "parts": [
    {
      "name": string,
      "quantity": number,
      "unitCost": number or 0 if unknown,
      "markup": number (use ${ctx.partsMarkup} as default)
    }
  ],
  "scheduledDate": string (ISO date) or null,
  "internalNotes": string or null (anything mentioned as a follow-up or reminder),
  "confidence": number (0-1, your confidence in the extraction quality)
}`;
}

async function parseJobWithClaude(
  client: Anthropic,
  transcript: string,
  ctx: UserCtx,
): Promise<unknown> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(transcript, ctx) }],
  });

  const raw = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  try {
    return JSON.parse(raw);
  } catch {
    throw new ParseJsonError();
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gate = await requireCapability(session.user.id, 'canUseVoice');
  if (!gate.ok) return gate.response;

  // Parse multipart form
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Recording too long. Please keep it under 5 minutes.' },
      { status: 400 },
    );
  }

  // Load user context from DB
  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('firstName trade hourlyRate partsMarkup region')
    .lean<UserCtx | null>();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Whisper transcription
  let transcriptText: string;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audio,
      language: 'en',
      prompt:
        'This is a tradesperson describing a job they completed. They may mention customer names, addresses, parts used, hours worked, and labor rates.',
    });
    transcriptText = transcription.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[POST /api/jobs/voice-to-job] Whisper error', err);
    return NextResponse.json(
      { error: 'Transcription failed', detail: message },
      { status: 500 },
    );
  }

  // Claude parsing
  let parsedJob: unknown;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    parsedJob = await parseJobWithClaude(anthropic, transcriptText, user);
  } catch (err) {
    if (err instanceof ParseJsonError) {
      return NextResponse.json(
        { error: 'Could not parse job data. Please try again.' },
        { status: 422 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[POST /api/jobs/voice-to-job] Claude error', err);
    return NextResponse.json(
      { error: 'Parsing failed', detail: message },
      { status: 500 },
    );
  }

  return NextResponse.json({ transcript: transcriptText, parsedJob });
}
