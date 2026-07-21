import { WaitList } from 'src/core/domain/entities/waitlist';

export class WaitListMapper {
  static toDomain(document: any): WaitList | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      email: raw.email,
      name: raw.name,
      dealership: raw.dealership,
      whatsAppNumber: raw.whatsAppNumber,
      city: raw.city,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPersistence(waitlist: Partial<WaitList>): Record<string, any> {
    return {
      email: waitlist.email,
      name: waitlist.name,
      dealership: waitlist.dealership,
      whatsAppNumber: waitlist.whatsAppNumber,
      city: waitlist.city,
    };
  }
}
