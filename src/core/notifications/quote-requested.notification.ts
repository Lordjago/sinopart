import type { Notification } from '../interfaces/services/notification.service';

export interface QuoteRequestedNotification {
  name: string;
  year: number;
  budget: number;
  whatsAppNumber: string;
  submittedAt?: Date;
}

function formatNaira(amount?: number): string | undefined {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return undefined;
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function quoteRequestedNotification(
  input: QuoteRequestedNotification,
): Notification {
  // The quote form collects no email, so the only reply path is WhatsApp.
  const waDigits = (input.whatsAppNumber ?? '').replace(/\D/g, '');

  return {
    title: '🚗 New quote request',
    fields: [
      { label: 'Car requested', value: input.name },
      { label: 'Year', value: input.year ? String(input.year) : undefined },
      { label: 'Budget', value: formatNaira(input.budget) },
      { label: 'WhatsApp', value: input.whatsAppNumber },
    ],
    action: waDigits
      ? { label: 'Reply on WhatsApp', url: `https://wa.me/${waDigits}` }
      : undefined,
    at: input.submittedAt,
  };
}
