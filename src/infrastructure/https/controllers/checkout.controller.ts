/**
 * What a checkout screen needs before it can take money.
 *
 *   GET /checkout/inspection/:listingId  (public) -> fee, terms, cost breakdown
 *
 * Public on purpose: a dealer may read the price and the terms before signing
 * in, and is sent to log in at the point of paying. Nothing returned here is
 * specific to one dealer.
 *
 * The fee this quotes is the same constant StartInspectionUseCase charges. That
 * is the whole reason the endpoint exists.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { GetInspectionCheckoutUseCase } from '../../../core/usecase/checkout/get-inspection-checkout.usecase';
import { GetPurchaseCheckoutUseCase } from '../../../core/usecase/checkout/get-purchase-checkout.usecase';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly inspectionCheckout: GetInspectionCheckoutUseCase,
    private readonly purchaseCheckout: GetPurchaseCheckoutUseCase,
  ) {}

  @Public()
  @Get('inspection/:listingId')
  inspection(@Param('listingId') listingId: string) {
    return this.inspectionCheckout.execute(listingId);
  }

  /**
   * The purchase screen. Authenticated, unlike the inspection checkout above:
   * it is keyed on the caller's own inspection and quotes a credit only they
   * earned, so there is nothing here a signed-out visitor could be shown.
   */
  @Roles(UserRole.BUYER)
  @Get('purchase/:inspectionId')
  purchase(
    @CurrentUser() user: AuthUser,
    @Param('inspectionId') inspectionId: string,
  ) {
    return this.purchaseCheckout.execute({ inspectionId, buyerId: user.id });
  }
}
