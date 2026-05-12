/**
 * Server-only validators.
 * Import with `import { validateEmailFull } from '@/lib/utils/validators.server'`
 * These must NOT be imported in client components (they use Node built-ins).
 */

import { promises as dns } from 'dns';
import { validateEmail, normalizeEmail } from './validators';

// ── Disposable-domain blocklist ────────────────────────────────────────────
// Loaded once at module-init time. Not re-read on every request.

let disposableDomains: Set<string> | null = null;

function loadDisposableList(): Set<string> {
  if (disposableDomains) return disposableDomains;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw: string[] = require('disposable-email-domains');
    disposableDomains = new Set(raw.map((d: string) => d.toLowerCase()));
  } catch {
    console.warn('[validators.server] disposable-email-domains not found; skipping blocklist.');
    disposableDomains = new Set();
  }
  return disposableDomains;
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return loadDisposableList().has(domain);
}

// ── MX cache ──────────────────────────────────────────────────────────────
// Keyed by domain. Each entry expires after 1 hour.

interface MxCacheEntry {
  hasMx: boolean;
  expiresAt: number;
}

const mxCache = new Map<string, MxCacheEntry>();
const MX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function domainHasMxRecord(domain: string): Promise<boolean> {
  const now = Date.now();
  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > now) {
    return cached.hasMx;
  }

  let hasMx = false;
  try {
    const records = await dns.resolveMx(domain);
    hasMx = Array.isArray(records) && records.length > 0;
  } catch {
    hasMx = false;
  }

  mxCache.set(domain, { hasMx, expiresAt: now + MX_CACHE_TTL_MS });
  return hasMx;
}

// ── Full email validation (server-side) ───────────────────────────────────

/**
 * Full server-side email validation:
 *   1. Syntax check (same as client)
 *   2. Disposable-domain blocklist
 *   3. DNS MX record check
 *
 * Returns null if valid, an actionable error string if not.
 * Accepts empty string (optional field).
 */
export async function validateEmailFull(email: string): Promise<string | null> {
  const normalised = normalizeEmail(email);
  if (!normalised) return null;

  const syntaxErr = validateEmail(normalised);
  if (syntaxErr) return syntaxErr;

  if (isDisposableEmail(normalised)) {
    return "Please use a permanent email address — temporary email services aren't allowed.";
  }

  const domain = normalised.split('@')[1];
  if (domain) {
    const hasMx = await domainHasMxRecord(domain);
    if (!hasMx) {
      return `We can't reach that email's domain (${domain}). Double-check the spelling.`;
    }
  }

  return null;
}

/**
 * Full server-side validation for a required email.
 */
export async function validateRequiredEmailFull(email: string): Promise<string | null> {
  const normalised = normalizeEmail(email);
  if (!normalised) return 'Email address is required.';
  return validateEmailFull(normalised);
}

/**
 * Returns true if the email domain is on the disposable-email blocklist.
 */
export { isDisposableEmail };
