/**
 * CatalogSeeder — fills an empty catalog on first boot
 * ---------------------------------------------------------------------------
 * `OnModuleInit` is a NestJS lifecycle hook Nest calls once after the module is
 * ready. We use it to insert the seed cars only when the collection is empty, so
 * the project is runnable immediately (clone → boot → catalog has cars) without
 * a separate seed command, and restarts never duplicate data.
 *
 * Note it depends on the CAR_REPOSITORY *port*, not on Mongoose directly — the
 * seeder is an infrastructure concern but still speaks the core's language.
 */
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CAR_REPOSITORY } from '../../../../core/injection.token';
import type { CarRepository } from '../../../../core/interfaces/repository/car.repository';
import type { Car } from '../../../../core/domain/entities/car';
import { CARS_SEED } from './cars.seed-data';

@Injectable()
export class CatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger('CatalogSeeder');

  constructor(
    @Inject(CAR_REPOSITORY) private readonly carRepository: CarRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.carRepository.count();
    if (count > 0) {
      this.logger.log(`Catalog already has ${count} cars — skipping seed.`);
      return;
    }

    await this.carRepository.createMany(CARS_SEED);
    this.logger.log(`Seeded ${CARS_SEED.length} cars into the catalog.`);
  }
}
