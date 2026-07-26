/**
 * SlackNotificationServiceImpl — the ADAPTER implementing NotificationService
 * ---------------------------------------------------------------------------
 * Posts team alerts to a Slack channel through an Incoming Webhook. A webhook is
 * a single URL bound to one channel, so there is no token or bot user to manage:
 * we POST a Block Kit payload and Slack renders it in the channel.
 *
 * Every send is best-effort. The customer's waitlist join / quote request has
 * already been saved by the time we get here, so a Slack outage must not surface
 * as an error — failures are caught and logged, never thrown.
 */
import { Logger } from '@nestjs/common';
import type {
  NotificationService,
  QuoteRequestedNotification,
  WaitListJoinedNotification,
} from '../../../core/interfaces/services/notification.service';

export interface SlackNotificationConfig {
  /** Incoming webhook URL, e.g. https://hooks.slack.com/services/T.../B.../xxx */
  webhookUrl: string;
}

/** A single Block Kit block. Loosely typed — Slack accepts the JSON as-is. */
type SlackBlock = Record<string, unknown>;

const EMPTY = '—';

export class SlackNotificationServiceImpl implements NotificationService {
  private readonly logger = new Logger('SlackNotificationService');

  constructor(private readonly config: SlackNotificationConfig) {}

  async notifyWaitListJoined(input: WaitListJoinedNotification): Promise<void> {
    const fields = [
      this.field('Name', input.name),
      this.field('Email', input.email),
      this.field('Dealership', input.dealership),
      this.field('City', input.city),
      this.field('WhatsApp', input.whatsAppNumber),
    ];

    await this.post('waitlist', [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 New waitlist signup',
          emoji: true,
        },
      },
      { type: 'section', fields },
      this.context(input.joinedAt),
    ]);
  }

  async notifyQuoteRequested(input: QuoteRequestedNotification): Promise<void> {
    const waDigits = (input.whatsAppNumber ?? '').replace(/\D/g, '');
    const fields = [
      this.field('Car requested', input.name),
      this.field('Year', input.year ? String(input.year) : undefined),
      this.field('Budget', this.formatNaira(input.budget)),
      this.field('WhatsApp', input.whatsAppNumber),
    ];

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🚗 New quote request', emoji: true },
      },
      { type: 'section', fields },
    ];

    // The quote form collects no email, so the only reply path is WhatsApp.
    if (waDigits) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Reply on WhatsApp',
              emoji: true,
            },
            url: `https://wa.me/${waDigits}`,
            style: 'primary',
          },
        ],
      });
    }

    blocks.push(this.context(input.submittedAt));

    await this.post('quote', blocks);
  }

  /** A Block Kit mrkdwn field: bold label over its value (em dash if missing). */
  private field(label: string, value?: string): SlackBlock {
    const shown = value?.trim() ? value.trim() : EMPTY;
    return { type: 'mrkdwn', text: `*${label}*\n${shown}` };
  }

  /** A muted footer line with the event time. */
  private context(at?: Date): SlackBlock {
    const when = at ? at.toISOString() : new Date().toISOString();
    return {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `SinoPart · ${when}` }],
    };
  }

  private formatNaira(amount?: number): string {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return EMPTY;
    return `₦${amount.toLocaleString('en-NG')}`;
  }

  private async post(tag: string, blocks: SlackBlock[]): Promise<void> {
    try {
      const res = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) {
        // Slack returns a plain-text reason (e.g. "invalid_payload") on failure.
        const reason = await res.text();
        this.logger.error(
          `Failed to post "${tag}" alert to Slack: ${res.status} ${reason}`,
        );
        return;
      }
      this.logger.log(`Posted "${tag}" alert to Slack.`);
    } catch (error) {
      // Swallowed on purpose — the triggering action is already committed.
      this.logger.error(
        `Failed to post "${tag}" alert to Slack: ${(error as Error).message}`,
      );
    }
  }
}
