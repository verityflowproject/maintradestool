interface TemplateArgs {
  preheader: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
  preferenceLabel?: string;
}

export function renderTemplate({
  preheader,
  heading,
  body,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
  preferenceLabel,
}: TemplateArgs): string {
  const cta =
    ctaText && ctaUrl
      ? `<div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}" style="background:#1E90FF;color:#050912;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;display:inline-block;">
            ${ctaText}
          </a>
        </div>`
      : '';

  const unsub = preferenceLabel
    ? `<a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe from ${preferenceLabel} emails</a>`
    : `<a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Manage email preferences</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#050912;font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050912;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 0 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:1px;color:#1E90FF;">
                    VerityFlow
                  </td>
                </tr>
                <tr>
                  <td style="height:3px;background:#1E90FF;border-radius:2px;"></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:32px 36px;margin-top:0;">
              <h1 style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#050912;margin:0 0 20px;">${heading}</h1>
              <div style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.6;">
                ${body}
              </div>
              ${cta}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#666;">
              <p style="margin:0 0 8px;">VerityFlow — Voice in. Invoice out. AI-powered job memory and instant invoices for tradespeople.</p>
              <p style="margin:0;">
                ${unsub} &nbsp;·&nbsp;
                <a href="${unsubscribeUrl.split('/unsubscribe')[0]}/settings/notifications" style="color:#888;text-decoration:underline;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
