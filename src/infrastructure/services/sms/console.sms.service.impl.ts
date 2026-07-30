/**
 * ConsoleSmsServiceImpl — a development ADAPTER for the SmsService port
 * ---------------------------------------------------------------------------
 * Instead of sending a real text, it prints the code to the server console, so
 * the whole supplier phone-OTP flow is testable with zero SMS setup: request a
 * code, read it from the terminal.
 *
 * This is the SMS twin of the old ConsoleMailService. To go live, write an
 * Aliyun/Tencent/Twilio adapter against the same SmsService interface and change
 * ONE line in service.module.ts — no use case changes.
 */
import { Injectable, Logger } from '@nestjs/common';
import type {
  SendSmsOtpInput,
  SmsService,
} from '../../../core/interfaces/services/sms.service';

@Injectable()
export class ConsoleSmsServiceImpl implements SmsService {
  private readonly logger = new Logger('SmsService');

  async sendOtpCode(input: SendSmsOtpInput): Promise<void> {
    const { phone, code, expiresInMinutes } = input;
    this.logger.log(
      [
        '',
        '  ┌───────────────────────────────────────────────┐',
        '  │  📱  SMS OTP (development — not really sent)   │',
        '  ├───────────────────────────────────────────────┤',
        `  │  To      : ${phone}`,
        `  │  Code    : ${code}`,
        `  │  Expires : in ${expiresInMinutes} minutes`,
        '  └───────────────────────────────────────────────┘',
        '',
      ].join('\n'),
    );
    return Promise.resolve();
  }
}
