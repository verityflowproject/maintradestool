import nodemailer from 'nodemailer';

export const FROM_ADDRESS =
  process.env.MAIL_FROM ?? `VerityFlow <${process.env.GMAIL_USER ?? 'noreply@verityflow.io'}>`;

export const APP_URL =
  process.env.NEXTAUTH_URL ?? 'https://verityflow.io';

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[gmail] GMAIL_USER or GMAIL_APP_PASSWORD not set — emails will not be sent.');
    return null;
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
  const transport = createTransport();
  if (!transport) return;
  await transport.sendMail({ from, to, subject, html });
}
