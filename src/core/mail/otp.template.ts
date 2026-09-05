import { OtpPurpose } from '../domain/entities/otp';
import type { Email } from '../interfaces/services/mail.service';
import { codePanel, escapeHtml, heading, layout, paragraph } from './layout';

export interface SendOtpCodeInput {
  to: string;
  code: string;
  purpose: OtpPurpose;
  expiresInMinutes: number;
  /**
   * A resend says so in the copy. Same code panel, different reassurance:
   * someone who taps "resend" is usually worried the first mail went missing,
   * and the useful thing to tell them is that both codes work.
   */
  resend?: boolean;
}

interface OtpCopy {
  /** Takes the code so the subject can lead with it: it is read in a list. */
  subject: (code: string) => string;
  preheader: (expiresInMinutes: number) => string;
  title: string;
  lead: string;
  footnote: (expiresInMinutes: number) => string;
}

/**
 * Copy per purpose, and per first-send vs resend where the two differ.
 *
 * Keyed by purpose first because that is what the OTP record carries. The
 * resend variant sits underneath it and is optional: a purpose without one
 * falls back to its first-send copy.
 */
const COPY: Record<OtpPurpose, { first: OtpCopy; resend?: OtpCopy }> = {
  [OtpPurpose.EMAIL_VERIFICATION]: {
    // D01
    first: {
      subject: (code) => `${code} is your SinoPart verification code`,
      preheader: (mins) =>
        `Enter it to finish signing up. It expires in ${mins} minutes.`,
      title: 'Confirm your email',
      lead: 'Enter this code to finish setting up your account.',
      footnote: (mins) =>
        `It expires in ${mins} minutes. If you did not sign up for SinoPart, ignore this email.`,
    },
    // D02
    resend: {
      subject: (code) => `${code} is your SinoPart verification code`,
      preheader: (mins) => `Here it is again. It expires in ${mins} minutes.`,
      title: 'Here is your code again',
      lead: 'Enter this code to finish setting up your account.',
      footnote: (mins) =>
        `It expires in ${mins} minutes. If the first email arrives later, both codes are the same.`,
    },
  },

  [OtpPurpose.PASSWORD_RESET]: {
    // D04
    first: {
      subject: (code) => `${code} is your SinoPart password reset code`,
      preheader: (mins) =>
        `It expires in ${mins} minutes. Ignore this if you did not ask.`,
      title: 'Reset your password',
      lead: 'Use this code to set a new password.',
      footnote: (mins) =>
        `It expires in ${mins} minutes and works once. If you did not ask to reset your password, ignore this email and your password stays as it is.`,
    },
  },

  // Phone verification is delivered by SMS, not email, so this entry only
  // satisfies the exhaustive Record type; it is never actually rendered.
  [OtpPurpose.PHONE_VERIFICATION]: {
    first: {
      subject: (code) => `${code} is your SinoPart verification code`,
      preheader: (mins) => `It expires in ${mins} minutes.`,
      title: 'Verify your phone',
      lead: 'Enter this code to confirm your phone number.',
      footnote: (mins) => `It expires in ${mins} minutes.`,
    },
  },
};

export function otpTemplate(input: SendOtpCodeInput): Email {
  const { to, code, purpose, expiresInMinutes, resend } = input;

  const variants = COPY[purpose];
  const copy = (resend && variants.resend) || variants.first;

  const body = `
      ${heading(copy.title)}
      ${paragraph(escapeHtml(copy.lead))}
      ${codePanel(code)}
      ${paragraph(escapeHtml(copy.footnote(expiresInMinutes)), 0)}
  `;

  // The code is in the subject, so the preheader is free to say what to do
  // with it rather than repeating it.
  const subject = copy.subject(code);

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: copy.preheader(expiresInMinutes),
      body,
    }),
    tag: 'otp',
  };
}
