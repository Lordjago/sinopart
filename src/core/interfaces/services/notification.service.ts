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
