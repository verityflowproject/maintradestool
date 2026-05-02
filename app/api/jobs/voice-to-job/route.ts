import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI, { toFile } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { dbConnect } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requireCapability } from '@/lib/requirePlan';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
};

/** Strip codec params: "audio/webm;codecs=opus" → "audio/webm" */
function baseType(mime: string): string {
  return (mime || '').split(';')[0].trim().toLowerCase();
}

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

/** Extract the first balanced JSON object from a string, tolerating markdown fences and prose. */
function extractJson(raw: string): string {
  // Strip optional ```json … ``` or ``` … ``` fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Fall back: find the first '{' and its matching '}'
  const start = raw.indexOf('{');
  if (start === -1) return raw;
  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return raw;
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
    return JSON.parse(extractJson(raw));
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

  const voiceLimit = rateLimit('voice', session.user.id, { max: 30, windowMs: 60 * 60 * 1000 });
  if (!voiceLimit.ok) {
    return NextResponse.json(
      { error: 'Voice limit reached. Please wait before logging another job.' },
      { status: 429 },
    );
  }

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

  // Normalise MIME type and build a properly-named file for Whisper.
  // Whisper uses the file extension to choose its decoder, so a mislabeled
  // file (e.g. audio/mp4 content named "recording.webm") will always fail.
  const mime = baseType(audio.type || 'audio/webm');
  const ext = MIME_TO_EXT[mime] ?? 'webm';
  console.info('[POST /api/jobs/voice-to-job] audio', {
    originalType: audio.type,
    normalizedMime: mime,
    ext,
    size: audio.size,
  });

  const buffer = Buffer.from(await audio.arrayBuffer());
  const whisperFile = await toFile(buffer, `audio.${ext}`, { type: mime });

  // Whisper transcription — one automatic retry on transient network/5xx failures
  let transcriptText: string;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async function runWhisper() {
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: whisperFile,
      language: 'en',
      temperature: 0,
      prompt:
        'This is a tradesperson describing a job they completed. They may mention customer names, addresses, parts used, hours worked, and labor rates.',
    });
    return transcription.text;
  }

  try {
    transcriptText = await runWhisper();
  } catch (firstErr) {
    const isTransient =
      firstErr instanceof Error &&
      (firstErr.message.includes('fetch') ||
        firstErr.message.includes('ECONNRESET') ||
        firstErr.message.includes('timeout') ||
        (firstErr as { status?: number }).status != null
          ? (firstErr as { status?: number }).status! >= 500
          : false);

    if (isTransient) {
      console.warn('[POST /api/jobs/voice-to-job] Whisper transient error, retrying once', firstErr);
      try {
        transcriptText = await runWhisper();
      } catch (retryErr) {
        const message = retryErr instanceof Error ? retryErr.message : 'Unknown error';
        console.error('[POST /api/jobs/voice-to-job] Whisper retry failed', retryErr);
        return NextResponse.json(
          { error: 'Transcription failed', detail: message },
          { status: 500 },
        );
      }
    } else {
      const message = firstErr instanceof Error ? firstErr.message : 'Unknown error';
      console.error('[POST /api/jobs/voice-to-job] Whisper error', firstErr);
      return NextResponse.json(
        { error: 'Transcription failed', detail: message },
        { status: 500 },
      );
    }
  }

  console.info('[POST /api/jobs/voice-to-job] transcript ok', {
    length: transcriptText.length,
    preview: transcriptText.slice(0, 80),
  });

  // Claude parsing
  let parsedJob: unknown;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    parsedJob = await parseJobWithClaude(anthropic, transcriptText, user);
  } catch (err) {
    if (err instanceof ParseJsonError) {
      return NextResponse.json(
        { error: 'Could not parse job data. Please try again.', detail: 'Claude response was not valid JSON.' },
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
