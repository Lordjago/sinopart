import type { Notification } from '../interfaces/services/notification.service';

export interface WaitListJoinedNotification {
  email: string;
  name?: string;
  dealership?: string;
  whatsAppNumber?: string;
  city?: string;
  joinedAt?: Date;
}

export function waitListJoinedNotification(
  input: WaitListJoinedNotification,
): Notification {
  return {
    title: '🎉 New waitlist signup',
    fields: [
      { label: 'Name', value: input.name },
      { label: 'Email', value: input.email },
      { label: 'Dealership', value: input.dealership },
      { label: 'City', value: input.city },
      { label: 'WhatsApp', value: input.whatsAppNumber },
    ],
    at: input.joinedAt,
  };
}
