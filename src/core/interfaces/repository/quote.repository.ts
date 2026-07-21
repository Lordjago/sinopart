import type { Quote } from '../../domain/entities/quote';
import type { Page } from '../../domain/value-object/page';

export interface QuoteFilters {
  name?: string;
  year?: number;
  whatsAppNumber?: string;
  minBudget?: number;
  maxBudget?: number;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface QuoteRepository {
  create(quote: Quote): Promise<Quote>;
  find(filters: QuoteFilters): Promise<Page<Quote>>;
  findRecentByWhatsAppNumber(
    whatsAppNumber: string,
    since: Date,
  ): Promise<Quote | null>;
  delete(id: string): Promise<void>;
}
