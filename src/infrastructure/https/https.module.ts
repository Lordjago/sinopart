/**
 * HttpsModule — the HTTP (driving) adapter composition root
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
import { ListingController } from './controllers/listing.controller';

@Module({
  imports: [CoreModule, ServiceModule],
  controllers: [
    AuthController,
    WaitListController,
    QuoteController,
    SupplierAuthController,
    ListingController,
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
