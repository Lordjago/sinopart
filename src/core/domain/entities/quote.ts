import { BaseDomain } from './base.domain';

export class Quote extends BaseDomain {
  name: string;
  year: number;
  budget: number;
  whatsAppNumber: string;
}
