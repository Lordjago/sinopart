/**
 * Quote request notification — sent TO the admin inbox when a dealer uses the
 * "Request a quote" section of the landing page.
 *
 * This is the approved design, so it ships as a standalone document rather than
 * going through `layout()` — it has its own red header and detail table.
 *
 * The quote form collects no email address, so the reply path is WhatsApp; the
 * green button is the whole point of the email.
 */
import type { QuoteAlertInput } from '../../../../core/interfaces/services/mail.service';
import { escapeHtml, formatNaira, type RenderedEmail } from './layout';

/** The design shows an em dash where a value is missing. */
const EMPTY = '&mdash;';

export function quoteAdminTemplate(input: QuoteAlertInput): RenderedEmail {
  const { name, year, budget, whatsAppNumber } = input;

  // `name` is the quote form's car field — the design headlines it as
  // "Car requested".
  const car = name?.trim() ? escapeHtml(name.trim()) : EMPTY;
  const yearText = year ? escapeHtml(String(year)) : EMPTY;
  const budgetText =
    typeof budget === 'number' ? escapeHtml(formatNaira(budget)) : EMPTY;
  const whatsapp = whatsAppNumber?.trim()
    ? escapeHtml(whatsAppNumber.trim())
    : EMPTY;

  // wa.me rejects +, spaces and dashes — digits with country code only.
  const waDigits = (whatsAppNumber ?? '').replace(/\D/g, '');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>New quote request</title>
</head>
<body style="margin:0;padding:0;background:#FBF8F3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBF8F3;font-size:1px;line-height:1px;">
  A dealer wants a quote on a ${car}. Reply on WhatsApp.
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
                  New quote request
                </td>
                <td align="right" style="font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;color:#F6C9CF;letter-spacing:.06em;text-transform:uppercase;">
                  SinoPart
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- the car (headline) -->
        <tr>
          <td style="padding:28px 32px 4px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8B8278;">Car requested</div>
            <div style="font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.2;color:#1A1714;letter-spacing:-.02em;margin-top:6px;">${car}</div>
          </td>
        </tr>

        <!-- details table -->
        <tr>
          <td style="padding:20px 32px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E7DECF;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
              <tr>
                <td width="150" style="padding:14px 18px;background:#FBF8F3;border-bottom:1px solid #E7DECF;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8B8278;">Year</td>
                <td style="padding:14px 18px;border-bottom:1px solid #E7DECF;font-size:15px;color:#1A1714;">${yearText}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;background:#FBF8F3;border-bottom:1px solid #E7DECF;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8B8278;">Budget</td>
                <td style="padding:14px 18px;border-bottom:1px solid #E7DECF;font-size:15px;color:#1A1714;font-weight:600;">${budgetText}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;background:#FBF8F3;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8B8278;">WhatsApp</td>
                <td style="padding:14px 18px;font-size:15px;color:#1A1714;font-family:'IBM Plex Mono',Consolas,monospace;">${whatsapp}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- WhatsApp CTA -->
        <tr>
          <td style="padding:22px 32px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#1faa55;">
                  <a href="https://wa.me/${escapeHtml(waDigits)}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Reply about this car on WhatsApp &rarr;</a>
                </td>
              </tr>
            </table>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B8278;line-height:1.5;padding-top:12px;">
              This dealer left a WhatsApp number, not an email &mdash; send their quote there. If the button doesn't open, copy the number into wa.me (digits only, with country code, e.g. 234...).
            </div>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:24px 32px 30px;">
            <div style="border-top:1px solid #E7DECF;padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8B8278;">
              Sent automatically from the SinoPart landing page &mdash; "Request a quote" section.
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
    // Design's suggested subject: Quote request: {{car}} ({{year}}) — budget {{budget}}
    subject: `Quote request: ${name} (${year}) — budget ${formatNaira(budget)}`,
    html,
  };
}
