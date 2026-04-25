/**
 * Synchronous email-based admin check.
 * Set ADMIN_EMAILS to a comma-separated list of admin email addresses.
 * Returns false if the env var is not set or the email is not in the list.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? '';
  if (!raw.trim()) return false;
  const allowed = raw.split(',').map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}
