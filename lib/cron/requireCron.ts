export function requireCron(req: Request): boolean {
  const header = req.headers.get('authorization');
  return header === `Bearer ${process.env.CRON_SECRET}`;
}
