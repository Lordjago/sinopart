import { BaseDomain } from './base.domain';

export class WaitList extends BaseDomain {
  email: string;
  name?: string;
  dealership?: string;
  whatsAppNumber?: string;
  city?: string;
}
