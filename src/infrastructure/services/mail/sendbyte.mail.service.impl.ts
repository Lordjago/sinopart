import { Injectable, Logger } from '@nestjs/common';
import { SendByte, SendByteError } from '@sendbyte/node';
import type {
  Email,
  MailService,
} from '../../../core/interfaces/services/mail.service';

export interface SendByteMailConfig {
  apiKey: string;
  /** e.g. "SinoPart <noreply@sinopart.africa>" */
  from: string;
}

@Injectable()
export class SendByteMailServiceImpl implements MailService {
  private readonly logger = new Logger('MailService');
  private readonly client: SendByte;

  constructor(private readonly config: SendByteMailConfig) {
    this.client = new SendByte(config.apiKey);
  }

  async send({ to, subject, html, tag, replyTo }: Email): Promise<void> {
    try {
      const { id } = await this.client.emails.send({
        from: this.config.from,
        to,
        subject,
        html,
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
