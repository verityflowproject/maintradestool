export const AVATAR_COLORS = [
  '#4A9EFF',
  '#A78BFA',
  '#FBBF24',
  '#34D399',
  '#FB923C',
  '#F87171',
];

export function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(c: {
  firstName?: string;
  lastName?: string;
  businessName?: string;
}): string {
  const f = c.firstName?.[0]?.toUpperCase() ?? '';
  const l = c.lastName?.[0]?.toUpperCase() ?? '';
  if (f) return f + (l || '');
  if (c.businessName) return c.businessName.slice(0, 2).toUpperCase();
  return '?';
}
