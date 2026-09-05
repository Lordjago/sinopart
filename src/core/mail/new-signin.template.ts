/**
 * D06 "New sign-in"
 * ---------------------------------------------------------------------------
 * The same shape as the password-changed notice, and there for the same
 * reason: the person who signed in already knows. This exists for the reader
 * who did not, so the details come first and the escape hatch is a button.
 */
import type { Email } from '../interfaces/services/mail.service';
import {
  LINK,
  button,
  detailPanel,
  heading,
  layout,
  paragraph,
} from './layout';
import { formatWat } from './format';

export interface NewSignInInput {
  to: string;
  /** e.g. "Chrome on Windows". */
  device?: string | null;
  /** Omitted entirely when we cannot resolve one: there is no GeoIP lookup. */
  location?: string | null;
  at?: Date;
}

export function newSignInTemplate(input: NewSignInInput): Email {
  const { to, device, location, at = new Date() } = input;

  const body = `
      ${heading('A new device signed in')}
      ${detailPanel([
        ['Device', device],
        ['Location', location],
        ['Time', formatWat(at)],
      ])}
      ${paragraph('If that was you, nothing to do.')}
      ${paragraph('If it was not, change your password now.')}
      ${button('Secure my account', LINK.accountSecurity)}
  `;

  const subject = 'New sign-in to your SinoPart account';

  /* The preview line carries the details, so someone can rule it out from the
     inbox without opening anything. */
  const preheader = [device, location].filter(Boolean).join(' in ');

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: preheader ? `${preheader}. Was this you?` : 'Was this you?',
      body,
    }),
    tag: 'new-signin',
  };
}
