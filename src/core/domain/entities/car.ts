import { BaseDomain } from './base.domain';

export enum CarStatus {
  AVAILABLE = 'available',
  HOLD = 'hold',
  SOLD = 'sold',
}

export interface CarHistoryItem {
  tone: string;
  text: string;
}

export class Car extends BaseDomain {
  slug: string;
  title: string;
  make: string;
  fuel: string;
  km: string;
  firstReg: string;
  city: string;
  image: string;
  credit: string;
  history: CarHistoryItem[];
  source: string;
  price: string;
  priceNote: string;
  status: CarStatus;
}
