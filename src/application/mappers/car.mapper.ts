import type { Car, CarHistoryItem } from '../../core/domain/entities/car';

export interface PublicCar {
  id: string;
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
  status: string;
}

export class CarMapper {
  static toDomain(document: any): Car | null {
    if (document == null) return null;
    const raw =
      typeof document.toObject === 'function' ? document.toObject() : document;
    return {
      _id: raw._id?.toString(),
      slug: raw.slug,
      title: raw.title,
      make: raw.make,
      fuel: raw.fuel,
      km: raw.km,
      firstReg: raw.firstReg,
      city: raw.city,
      image: raw.image ?? '',
      credit: raw.credit ?? '',
      history: (raw.history ?? []).map((h: CarHistoryItem) => ({
        tone: h.tone,
        text: h.text,
      })),
      source: raw.source ?? '',
      price: raw.price,
      priceNote: raw.priceNote ?? '',
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static toPublic(car: Car): PublicCar {
    return {
      id: car.slug,
      title: car.title,
      make: car.make,
      fuel: car.fuel,
      km: car.km,
      firstReg: car.firstReg,
      city: car.city,
      image: car.image,
      credit: car.credit,
      history: car.history.map((h) => ({ tone: h.tone, text: h.text })),
      source: car.source,
      price: car.price,
      priceNote: car.priceNote,
      status: car.status,
    };
  }
}
