export type TeamMemberRole = 'owner' | 'manager' | 'lead' | 'tech' | 'apprentice' | 'office';

export const TEAM_MEMBER_ROLES: { id: TeamMemberRole; label: string; sub: string }[] = [
  { id: 'owner', label: 'Owner', sub: "Full access — that's you" },
  { id: 'manager', label: 'Manager', sub: 'Assigns jobs, sees all data' },
  { id: 'lead', label: 'Lead Tech', sub: 'Runs crews, edits own jobs' },
  { id: 'tech', label: 'Technician', sub: 'Works assigned jobs' },
  { id: 'apprentice', label: 'Apprentice', sub: 'View-only on assigned jobs' },
  { id: 'office', label: 'Office / Admin', sub: 'Invoices and customers, no field work' },
];
