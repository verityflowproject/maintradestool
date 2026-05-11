import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export type Role = 'owner' | 'manager' | 'lead' | 'tech' | 'apprentice' | 'office';
export type Action = 'read' | 'write' | 'delete';
export type Resource =
  | 'job'
  | 'customer'
  | 'invoice'
  | 'team'
  | 'billing'
  | 'booking'
  | 'settings_business'
  | 'settings_profile'
  | 'time'
  | 'payroll';

// Permission matrix — source of truth from Chunk 0.
// 'all'  = full access to all records in scope
// 'own'  = only records where the member's linkedTeamMemberId is in assignedMemberIds
// true   = self-scoped (e.g. own profile)
// absent = denied
const MATRIX: Record<Resource, Record<Action, Partial<Record<Role, 'all' | 'own' | true>>>> = {
  job: {
    read:   { owner: 'all', manager: 'all', lead: 'all', tech: 'own', apprentice: 'own', office: 'all' },
    write:  { owner: 'all', manager: 'all', lead: 'own', tech: 'own' },
    delete: { owner: 'all', manager: 'all' },
  },
  customer: {
    read:   { owner: 'all', manager: 'all', lead: 'all', tech: 'all', apprentice: 'all', office: 'all' },
    write:  { owner: 'all', manager: 'all', office: 'all' },
    delete: { owner: 'all', manager: 'all' },
  },
  invoice: {
    read:   { owner: 'all', manager: 'all', lead: 'all', tech: 'all', office: 'all' },
    write:  { owner: 'all', manager: 'all', office: 'all' },
    delete: { owner: 'all', manager: 'all' },
  },
  team: {
    read:   { owner: 'all', manager: 'all', lead: 'all', tech: 'all', office: 'all' },
    write:  { owner: 'all' },
    delete: { owner: 'all' },
  },
  billing: {
    read:   { owner: 'all' },
    write:  { owner: 'all' },
    delete: { owner: 'all' },
  },
  booking: {
    read:   { owner: 'all', manager: 'all' },
    write:  { owner: 'all' },
    delete: { owner: 'all' },
  },
  settings_business: {
    read:   { owner: 'all', manager: 'all' },
    write:  { owner: 'all' },
    delete: { owner: 'all' },
  },
  settings_profile: {
    read:   { owner: true, manager: true, lead: true, tech: true, apprentice: true, office: true },
    write:  { owner: true, manager: true, lead: true, tech: true, apprentice: true, office: true },
    delete: { owner: true },
  },
  time: {
    read:   { owner: 'all', manager: 'all', lead: 'own', tech: 'own', apprentice: 'own' },
    write:  { owner: 'all', manager: 'all', lead: 'own', tech: 'own', apprentice: 'own' },
    delete: { owner: 'all', manager: 'all' },
  },
  payroll: {
    read:   { owner: 'all', manager: 'all' },
    write:  { owner: 'all' },
    delete: { owner: 'all' },
  },
};

export type PermResult =
  | { allowed: true; scope: 'all' | 'own' | 'self' }
  | { allowed: false; reason: string };

export function can(role: Role | null, action: Action, resource: Resource): PermResult {
  if (!role) return { allowed: false, reason: 'No role' };
  const entry = MATRIX[resource]?.[action]?.[role];
  if (!entry) return { allowed: false, reason: `${role} cannot ${action} ${resource}` };
  if (entry === true) return { allowed: true, scope: 'self' };
  return { allowed: true, scope: entry };
}

export function requirePerm(
  session: Session | null,
  action: Action,
  resource: Resource,
):
  | { ok: true; scope: 'all' | 'own' | 'self' }
  | { ok: false; response: NextResponse } {
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.accountType === 'member' && session.user.memberActive === false) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Your team access has been revoked.' },
        { status: 403 },
      ),
    };
  }
  const r = can(session.user.role as Role, action, resource);
  if (!r.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden', reason: r.reason }, { status: 403 }),
    };
  }
  return { ok: true, scope: r.scope };
}
