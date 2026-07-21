import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { Page } from '../../domain/value-object/page';
import { QUOTE_REPOSITORY } from '../../injection.token';
import type { Quote } from '../../domain/entities/quote';
import type { QuoteRepository } from '../../interfaces/repository/quote.repository';
import type { GetQuoteDto } from '../../../application/dtos/request-quote/get-quote.dto';

@Injectable()
export class GetQuoteUseCase extends BaseUseCase<GetQuoteDto, Page<Quote>> {
  constructor(
    @Inject(QUOTE_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
  ) {
    super();
  }

  async execute(input: GetQuoteDto): Promise<Page<Quote>> {
    const {
      name,
      year,
      whatsAppNumber,
      minBudget,
      maxBudget,
      from,
      to,
      page,
      limit,
    } = input;

    return await this.quoteRepository.find({
      name,
      year,
      whatsAppNumber,
      minBudget,
      maxBudget,
      from,
      to,
      page,
      limit,
    });
  }
}
