/**
 * NotificationService — outbound port for internal team alerts
 * ---------------------------------------------------------------------------
 * Where MailService talks to customers (welcome, OTP), this port talks to the
 * team: "someone joined the waitlist", "a quote just came in". The adapter
 * (SlackNotificationServiceImpl) posts these to a Slack channel via an incoming
 * webhook, but the core neither knows nor cares that it is Slack.
 *
 * Sends are best-effort: a failed alert must never break the customer action
 * that triggered it, so use cases call these fire-and-forget and the adapter
 * swallows and logs its own errors.
 */
export interface WaitListJoinedNotification {
  email: string;
  name?: string;
  dealership?: string;
  whatsAppNumber?: string;
  city?: string;
  joinedAt?: Date;
}

export interface QuoteRequestedNotification {
  name: string;
  year: number;
  budget: number;
  whatsAppNumber: string;
  submittedAt?: Date;
}

export interface NotificationService {
  notifyWaitListJoined(input: WaitListJoinedNotification): Promise<void>;

  notifyQuoteRequested(input: QuoteRequestedNotification): Promise<void>;
}
