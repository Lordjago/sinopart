/**
 * DatabaseModule — the persistence composition root
 * ---------------------------------------------------------------------------
 * This module owns everything about talking to MongoDB and is where PORTS get
 * bound to ADAPTERS. Three responsibilities:
 *
 *   1. Open the connection (MongooseModule.forRootAsync, reading MONGODB_URI
 *      from the validated config).
 *   2. Register each schema (forFeature) so `@InjectModel(name)` works.
 *   3. Bind each repository token to its implementation:
 *        { provide: USER_REPOSITORY, useClass: UserRepositoryImpl }
 *      and EXPORT the tokens so use cases (in CoreModule) can inject them.
 *
 * It imports ServiceModule because UsersSeeder hashes its demo password through
 * the AUTHENTICATION_SERVICE port.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CAR_REPOSITORY,
  OTP_REPOSITORY,
  QUOTE_REPOSITORY,
  USER_REPOSITORY,
  WAITLIST_REPOSITORY,
} from '../../core/injection.token';
import { ServiceModule } from '../services/service.module';

import { UserSchema } from './mongoose/documents/user.document';
import { CarSchema } from './mongoose/documents/car.document';
import { OtpSchema } from './mongoose/documents/otp.document';
import { WaitListSchema } from './mongoose/documents/waitlist.document';
import { UserRepositoryImpl } from './mongoose/repositories/user.repository.impl';
import { CarRepositoryImpl } from './mongoose/repositories/car.repository.impl';
import { OtpRepositoryImpl } from './mongoose/repositories/otp.repository.impl';
import { WaitListRepositoryImpl } from './mongoose/repositories/waitlist.repository.impl';
import { UsersSeeder } from './mongoose/seeders/users.seeder';
import { CatalogSeeder } from './mongoose/seeders/catalog.seeder';
import { QuoteRepositoryImpl } from './mongoose/repositories/quote.repository.impl';
import { QuoteSchema } from './mongoose/documents/quote.document';

@Module({
  imports: [
    // Open the connection. The async form lets us inject ConfigService, since
    // env values are validated/available only after ConfigModule initialises.
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    // Register the collections. The names ('users', 'cars') are the tokens the
    // repository adapters ask for with `@InjectModel(...)`.
    MongooseModule.forFeature([
      { name: 'users', schema: UserSchema },
      { name: 'cars', schema: CarSchema },
      { name: 'otps', schema: OtpSchema },
      { name: 'waitlist', schema: WaitListSchema },
      { name: 'quotes', schema: QuoteSchema },
    ]),
    ServiceModule,
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    { provide: CAR_REPOSITORY, useClass: CarRepositoryImpl },
    { provide: OTP_REPOSITORY, useClass: OtpRepositoryImpl },
    { provide: WAITLIST_REPOSITORY, useClass: WaitListRepositoryImpl },
    { provide: QUOTE_REPOSITORY, useClass: QuoteRepositoryImpl },
    UsersSeeder,
    CatalogSeeder,
  ],
  // Exporting the tokens (and MongooseModule) lets other modules depend on the
  // storage ports without knowing the concrete adapters.
  exports: [
    MongooseModule,
    USER_REPOSITORY,
    CAR_REPOSITORY,
    OTP_REPOSITORY,
    WAITLIST_REPOSITORY,
    QUOTE_REPOSITORY,
  ],
})
export class DatabaseModule {}
