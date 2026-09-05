/**
 * D03 "Welcome, email confirmed"
 * ---------------------------------------------------------------------------
 * Sent once, the moment a dealer's email is confirmed. It closes the loop the
 * verification code opened and sets up the next step: browsing is free and
 * open now, but booking an inspection or buying needs dealer (KYC)
 * verification, which is a different thing from the email they just confirmed.
 */
import type { Email } from '../interfaces/services/mail.service';
import { LINK, button, heading, layout, paragraph } from './layout';

export interface WelcomeInput {
  to: string;
  /** The dealer's full name; only the first word is used in the greeting. */
  name?: string | null;
}

/**
 * First name for the greeting.
 *
 * Registration falls back to a name derived from the email address, so this
 * can be anything from "Chidi Okafor" to "chidi.okafor". Take the first word
 * and drop an empty result rather than greeting someone by their whole
 * address.
 */
function firstName(name?: string | null): string {
  return String(name ?? '')
    .trim()
    .split(/\s+/)[0];
}

export function welcomeTemplate(input: WelcomeInput): Email {
  const { to, name } = input;

  const first = firstName(name);
  // Without a usable name the greeting stands on its own rather than trailing
  // a comma into nothing.
  const title = first ? `Welcome to SinoPart, ${first}` : 'Welcome to SinoPart';

  const body = `
      ${heading(title)}
      ${paragraph('Your email is confirmed. You can browse every car on the platform right now, free.')}
      ${paragraph('To book an inspection or buy, we need to verify you as a dealer. It is one sitting: your BVN or NIN, a photo of yourself, proof of address, and your bank details.')}
      ${paragraph('We verify every dealer and every supplier. It is why the cars on here are worth trusting.')}
      ${button('Browse cars', LINK.browse)}
  `;

  const subject = 'You are in. Next, get verified to buy';

  return {
    to,
    subject,
    html: layout({
      title: subject,
      preheader: 'Browse now. Verification takes one sitting.',
      body,
    }),
    tag: 'welcome',
  };
}
