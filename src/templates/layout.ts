const SITE_URL = 'https://devverify.pl.gov.ng';
const LOGO_URL =
  'https://res.cloudinary.com/dvikxcdh3/image/upload/v1716814797/pictda_asm3qg.png';

export type EmailDetail = {
  label: string;
  value: string;
};

export type EmailContent = {
  preheader?: string;
  eyebrow?: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  details?: EmailDetail[];
  button?: { label: string; href: string };
  note?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatMailDate(value?: Date | string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

export function portalUrl(path = ''): string {
  if (!path) return `${SITE_URL}/`;
  return `${SITE_URL}/${path.replace(/^\//, '')}`;
}

export function renderEmail(content: EmailContent): string {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3d4a45;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border:1px solid #e6eeea;border-radius:12px;overflow:hidden;">
        ${content.details
          .map(
            (row, index) => `<tr>
              <td style="padding:12px 16px;background:${index % 2 ? '#f7fbf9' : '#ffffff'};border-top:${index ? '1px solid #e6eeea' : '0'};width:38%;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;color:#6b7c74;font-weight:700;">${escapeHtml(row.label)}</td>
              <td style="padding:12px 16px;background:${index % 2 ? '#f7fbf9' : '#ffffff'};border-top:${index ? '1px solid #e6eeea' : '0'};font-size:15px;color:#163028;font-weight:600;">${escapeHtml(row.value)}</td>
            </tr>`,
          )
          .join('')}
      </table>`
    : '';

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
        <tr>
          <td style="border-radius:10px;background:#008751;">
            <a href="${escapeHtml(content.button.href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(content.button.label)}</a>
          </td>
        </tr>
      </table>`
    : '';

  const note = content.note
    ? `<p style="margin:0;font-size:13px;line-height:1.55;color:#6b7c74;">${escapeHtml(content.note)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(content.preheader || content.title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3ebe7;">
          <tr>
            <td style="background:#008751;padding:22px 28px;">
              <img src="${LOGO_URL}" alt="PICTDA" width="92" style="display:block;height:auto;border:0;" />
              <p style="margin:14px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#d7f5e6;font-weight:700;">Plateau Verification Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              ${content.eyebrow ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#008751;font-weight:700;">${escapeHtml(content.eyebrow)}</p>` : ''}
              <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#10241c;">${escapeHtml(content.title)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#163028;">${escapeHtml(content.greeting)}</p>
              ${paragraphs}
              ${details}
              ${button}
              ${note}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #e6eeea;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6b7c74;">Plateau Information and Communication Technology Development Agency</p>
              <a href="${SITE_URL}/" style="font-size:12px;color:#008751;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
