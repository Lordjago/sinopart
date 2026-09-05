/**
 * D05 "Your password was changed"
 * ---------------------------------------------------------------------------
 * A security notice, not a confirmation. The person who changed the password
 * already knows they did; this email exists for the case where they did not,
 * so the whole thing is built around making that second reading act fast.
 * That is why it always sends, and why it cannot be turned off in preferences.
 */
import type { Email } from '../interfaces/services/mail.service';
import { LINK, button, heading, layout, paragraph } from './layout';
import { formatWat } from './format';

export interface PasswordChangedInput {
  to: string;
  /** When the change happened. Defaults to now. */
  changedAt?: Date;
}

export function passwordChangedTemplate(input: PasswordChangedInput): Email {
  const { to, changedAt = new Date() } = input;

  const body = `
      ${heading('Your password was changed')}
      ${paragraph(`The password on your SinoPart account changed on ${formatWat(changedAt)}.`)}
      ${paragraph('If that was you, nothing to do.')}
      ${paragraph('If it was not, someone else has access to your account. Reset it now and tell us.')}
      ${button('Secure my account', LINK.accountSecurity)}
  `;

  const subject = 'Your SinoPart password was changed';

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'If this was not you, secure your account now.',
      body,
    }),
    tag: 'password-changed',
  };
}
