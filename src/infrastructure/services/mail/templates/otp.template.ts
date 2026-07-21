import { OtpPurpose } from '../../../../core/domain/entities/otp';
import type { SendOtpCodeInput } from '../../../../core/interfaces/services/mail.service';
import {
  BRAND,
  escapeHtml,
  heading,
  layout,
  paragraph,
  type RenderedEmail,
} from './layout';

const COPY: Record<
  OtpPurpose,
  { subject: string; title: string; lead: string }
> = {
  [OtpPurpose.PASSWORD_RESET]: {
    subject: 'Your SinoPart password reset code',
    title: 'Reset your password',
    lead: 'Use the code below to finish resetting your password.',
  },
  [OtpPurpose.EMAIL_VERIFICATION]: {
    subject: 'Verify your SinoPart email',
    title: 'Verify your email',
    lead: 'Use the code below to confirm this email address.',
  },
};

export function otpTemplate(input: SendOtpCodeInput): RenderedEmail {
  const { code, purpose, expiresInMinutes } = input;
  const copy = COPY[purpose];

  const body = `
    ${heading(copy.title)}
    ${paragraph(escapeHtml(copy.lead))}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="padding:20px;background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:8px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:9px;color:${BRAND.ink};">
            ${escapeHtml(code)}
          </div>
        </td>
      </tr>
    </table>

    ${paragraph(`This code expires in <strong>${escapeHtml(expiresInMinutes)} minutes</strong>.`)}
    ${paragraph(
      `<span style="color:${BRAND.muted};font-size:14px;">If you did not request this, you can safely ignore this email — nothing changes until the code is used.</span>`,
    )}
  `;

  return {
    subject: copy.subject,
    // The code goes in the preheader too, so it is readable from the inbox list
    // without opening the mail.
    html: layout({
      title: copy.subject,
      preheader: `${code} — expires in ${expiresInMinutes} minutes`,
      body,
    }),
  };
}
