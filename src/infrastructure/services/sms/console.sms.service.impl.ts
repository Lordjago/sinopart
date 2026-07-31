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
