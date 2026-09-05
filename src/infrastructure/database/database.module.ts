/**
 * DatabaseModule: the persistence composition root
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
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  BRAND_REPOSITORY,
  DEALER_KYC_REPOSITORY,
  INVITATION_REPOSITORY,
  INSPECTION_REPOSITORY,
  SAVED_LISTING_REPOSITORY,
  ORDER_REPOSITORY,
  SETTING_REPOSITORY,
  LISTING_REPOSITORY,
  OTP_REPOSITORY,
  QUOTE_REPOSITORY,
  SERIES_REPOSITORY,
  SUPPLIER_REPOSITORY,
  USER_REPOSITORY,
  VEHICLE_REPOSITORY,
  WAITLIST_REPOSITORY,
} from '../../core/injection.token';

import { UserSchema } from './mongoose/documents/user.document';
import { OtpSchema } from './mongoose/documents/otp.document';
import { WaitListSchema } from './mongoose/documents/waitlist.document';
import { UserRepositoryImpl } from './mongoose/repositories/user.repository.impl';
import { OtpRepositoryImpl } from './mongoose/repositories/otp.repository.impl';
import { WaitListRepositoryImpl } from './mongoose/repositories/waitlist.repository.impl';
import { QuoteRepositoryImpl } from './mongoose/repositories/quote.repository.impl';
import { QuoteSchema } from './mongoose/documents/quote.document';
import { SupplierSchema } from './mongoose/documents/supplier.document';
import { InvitationSchema } from './mongoose/documents/invitation.document';
import { SupplierRepositoryImpl } from './mongoose/repositories/supplier.repository.impl';
import { InvitationRepositoryImpl } from './mongoose/repositories/invitation.repository.impl';
import { ListingSchema } from './mongoose/documents/listing.document';
import { ListingRepositoryImpl } from './mongoose/repositories/listing.repository.impl';
import { BrandSchema } from './mongoose/documents/brand.document';
import { SeriesSchema } from './mongoose/documents/series.document';
import { VehicleSchema } from './mongoose/documents/vehicle.document';
import { BrandRepositoryImpl } from './mongoose/repositories/brand.repository.impl';
import { SeriesRepositoryImpl } from './mongoose/repositories/series.repository.impl';
import { VehicleRepositoryImpl } from './mongoose/repositories/vehicle.repository.impl';
import { InspectionSchema } from './mongoose/documents/inspection.document';
import { InspectionRepositoryImpl } from './mongoose/repositories/inspection.repository.impl';
import { DealerKycSchema } from './mongoose/documents/dealer-kyc.document';
import { DealerKycRepositoryImpl } from './mongoose/repositories/dealer-kyc.repository.impl';
import { SavedListingSchema } from './mongoose/documents/saved-listing.document';
import { SavedListingRepositoryImpl } from './mongoose/repositories/saved-listing.repository.impl';
import { SettingSchema } from './mongoose/documents/setting.document';
import { SettingRepositoryImpl } from './mongoose/repositories/setting.repository.impl';
import { OrderSchema } from './mongoose/documents/order.document';
import { OrderRepositoryImpl } from './mongoose/repositories/order.repository.impl';
import { ServiceModule } from '../services/service.module';

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
    // Register the collections. The names ('users', 'listings') are the tokens
    // the repository adapters ask for with `@InjectModel(...)`.
    MongooseModule.forFeature([
      { name: 'users', schema: UserSchema },
      { name: 'otps', schema: OtpSchema },
      { name: 'waitlist', schema: WaitListSchema },
      { name: 'quotes', schema: QuoteSchema },
      { name: 'suppliers', schema: SupplierSchema },
      { name: 'invitations', schema: InvitationSchema },
      { name: 'listings', schema: ListingSchema },
      // Vehicle catalog tree: brands -> series -> vehicles. The names below are
      // what `ref:` points at in those documents, so they must not be renamed
      // without updating the refs.
      { name: 'brands', schema: BrandSchema },
      { name: 'series', schema: SeriesSchema },
      { name: 'vehicles', schema: VehicleSchema },
      { name: 'inspections', schema: InspectionSchema },
      // A dealer's verification file. Its own collection rather than fields on
      // the user: a BVN and a home address must not ride along in the JWT.
      { name: 'dealerkycs', schema: DealerKycSchema },
      { name: 'saved_listings', schema: SavedListingSchema },
      { name: 'settings', schema: SettingSchema },
      { name: 'orders', schema: OrderSchema },
    ]),
    // For FieldCipher, injected into SupplierRepositoryImpl to encrypt bank
    // account numbers at rest.
    ServiceModule,
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    { provide: OTP_REPOSITORY, useClass: OtpRepositoryImpl },
    { provide: WAITLIST_REPOSITORY, useClass: WaitListRepositoryImpl },
    { provide: QUOTE_REPOSITORY, useClass: QuoteRepositoryImpl },
    { provide: SUPPLIER_REPOSITORY, useClass: SupplierRepositoryImpl },
    { provide: INVITATION_REPOSITORY, useClass: InvitationRepositoryImpl },
    { provide: LISTING_REPOSITORY, useClass: ListingRepositoryImpl },
    { provide: BRAND_REPOSITORY, useClass: BrandRepositoryImpl },
    { provide: SERIES_REPOSITORY, useClass: SeriesRepositoryImpl },
    { provide: VEHICLE_REPOSITORY, useClass: VehicleRepositoryImpl },
    { provide: INSPECTION_REPOSITORY, useClass: InspectionRepositoryImpl },
    { provide: SAVED_LISTING_REPOSITORY, useClass: SavedListingRepositoryImpl },
    { provide: SETTING_REPOSITORY, useClass: SettingRepositoryImpl },
    { provide: ORDER_REPOSITORY, useClass: OrderRepositoryImpl },
    { provide: DEALER_KYC_REPOSITORY, useClass: DealerKycRepositoryImpl },
  ],
  // Exporting the tokens (and MongooseModule) lets other modules depend on the
  // storage ports without knowing the concrete adapters.
  exports: [
    MongooseModule,
    USER_REPOSITORY,
    OTP_REPOSITORY,
    WAITLIST_REPOSITORY,
    QUOTE_REPOSITORY,
    SUPPLIER_REPOSITORY,
    INVITATION_REPOSITORY,
    LISTING_REPOSITORY,
    BRAND_REPOSITORY,
    SERIES_REPOSITORY,
    VEHICLE_REPOSITORY,
    INSPECTION_REPOSITORY,
    SAVED_LISTING_REPOSITORY,
    SETTING_REPOSITORY,
    ORDER_REPOSITORY,
    DEALER_KYC_REPOSITORY,
  ],
})
export class DatabaseModule {}
