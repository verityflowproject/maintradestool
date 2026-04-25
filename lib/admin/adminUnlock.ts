const encoder = new TextEncoder();

export const ADMIN_COOKIE = 'admin-unlock';
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function getSecret(): string {
  const s = process.env.ADMIN_UNLOCK_SECRET;
  if (!s) throw new Error('ADMIN_UNLOCK_SECRET env var not set');
  return s;
}

// base64url helpers using btoa/atob (available in Edge + Node 18+)
function b64uEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  return atob(pad ? padded + '='.repeat(4 - pad) : padded);
}

function hexFromBuffer(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferFromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function hmacHex(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return hexFromBuffer(sig);
}

// ── Token lifecycle ───────────────────────────────────────────────────

export async function signAdminToken(userId: string): Promise<string> {
  const payload = b64uEncode(JSON.stringify({ userId, exp: Date.now() + TTL_MS }));
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(
  token: string,
): Promise<{ userId: string } | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedHex = await hmacHex(payload);
  const expected = bufferFromHex(expectedHex);
  const actual = bufferFromHex(sig);
  if (!constantTimeEqual(expected, actual)) return null;

  try {
    const data = JSON.parse(b64uDecode(payload)) as {
      userId: string;
      exp: number;
    };
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

// ── Middleware-compatible check (reads from NextRequest) ──────────────

import type { NextRequest } from 'next/server';

export async function isAdminUnlockedFromRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return (await verifyAdminToken(token)) !== null;
}

// ── Server-component check (reads from Next's cookies() API) ─────────

export async function isAdminUnlocked(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    return (await verifyAdminToken(token)) !== null;
  } catch {
    return false;
  }
}
