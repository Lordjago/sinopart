import type { Car } from '../../domain/entities/car';

export interface CarFilters {
  make?: string;
  status?: string;
}

export interface CarRepository {
  find(filters: CarFilters): Promise<Car[]>;

  findBySlug(slug: string): Promise<Car | null>;

  /** How many cars exist (used by the seeder to decide whether to seed). */
  count(): Promise<number>;

  /** Bulk-insert cars (used by the seeder on first boot). */
  createMany(cars: Car[]): Promise<void>;
}
