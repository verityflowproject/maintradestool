import User from '@/lib/models/User';

function randomDigits(n: number): string {
  return Math.floor(Math.random() * Math.pow(10, n))
    .toString()
    .padStart(n, '0');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-(llc|inc|co|ltd|corp|lp)$/, '');
}

export async function generateBookingSlug(businessName: string): Promise<string> {
  const base = slugify(businessName) || 'tradesperson';

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomDigits(4)}`;
    const exists = await User.exists({ bookingSlug: candidate });
    if (!exists) return candidate;
  }

  // Fallback: base + timestamp suffix
  return `${base}-${Date.now().toString().slice(-6)}`;
}
