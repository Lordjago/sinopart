import type { WaitList } from '../../domain/entities/waitlist';
import type { Page } from '../../domain/value-object/page';

export interface WaitListFilters {
  name?: string;
  email?: string;
  dealership?: string;
  whatsAppNumber?: string;
  city?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface WaitListRepository {
  create(waitlist: WaitList): Promise<WaitList>;
  find(filters: WaitListFilters): Promise<Page<WaitList>>;
  findByEmail(email: string): Promise<WaitList | null>;
  delete(id: string): Promise<void>;
}
