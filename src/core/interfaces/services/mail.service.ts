export interface Email {
  to: string;
  subject: string;
  html: string;
  tag: string;
  replyTo?: string;
}

export interface MailService {
  send(email: Email): Promise<void>;
}
