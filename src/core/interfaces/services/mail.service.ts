import type { OtpPurpose } from '../../domain/entities/otp';

export interface SendOtpCodeInput {
  to: string;
  code: string;
  purpose: OtpPurpose;
  expiresInMinutes: number;
}

export interface WaitListWelcomeInput {
  email: string;
  name?: string;
}

export interface WaitListAlertInput {
  email: string;
  name?: string;
  dealership?: string;
  whatsAppNumber?: string;
  city?: string;
  joinedAt?: Date;
}

export interface QuoteAlertInput {
  name: string;
  year: number;
  budget: number;
  whatsAppNumber: string;
  submittedAt?: Date;
}

export interface MailService {
  sendOtpCode(input: SendOtpCodeInput): Promise<void>;

  sendWaitListWelcome(input: WaitListWelcomeInput): Promise<void>;

  sendWaitListAdminAlert(input: WaitListAlertInput): Promise<void>;

  sendQuoteAdminAlert(input: QuoteAlertInput): Promise<void>;
}
