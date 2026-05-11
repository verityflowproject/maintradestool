export function isTeamSize(teamSize: string | null | undefined): boolean {
  return !!teamSize && teamSize !== 'solo';
}
