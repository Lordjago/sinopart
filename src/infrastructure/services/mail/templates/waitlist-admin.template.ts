import type { WaitListAlertInput } from '../../../../core/interfaces/services/mail.service';
import {
  detailRows,
  formatDateTime,
  heading,
  layout,
  paragraph,
  type RenderedEmail,
} from './layout';

export function waitListAdminTemplate(
  input: WaitListAlertInput,
): RenderedEmail {
  const { email, name, dealership, whatsAppNumber, city, joinedAt } = input;

  // detailRows escapes every value and drops the ones that were not supplied,
  // so optional fields simply do not render.
  const body = `
    ${heading('New waitlist signup')}
    ${paragraph('Someone just joined the waitlist. Here is everything they submitted:')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      ${detailRows([
        ['Email', email],
        ['Name', name],
        ['Dealership', dealership],
        ['WhatsApp', whatsAppNumber],
        ['City', city],
        ['Joined', formatDateTime(joinedAt)],
      ])}
    </table>
  `;

  return {
    // The email in the subject makes the admin inbox searchable by customer.
    subject: `New waitlist signup — ${email}`,
    html: layout({
      title: 'New waitlist signup',
      preheader: `${name?.trim() || email} joined the waitlist`,
      body,
    }),
  };
}
