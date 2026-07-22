import type { Car } from '../../domain/entities/car';

export interface CarFilters {
  make?: string;
  status?: string;
}

export interface CarRepository {
  find(filters: CarFilters): Promise<Car[]>;

  findBySlug(slug: string): Promise<Car | null>;
}
