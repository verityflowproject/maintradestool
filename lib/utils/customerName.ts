interface CustomerNameFields {
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

export function deriveFullName(c: CustomerNameFields): string {
  const full = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
  return full || c.businessName || 'Unknown Customer';
}
