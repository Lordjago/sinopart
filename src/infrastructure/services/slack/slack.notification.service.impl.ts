import { Logger } from '@nestjs/common';
import type {
  Notification,
  NotificationAction,
  NotificationService,
} from '../../../core/interfaces/services/notification.service';

export interface SlackNotificationConfig {
  webhookUrl: string;
}

type SlackBlock = Record<string, unknown>;

const EMPTY = '-';

export class SlackNotificationServiceImpl implements NotificationService {
  private readonly logger = new Logger('SlackNotificationService');

  constructor(private readonly config: SlackNotificationConfig) {}

  async notify({ title, fields, action, at }: Notification): Promise<void> {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: title, emoji: true },
      },
      {
        type: 'section',
        fields: fields.map((f) => this.field(f.label, f.value)),
      },
    ];

    if (action) blocks.push(this.actions(action));
    blocks.push(this.context(at));

    await this.post(title, blocks);
  }

  private field(label: string, value?: string): SlackBlock {
    const shown = value?.trim() ? value.trim() : EMPTY;
    return { type: 'mrkdwn', text: `*${label}*\n${shown}` };
  }

  private actions(action: NotificationAction): SlackBlock {
    return {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: action.label, emoji: true },
          url: action.url,
          style: 'primary',
        },
      ],
    };
  }

  private context(at?: Date): SlackBlock {
    const when = at ? at.toISOString() : new Date().toISOString();
    return {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `SinoPart · ${when}` }],
    };
  }

  private async post(tag: string, blocks: SlackBlock[]): Promise<void> {
    try {
      const res = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) {
        const reason = await res.text();
        this.logger.error(
          `Failed to post "${tag}" alert to Slack: ${res.status} ${reason}`,
        );
        return;
      }
      this.logger.log(`Posted "${tag}" alert to Slack.`);
    } catch (error) {
      this.logger.error(
        `Failed to post "${tag}" alert to Slack: ${(error as Error).message}`,
      );
    }
  }
}
