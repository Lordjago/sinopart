/**
 * Waitlist signup notification — sent TO the admin inbox when a dealer joins
 * the waitlist on the landing page.
 *
 * Matches the client-approved standalone design used by quote-admin and
 * waitlist-welcome (cream shell, red admin header, own document rather than the
 * shared `layout()` wrapper) so all the transactional emails read as one
 * product.
 *
 * Unlike the quote form, the waitlist captures a real email address, so the
 * primary reply path is email (the adapter also sets reply_to to it). WhatsApp
 * is offered as a second button only when the dealer left a number.
 */
import type { WaitListAlertInput } from '../../../../core/interfaces/services/mail.service';
import { escapeHtml, formatDateTime, type RenderedEmail } from './layout';

/**
 * One label/value row in the approved detail-table style. Returns '' when the
 * value is missing so optional fields (dealership, city, WhatsApp) drop out
 * instead of rendering an empty row.
 */
function row(label: string, value: string | undefined, opts?: { mono?: boolean }): string {
  const text = value?.trim();
  if (!text) return '';
  const valueFont = opts?.mono
    ? "font-family:'IBM Plex Mono',Consolas,monospace;"
    : '';
  return `
    <tr>
      <td width="150" style="padding:14px 18px;background:#FBF8F3;border-bottom:1px solid #E7DECF;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8B8278;">${escapeHtml(label)}</td>
      <td style="padding:14px 18px;border-bottom:1px solid #E7DECF;font-size:15px;color:#1A1714;${valueFont}">${escapeHtml(text)}</td>
    </tr>`;
}

export function waitListAdminTemplate(input: WaitListAlertInput): RenderedEmail {
  const { email, name, dealership, whatsAppNumber, city, joinedAt } = input;

  // The design headlines who signed up. Prefer the name, fall back to the
  // email, which is the one field the waitlist always captures.
  const displayName = name?.trim() || email;
  const heading = escapeHtml(displayName);

  // wa.me rejects +, spaces and dashes — digits with country code only.
  const waDigits = (whatsAppNumber ?? '').replace(/\D/g, '');
  const emailHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('SinoPart — you joined the waitlist')}`;

  const rows = [
    row('Email', email),
    row('Dealership', dealership),
    row('WhatsApp', whatsAppNumber, { mono: true }),
    row('City', city),
    row('Joined', formatDateTime(joinedAt)),
  ]
    .filter(Boolean)
    .join('');

  // The last rendered row still carries a bottom border; the table's own
  // rounded border sits under it, which matches the approved quote-admin look.

  const whatsAppButton = waDigits
    ? `
              <tr>
                <td style="padding-top:10px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-radius:8px;background:#1faa55;">
                        <a href="https://wa.me/${escapeHtml(waDigits)}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Message on WhatsApp &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>New waitlist signup</title>
</head>
<body style="margin:0;padding:0;background:#FBF8F3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBF8F3;font-size:1px;line-height:1px;">
  ${escapeHtml(displayName)} joined the SinoPart dealer waitlist.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;">
  <tr>
    <td align="center" style="padding:28px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #E7DECF;border-radius:16px;overflow:hidden;">

        <!-- header -->
        <tr>
          <td style="background:#C8102E;padding:20px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:16px;color:#FFFFFF;letter-spacing:-.01em;">
                  New waitlist signup
                </td>
                <td align="right" style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;color:#F6C9CF;letter-spacing:.06em;text-transform:uppercase;">
                  SinoPart
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- who joined (headline) -->
        <tr>
          <td style="padding:28px 32px 4px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8B8278;">Joined the waitlist</div>
            <div style="font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.2;color:#1A1714;letter-spacing:-.02em;margin-top:6px;">${heading}</div>
          </td>
        </tr>

        <!-- details table -->
        <tr>
          <td style="padding:20px 32px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7DECF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- reply CTAs -->
        <tr>
          <td style="padding:22px 32px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#1A1714;">
                  <a href="${escapeHtml(emailHref)}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Reply by email &rarr;</a>
                </td>
              </tr>${whatsAppButton}
            </table>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B8278;line-height:1.5;padding-top:12px;">
              Hitting Reply on this message also goes straight to ${escapeHtml(email)}.
            </div>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:24px 32px 30px;">
            <div style="border-top:1px solid #E7DECF;padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8B8278;">
              Sent automatically from the SinoPart landing page &mdash; dealer waitlist.
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;

  return {
    // The email in the subject keeps the admin inbox searchable by customer.
    subject: `New waitlist signup — ${email}`,
    html,
  };
}
