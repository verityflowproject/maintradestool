import Customer from '@/lib/models/Customer';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface FindOrCreateResult {
  customerId: string;
  created: boolean;
}

/**
 * Finds an existing customer for the given user by phone (primary) or name
 * (fallback), or creates a new one when no match is found.
 *
 * Returns null when there is not enough identifying information (no name and
 * no phone after trimming).
 */
export async function findOrCreateCustomer(
  userId: string,
  input: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerEmail?: string;
  },
): Promise<FindOrCreateResult | null> {
  const name = input.customerName?.trim() ?? '';
  const phone = input.customerPhone?.trim() ?? '';
  const address = input.customerAddress?.trim() ?? '';
  const email = input.customerEmail?.trim().toLowerCase() ?? '';

  if (!name && !phone) return null;

  // ── 1. Phone match ──────────────────────────────────────────────────
  if (phone) {
    const digits = normalizePhone(phone);
    if (digits.length >= 7) {
      const candidates = await Customer.find({ userId, phone: { $ne: '' } })
        .select('_id phone')
        .lean<{ _id: unknown; phone: string }[]>();

      const match = candidates.find(
        (c) => normalizePhone(c.phone) === digits,
      );
      if (match) {
        return { customerId: String(match._id), created: false };
      }
    }
  }

  // ── 2. Name match ───────────────────────────────────────────────────
  if (name) {
    const [first, ...rest] = name.split(' ');
    const lastName = rest.join(' ');
    const firstEsc = escapeRegex(first);
    const lastEsc = escapeRegex(lastName);
    const fullEsc = escapeRegex(name);

    const orClauses: object[] = [
      { businessName: { $regex: `^${fullEsc}$`, $options: 'i' } },
    ];

    if (lastName) {
      orClauses.push({
        firstName: { $regex: `^${firstEsc}$`, $options: 'i' },
        lastName: { $regex: `^${lastEsc}$`, $options: 'i' },
      });
    } else {
      orClauses.push({
        firstName: { $regex: `^${firstEsc}$`, $options: 'i' },
      });
    }

    const match = await Customer.findOne({
      userId,
      $or: orClauses,
    })
      .select('_id')
      .lean<{ _id: unknown } | null>();

    if (match) {
      return { customerId: String(match._id), created: false };
    }
  }

  // ── 3. Create new customer ──────────────────────────────────────────
  const [first, ...rest] = name.split(' ');
  const doc = await Customer.create({
    userId,
    firstName: first ?? '',
    lastName: rest.join(' '),
    businessName: '',
    phone,
    email,
    address,
  });

  return { customerId: String(doc._id), created: true };
}
