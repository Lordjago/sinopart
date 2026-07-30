import { BaseDomain } from './base.domain';

export enum OtpPurpose {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
}

export class Otp extends BaseDomain {
  codeToken: string;
  /**
   * Where the code was sent — an email for email flows, a phone number for the
   * supplier phone-OTP flow. Generic so one OTP machine serves every channel.
   */
  channelAddress: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  verified: boolean;
  /**
   * For invitation-gated supplier sign-up: the invite code that authorised this
   * send, carried here so the verify step can consume it once the phone is
   * proven. Null for every other flow.
   */
  inviteCode?: string | null;
  consumedAt?: Date | null;
  expiresAt: Date;
}

export const OTP_TTL_MINUTES = 10;

export const OTP_MAX_ATTEMPTS = 5;
