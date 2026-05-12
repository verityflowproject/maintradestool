/**
 * Central validation library — imported by both client components and API routes.
 * All functions return null on valid input, or a human-readable, actionable error string.
 *
 * Server-only validators (MX check, disposable domains) live in validators.server.ts.
 */

import { AsYouType, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

// ── Constants ──────────────────────────────────────────────────────────────

export const MAX_HOURLY_RATE = 2_000;
export const MAX_LINE_ITEM_COST = 250_000;
export const MAX_LABOR_HOURS = 1_000;
export const MAX_QTY = 10_000;
export const MAX_PARTS_MARKUP = 500;
export const MAX_TAX_RATE = 30;
export const MAX_LATE_FEE = 50;
export const MAX_NAME_LENGTH = 100;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_FREE_TEXT_LONG = 10_000;
export const MAX_FREE_TEXT_SHORT = 2_000;
export const MAX_SLUG_LENGTH = 40;
export const MIN_SLUG_LENGTH = 3;
export const JOB_DATE_MAX_YEARS_FUTURE = 5;

export const SLUG_RESERVED_WORDS = new Set([
  'admin', 'api', 'app', 'auth', 'billing', 'book', 'contact', 'dashboard',
  'help', 'invoice', 'invoices', 'jobs', 'legal', 'onboarding', 'settings',
  'team', 'unsubscribe', 'www', 'root', 'support', 'login', 'signin',
  'signup', 'register', 'calendar', 'time', 'requests', 'payroll', 'features',
  'customers', 'webhooks', 'offline', 'robots', 'sitemap',
]);

/** Regex for the subset of characters allowed while typing a phone number */
const PHONE_ALLOWED_RE = /[^0-9\s\-().+]/g;

/**
 * Email regex: exactly one @, valid local + domain parts, TLD ≥ 2 chars.
 * Rejects leading/trailing whitespace.
 */
export const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// ── Phone ──────────────────────────────────────────────────────────────────

/**
 * Strips characters that are never valid in a phone number while the user types.
 * Keeps: digits, space, dash, dot, parens, +
 */
export function sanitizePhone(value: string): string {
  return value.replace(PHONE_ALLOWED_RE, '');
}

/**
 * Returns an As-You-Type formatted string for a phone number.
 * Used in phone <input> onChange handlers for live formatting.
 * Defaults to US formatting when region is unknown.
 */
export function formatPhoneAsYouType(value: string, region: CountryCode = 'US'): string {
  const formatter = new AsYouType(region);
  return formatter.input(value);
}

/**
 * Validates a phone number using libphonenumber-js.
 * Accepts empty string (phone is optional on most forms).
 * Returns null when valid, an actionable error string when invalid.
 */
export function validatePhone(value: string, region: CountryCode = 'US'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    if (!isValidPhoneNumber(trimmed, region)) {
      return `Enter a valid phone number — like (555) 123-4567 for US, or include a country code like +44 for international.`;
    }
  } catch {
    return `Enter a valid phone number — like (555) 123-4567.`;
  }
  return null;
}

/**
 * Parses a phone number to E.164 format for storage.
 * Returns the E.164 string on success, or null if unparseable.
 * SERVER USE — call before saving to DB.
 */
export function toE164(value: string, region: CountryCode = 'US'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = parsePhoneNumber(trimmed, region);
    if (parsed && parsed.isValid()) return parsed.format('E.164');
  } catch {
    // fall through
  }
  return null;
}

// ── Email ──────────────────────────────────────────────────────────────────

/**
 * Returns an error message if the email address is syntactically malformed,
 * or null if OK. Accepts empty string (email is optional on most forms).
 * Normalises: lowercase + trim before testing.
 */
export function validateEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address — like name@example.com.';
  }
  return null;
}

/**
 * Like validateEmail but treats the field as required.
 */
export function validateRequiredEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 'Email address is required.';
  if (!EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address — like name@example.com.';
  }
  return null;
}

/**
 * Normalises an email address: lowercase + trim.
 * Always call this before storing or comparing emails.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ── Names ──────────────────────────────────────────────────────────────────

/**
 * Strips characters that are never valid in a person or business name while typing.
 * Allows Unicode letters, marks, digits, spaces, hyphens, apostrophes, dots, commas, &.
 * Does NOT filter accented chars or non-Latin scripts.
 */
export function sanitizeName(value: string): string {
  // Remove characters that are clearly not part of any name:
  // keep letters (any language), marks, digits, spaces, common punctuation
  return value.replace(/[^\p{L}\p{M}\p{N}\s'\-.,&]/gu, '');
}

/**
 * Validates a person name (first / last).
 * - 1–100 characters after trim
 * - Must contain at least one Unicode letter (supports any language)
 * - Rejects all-digit, emoji-only, all-punctuation strings
 */
export function validatePersonName(value: string, label = 'Name'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${label} must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (!/\p{L}/u.test(trimmed)) {
    return `${label} must contain at least one letter.`;
  }
  return null;
}

/**
 * Validates a business name.
 * - 2–100 characters after trim
 * - Must contain at least one Unicode letter
 */
export function validateBusinessName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return 'Business name must be at least 2 characters.';
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Business name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (!/\p{L}/u.test(trimmed)) {
    return 'Business name must contain at least one letter.';
  }
  return null;
}

// ── Money / rates / currency ───────────────────────────────────────────────

/**
 * Strips commas, currency symbols, and whitespace from a money input.
 * Preserves a single decimal point.
 */
export function sanitizeMoney(value: string): string {
  const stripped = value.replace(/[$,\s]/g, '');
  const cleaned = stripped.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
}

/**
 * Strips non-numeric characters (except a single decimal point) while typing.
 */
export function sanitizeDecimal(value: string): string {
  return sanitizeMoney(value);
}

/**
 * Strips non-digit characters (integers only) while typing.
 */
export function sanitizeInteger(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates an hourly labor rate.
 * Range: $0 – $2,000/hr
 */
export function validateHourlyRate(value: string | number): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return 'Hourly rate must be a number — e.g. 75 or 125.50.';
  if (n < 0) return 'Hourly rate cannot be negative.';
  if (n > MAX_HOURLY_RATE) return `Hourly rate cannot exceed $${MAX_HOURLY_RATE.toLocaleString()}/hr.`;
  return null;
}

/**
 * Validates a line-item unit cost (parts).
 * Range: $0 – $250,000
 */
export function validateLineItemCost(value: string | number): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return 'Cost must be a number — e.g. 49.99.';
  if (n < 0) return 'Cost cannot be negative.';
  if (n > MAX_LINE_ITEM_COST) return `Cost cannot exceed $${MAX_LINE_ITEM_COST.toLocaleString()}.`;
  return null;
}

/**
 * Validates a generic price / cost value.
 * Range: $0 – $999,999.99
 */
export function validatePrice(value: string | number, label = 'Amount'): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return `${label} must be a number — e.g. 49.99.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > 999_999.99) return `${label} cannot exceed $999,999.`;
  return null;
}

/**
 * Validates a percentage field.
 * Default range: 0–100. Pass maxVal to override (e.g. markup).
 */
export function validatePercent(
  value: string | number,
  label = 'Value',
  maxVal = 100,
): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return `${label} must be a number — e.g. 20.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > maxVal) return `${label} cannot exceed ${maxVal}%.`;
  return null;
}

/**
 * Validates a parts markup percentage.
 * Range: 0–500%
 */
export function validateMarkup(value: string | number): string | null {
  return validatePercent(value, 'Parts markup', MAX_PARTS_MARKUP);
}

/**
 * Validates a late fee percentage.
 * Range: 0–50%
 */
export function validateLateFee(value: string | number): string | null {
  return validatePercent(value, 'Late fee', MAX_LATE_FEE);
}

/**
 * Validates a tax rate.
 * Range: 0–30%
 */
export function validateTaxRate(value: string | number): string | null {
  return validatePercent(value, 'Tax rate', MAX_TAX_RATE);
}

/**
 * Validates labor hours for a single job.
 * Range: 0–1,000 hours
 */
export function validateHours(value: string | number): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return 'Hours must be a number — e.g. 2.5.';
  if (n < 0) return 'Hours cannot be negative.';
  if (n > MAX_LABOR_HOURS) {
    return `Hours cannot exceed ${MAX_LABOR_HOURS.toLocaleString()} per job.`;
  }
  return null;
}

/**
 * Validates a parts quantity.
 * Range: 1–10,000 (integer, positive)
 */
export function validateQty(value: string | number): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isFinite(n)) return 'Quantity must be a whole number — e.g. 3.';
  if (n < 0) return 'Quantity cannot be negative.';
  if (n > MAX_QTY) return `Quantity cannot exceed ${MAX_QTY.toLocaleString()}.`;
  return null;
}

// ── Text fields ────────────────────────────────────────────────────────────

/**
 * Validates a required text field (any text, just must be non-empty after trim).
 */
export function validateRequired(value: string, label = 'This field'): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

/**
 * Validates a free-text long field (job description, notes, etc.).
 * Max 10,000 chars. Accepts empty.
 */
export function validateFreeTextLong(value: string, label = 'This field'): string | null {
  if (value.length > MAX_FREE_TEXT_LONG) {
    return `${label} cannot exceed ${MAX_FREE_TEXT_LONG.toLocaleString()} characters (currently ${value.length.toLocaleString()}).`;
  }
  return null;
}

/**
 * Validates a short free-text field (headline, notes, invoice message, etc.).
 * Max 2,000 chars. Accepts empty.
 */
export function validateFreeTextShort(value: string, label = 'This field'): string | null {
  if (value.length > MAX_FREE_TEXT_SHORT) {
    return `${label} cannot exceed ${MAX_FREE_TEXT_SHORT.toLocaleString()} characters (currently ${value.length.toLocaleString()}).`;
  }
  return null;
}

/**
 * Validates an optional text field with a maximum length (legacy helper).
 */
export function validateMaxLength(value: string, max: number, label = 'This field'): string | null {
  if (value.length > max) return `${label} must be ${max.toLocaleString()} characters or fewer.`;
  return null;
}

/**
 * Validates an address field.
 * Max 500 chars. Must be non-empty if provided.
 */
export function validateAddress(value: string, label = 'Address'): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_ADDRESS_LENGTH) {
    return `${label} cannot exceed ${MAX_ADDRESS_LENGTH} characters.`;
  }
  return null;
}

/**
 * Strips null bytes from a string. Always call server-side before storing.
 */
export function stripNullBytes(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u0000/g, '');
}

// ── URL slug ───────────────────────────────────────────────────────────────

/**
 * Normalises a booking-slug candidate: lowercase + strip invalid chars.
 * Use in onChange to keep the input clean as the user types.
 */
export function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Validates a URL slug (booking page path segment).
 * Rules:
 *  - 3–40 lowercase alphanumeric + hyphens
 *  - No leading or trailing hyphens
 *  - No consecutive hyphens
 *  - Not a reserved word
 */
export function validateSlug(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 'URL slug is required.';
  if (trimmed.length < MIN_SLUG_LENGTH) {
    return `Slug must be at least ${MIN_SLUG_LENGTH} characters — e.g. "johnsplumbing".`;
  }
  if (trimmed.length > MAX_SLUG_LENGTH) {
    return `Slug cannot exceed ${MAX_SLUG_LENGTH} characters.`;
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmed) && !/^[a-z0-9]$/.test(trimmed)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens — e.g. "johns-plumbing".';
  }
  if (/--/.test(trimmed)) {
    return 'Slug cannot contain consecutive hyphens.';
  }
  if (SLUG_RESERVED_WORDS.has(trimmed)) {
    return `"${trimmed}" is reserved and cannot be used as a slug. Try adding your name or city — e.g. "${trimmed}-dallas".`;
  }
  return null;
}

// ── Dates ──────────────────────────────────────────────────────────────────

/**
 * Validates a scheduled job date.
 * - Past dates are allowed (back-logging completed work)
 * - Max 5 years in the future
 */
export function validateJobDate(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Enter a valid date.';
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + JOB_DATE_MAX_YEARS_FUTURE);
  if (d > maxFuture) {
    return `Scheduled date cannot be more than ${JOB_DATE_MAX_YEARS_FUTURE} years in the future.`;
  }
  return null;
}

/**
 * Validates a booking request preferred date.
 * - Cannot be in the past (bookings are for future appointments)
 */
export function validateBookingDate(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Enter a valid date.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) {
    return 'Preferred date cannot be in the past — pick today or a future date.';
  }
  return null;
}

/**
 * Validates an invoice due date.
 * - Cannot be before invoiceCreatedAt
 * - Maximum 1 year out from invoiceCreatedAt
 */
export function validateInvoiceDueDate(
  value: string,
  invoiceCreatedAt: Date = new Date(),
): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Enter a valid due date.';
  const created = new Date(invoiceCreatedAt);
  created.setHours(0, 0, 0, 0);
  if (d < created) {
    return 'Due date cannot be before the invoice creation date.';
  }
  const maxOut = new Date(invoiceCreatedAt);
  maxOut.setFullYear(maxOut.getFullYear() + 1);
  if (d > maxOut) {
    return 'Due date cannot be more than 1 year from the invoice date.';
  }
  return null;
}

// ── Composite helpers ──────────────────────────────────────────────────────

/**
 * Collect all field errors into a map. Returns null if all clean.
 * Usage:
 *   const errs = collectErrors({ phone: validatePhone(phone), email: validateEmail(email) });
 *   if (errs) { setErrors(errs); return; }
 */
export function collectErrors(
  checks: Record<string, string | null>,
): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const [key, msg] of Object.entries(checks)) {
    if (msg) result[key] = msg;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Builds a structured API validation error payload.
 * { error: 'validation', field: string, code: string, message: string }
 */
export function validationError(
  field: string,
  message: string,
  code = 'invalid',
): { error: 'validation'; field: string; code: string; message: string } {
  return { error: 'validation', field, code, message };
}
