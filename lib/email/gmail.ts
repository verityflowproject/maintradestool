/**
 * Transactional email transport — Gmail / Google Workspace via Nodemailer.
 *
 * Required environment variables:
 *   GMAIL_USER         — the Google / Workspace account that sends mail
 *                        e.g. "noreply@verityflow.io" (Google Workspace)
 *                        or   "yourname@gmail.com"   (personal Gmail)
 *   GMAIL_APP_PASSWORD — App Password from Google Account → Security →
 *                        "App passwords" (2-Step Verification must be on).
 *                        This is NOT your regular login password.
 *
 * Optional:
 *   MAIL_FROM          — friendly From: header, defaults to
 *                        "VerityFlow <{GMAIL_USER}>"
 *                        For Google Workspace keep this aligned with GMAIL_USER
 *                        (same domain) so SPF / DKIM / DMARC pass.
 *
 * Note: Resend (lib/email/gmail.ts re-export) is kept only for invoice routes
 * (app/api/invoices/.../send/email and .../remind). Do NOT remove that package.
 */

import nodemailer from 'nodemailer';

export const FROM_ADDRESS =
  process.env.MAIL_FROM ??
  `VerityFlow <${process.env.GMAIL_USER ?? 'noreply@verityflow.io'}>`;

export const APP_URL =
  process.env.NEXTAUTH_URL ?? 'https://verityflow.io';

function createTransport(): nodemailer.Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      '[email] Missing credentials: set GMAIL_USER and GMAIL_APP_PASSWORD ' +
      'in your environment variables. ' +
      'Use a Google App Password (Account → Security → App passwords), ' +
      'NOT your regular login password.',
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export async function sendMail({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = createTransport(); // throws if credentials are missing
  await transport.sendMail({ from, to, subject, html });
}
