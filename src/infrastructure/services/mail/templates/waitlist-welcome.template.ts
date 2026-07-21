/**
 * Waitlist confirmation — the auto-reply sent TO the dealer who signed up.
 *
 * This is the approved design, so it ships as a standalone document rather than
 * going through `layout()`: it has its own cream/gold shell that the shared
 * wrapper would fight.
 *
 * Subject and tone are deliberately plain — no emoji, no exclamation marks, no
 * "free"/"exclusive"/"early access". Those are the words that push a
 * transactional email into Promotions or spam.
 */
import type { WaitListWelcomeInput } from '../../../../core/interfaces/services/mail.service';
import { escapeHtml, type RenderedEmail } from './layout';

const SUBJECT = "You're on the SinoPart waitlist";

export function waitListWelcomeTemplate(
  input: WaitListWelcomeInput,
): RenderedEmail {
  // The design ships unpersonalised so it works for the email-only popup too.
  // We only add a name when the signup actually captured one — "Welcome in."
  // reads fine on its own, "Welcome in, ." does not.
  const name = input.name?.trim();
  const welcome = name ? `Welcome in, ${escapeHtml(name)}.` : 'Welcome in.';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>You're on the SinoPart list</title>
</head>
<body style="margin:0;padding:0;background:#FBF8F3;">
<!-- preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBF8F3;font-size:1px;line-height:1px;">
  You're on the SinoPart waitlist. We'll reach out on WhatsApp before we launch.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;">
  <tr>
    <td align="center" style="padding:28px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid #E7DECF;border-radius:16px;overflow:hidden;">

        <!-- header -->
        <tr>
          <td style="background:#1A1714;padding:22px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;">
                  <div style="width:34px;height:34px;border-radius:9px;background:#C2912E;text-align:center;font-family:'Archivo',Arial,sans-serif;font-weight:800;color:#1a1206;font-size:18px;line-height:34px;">S</div>
                </td>
                <td style="font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:20px;color:#FFFFFF;letter-spacing:-.01em;">SinoPart</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:36px 32px 8px;">
            <div style="display:inline-block;font-family:'IBM Plex Mono',Consolas,monospace;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#1E7A46;background:rgba(30,122,70,.1);border-radius:999px;padding:6px 12px;">You're on the list</div>
            <h1 style="margin:18px 0 0;font-family:'Archivo',Arial,sans-serif;font-weight:800;font-size:28px;line-height:1.15;color:#1A1714;letter-spacing:-.02em;">
              ${welcome}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#5A5249;">
            <p style="margin:0 0 16px;">Thanks for joining the SinoPart dealer waitlist. Your spot is saved.</p>
            <p style="margin:0 0 16px;">We're letting dealers in a wave at a time, and you're in line. When your wave opens, we'll reach out on the WhatsApp number you gave us so you can start browsing verified stock from China.</p>
          </td>
        </tr>

        <!-- what you get -->
        <tr>
          <td style="padding:12px 32px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;border:1px solid #E7DECF;border-radius:12px;">
              <tr>
                <td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.6;color:#1A1714;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr><td style="padding:5px 0;color:#1E7A46;font-weight:700;width:22px;vertical-align:top;">&#10003;</td><td style="padding:5px 0;">Source prices, straight from vetted suppliers in China</td></tr>
                    <tr><td style="padding:5px 0;color:#1E7A46;font-weight:700;vertical-align:top;">&#10003;</td><td style="padding:5px 0;">Every car inspected in person before you pay</td></tr>
                    <tr><td style="padding:5px 0;color:#1E7A46;font-weight:700;vertical-align:top;">&#10003;</td><td style="padding:5px 0;">Your money held in escrow until the VIN is verified at loading</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#5A5249;">
            <p style="margin:0 0 6px;">Nothing to do for now. We'll be in touch soon.</p>
            <p style="margin:0;">&mdash; The SinoPart team</p>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:28px 32px 30px;">
            <div style="border-top:1px solid #E7DECF;padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8B8278;">
              SinoPart connects Nigerian dealers to vetted suppliers across China. Verified used cars, inspected in person, paid through escrow.
              <br><br>
              You're receiving this because you joined the SinoPart waitlist. Not you? You can ignore this email and we won't message you again.
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: SUBJECT, html };
}
