import { Injectable, Logger } from '@nestjs/common';
import { SendByte, SendByteError } from '@sendbyte/node';
import type {
  MailService,
  QuoteAlertInput,
  SendOtpCodeInput,
  WaitListAlertInput,
  WaitListWelcomeInput,
} from '../../../core/interfaces/services/mail.service';
import type { RenderedEmail } from './templates/layout';
import { otpTemplate } from './templates/otp.template';
import { quoteAdminTemplate } from './templates/quote-admin.template';
import { waitListAdminTemplate } from './templates/waitlist-admin.template';
import { waitListWelcomeTemplate } from './templates/waitlist-welcome.template';

export interface SendByteMailConfig {
  apiKey: string;
  /** e.g. "SinoPart <noreply@sinopart.africa>" */
  from: string;
  /** Where quote and waitlist alerts land. */
  adminEmail: string;
}

@Injectable()
export class SendByteMailServiceImpl implements MailService {
  private readonly logger = new Logger('MailService');
  private readonly client: SendByte;

  constructor(private readonly config: SendByteMailConfig) {
    this.client = new SendByte(config.apiKey);
  }

  async sendOtpCode(input: SendOtpCodeInput): Promise<void> {
    await this.deliver(input.to, otpTemplate(input), 'otp');
  }

  async sendWaitListWelcome(input: WaitListWelcomeInput): Promise<void> {
    await this.deliver(
      input.email,
      waitListWelcomeTemplate(input),
      'waitlist-welcome',
    );
  }

  async sendWaitListAdminAlert(input: WaitListAlertInput): Promise<void> {
    await this.deliver(
      this.config.adminEmail,
      waitListAdminTemplate(input),
      'waitlist-admin',
      // Lets the team hit Reply and land in the customer's inbox.
      input.email,
    );
  }

  async sendQuoteAdminAlert(input: QuoteAlertInput): Promise<void> {
    await this.deliver(
      this.config.adminEmail,
      quoteAdminTemplate(input),
      'quote-admin',
    );
  }

  private async deliver(
    to: string,
    email: RenderedEmail,
    tag: string,
    replyTo?: string,
  ): Promise<void> {
    try {
      const { id } = await this.client.emails.send({
        from: this.config.from,
        to,
        subject: email.subject,
        html: email.html,
        tags: [tag],
        ...(replyTo ? { reply_to: replyTo } : {}),
      });
      this.logger.log(`Sent "${tag}" to ${to} (id: ${id})`);
    } catch (error) {
      // Swallowed on purpose — see the class comment. Logged with the API's
      // error code when SendByte gave us one, since that is what their docs
      // are indexed by.
      if (error instanceof SendByteError) {
        this.logger.error(
          `Failed to send "${tag}" to ${to}: [${error.code}] ${error.message}`,
        );
      } else {
        this.logger.error(
          `Failed to send "${tag}" to ${to}: ${(error as Error).message}`,
        );
      }
    }
  }
}
