import { BaseDomain } from './base.domain';

export enum OtpPurpose {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
}

export class Otp extends BaseDomain {
  codeToken: string;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  verified: boolean;
  consumedAt?: Date | null;
  expiresAt: Date;
}

export const OTP_TTL_MINUTES = 10;

export const OTP_MAX_ATTEMPTS = 5;
