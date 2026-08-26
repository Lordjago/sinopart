/**
 * HttpsModule: the HTTP (driving) adapter composition root
 * ---------------------------------------------------------------------------
 * Groups everything that turns HTTP requests into use-case calls:
 *   - every controller,
 *   - the global AuthGuard (registered via APP_GUARD so it runs on every route).
 *
 * It imports CoreModule (to inject the use cases into controllers) and
 * ServiceModule (so the guard can inject JwtService to verify tokens). The
 * response interceptor and exception filter are registered globally in main.ts.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CoreModule } from '../../core/core.module';
import { ServiceModule } from '../services/service.module';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { AuthController } from './controllers/auth.controller';
import { WaitListController } from './controllers/waitlist.controller';
import { QuoteController } from './controllers/quote.controller';
import { SupplierAuthController } from './controllers/supplier-auth.controller';
import { SupplierController } from './controllers/supplier.controller';
import { ListingController } from './controllers/listing.controller';
import { BrandController } from './controllers/brand.controller';
import { SeriesController } from './controllers/series.controller';
import { VehicleController } from './controllers/vehicle.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminController } from './controllers/admin.controller';
import { AdminKycController } from './controllers/admin-kyc.controller';
import { AdminListingController } from './controllers/admin-listing.controller';
import { InspectionController } from './controllers/inspection.controller';
import { SavedListingController } from './controllers/saved-listing.controller';
import { CheckoutController } from './controllers/checkout.controller';
import { ConfigController } from './controllers/config.controller';
import { AdminInspectionController } from './controllers/admin-inspection.controller';
import { DealerKycController } from './controllers/dealer-kyc.controller';
import { AdminDealerKycController } from './controllers/admin-dealer-kyc.controller';

@Module({
  imports: [CoreModule, ServiceModule],
  controllers: [
    AuthController,
    WaitListController,
    QuoteController,
    // 'supplier-auth' is a distinct path from 'suppliers', so order between
    // these two does not matter. Unlike the admin pair below.
    SupplierAuthController,
    SupplierController,
    ListingController,
    BrandController,
    SeriesController,
    VehicleController,
    // Back office. AdminAuthController is listed BEFORE AdminController: both
    // sit on 'admin', and Nest matches routes in registration order, so the
    // specific 'admin/auth/*' paths must be declared first.
    AdminAuthController,
    AdminController,
    // The dealer desk sits on admin/kyc/dealers and is declared BEFORE the
    // supplier desk on admin/kyc, so its routes are matched first if the two
    // prefixes ever overlap.
    AdminDealerKycController,
    AdminKycController,
    AdminListingController,
    InspectionController,
    SavedListingController,
    CheckoutController,
    ConfigController,
    AdminInspectionController,
    // A dealer verifying themselves. Sits on its own 'kyc' prefix.
    DealerKycController,
  ],
  // Guard order matters: AuthGuard (authn, populates request.user) MUST run
  // before RolesGuard (authz, reads request.user.role). Global guards run in
  // the order they are listed here.
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class HttpsModule {}
