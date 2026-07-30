export interface SendSmsOtpInput {
  phone: string;
  code: string;
  expiresInMinutes: number;
}

export interface SmsService {
  sendOtpCode(input: SendSmsOtpInput): Promise<void>;
}
