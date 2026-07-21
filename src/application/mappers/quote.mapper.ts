import { Quote } from '../../core/domain/entities/quote';

export class QuoteMapper {
  static toDomain(document: any): Quote | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      name: raw.name,
      year: raw.year,
      budget: raw.budget,
      whatsAppNumber: raw.whatsAppNumber,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(quote: Partial<Quote>): Record<string, any> {
    return {
      name: quote.name,
      year: quote.year,
      budget: quote.budget,
      whatsAppNumber: quote.whatsAppNumber,
    };
  }
}
