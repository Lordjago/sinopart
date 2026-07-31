/* eslint-disable @typescript-eslint/no-floating-promises */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { Quote } from '../../domain/entities/quote';
import { ResourceAlreadyExistsError } from '../../errors/resource-already-exists.error';
import { MESSAGING_SERVICE, QUOTE_REPOSITORY } from '../../injection.token';
import type { QuoteRepository } from '../../interfaces/repository/quote.repository';
import type { NotificationService } from '../../interfaces/services/notification.service';
import { quoteRequestedNotification } from '../../notifications/quote-requested.notification';
import type { QuoteDto } from '../../../application/dtos/request-quote/quote.dto';

/**
 * How long a number must wait between quote requests. This is spam protection,
 * not a uniqueness rule: a customer may legitimately request several quotes for
 * the same vehicle and year, so the guard keys on the sender and a time window
 * rather than on the quote's contents.
 */
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class CreateQuoteUseCase extends BaseUseCase<QuoteDto, Quote> {
  constructor(
    @Inject(QUOTE_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
    @Inject(MESSAGING_SERVICE)
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async execute(input: QuoteDto): Promise<Quote> {
    const { name, year, budget, whatsAppNumber } = input;

    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const recent = await this.quoteRepository.findRecentByWhatsAppNumber(
      whatsAppNumber,
      since,
    );
    if (recent) {
      throw new ResourceAlreadyExistsError(
        'A quote request from this number was just received. Please wait a few minutes before sending another.',
      );
    }

    const quote = new Quote();
    quote.name = name;
    quote.year = year;
    quote.budget = budget;
    quote.whatsAppNumber = whatsAppNumber;

    const created = await this.quoteRepository.create(quote);

    // Quote alerts go to the team's Slack channel.
    this.notificationService.notify(
      quoteRequestedNotification({
        name: created.name,
        year: created.year,
        budget: created.budget,
        whatsAppNumber: created.whatsAppNumber,
        submittedAt: created.createdAt,
      }),
    );

    return created;
  }
}
