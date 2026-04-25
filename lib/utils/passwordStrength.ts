export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export function computePasswordScore(password: string): number {
  let s = 0;
  if (password.length >= 6) s++;
  if (password.length >= 10) s++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(s, 4);
}
