import { BaseDomain } from './base.domain';

export class Vehicle extends BaseDomain {
  seriesId: string;
  year: number;
  fuelType: string;
  transmission: string;
  variant: number;
}
