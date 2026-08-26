import { BaseDomain } from './base.domain';

export class Brand extends BaseDomain {
  name: string;
  description?: string;
  logo?: string;
}
