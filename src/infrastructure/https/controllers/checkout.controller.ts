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

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly inspectionCheckout: GetInspectionCheckoutUseCase,
  ) {}

  @Public()
  @Get('inspection/:listingId')
  inspection(@Param('listingId') listingId: string) {
    return this.inspectionCheckout.execute(listingId);
  }
}
