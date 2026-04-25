import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY!);
export const FROM_ADDRESS =
  process.env.MAIL_FROM ?? 'VerityFlow <noreply@verityflow.com>';
export const APP_URL =
  process.env.NEXTAUTH_URL ?? 'https://verityflow.com';
