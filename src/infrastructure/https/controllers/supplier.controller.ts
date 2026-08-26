/**
 * SupplierController: the public face of a store.
 * ---------------------------------------------------------------------------
 *   GET /suppliers/:id   (public) -> name, province, tier, verified,
 *                                   member since, cars sold
 *
 * Separate from SupplierAuthController on purpose. That one is the store's own
 * account. Every route there is authenticated and scoped to the caller. This
 * one is read-only reference data for buyers, in the same shape as brands and
 * series: public, unauthenticated, and deliberately narrow.
 *
 * A store's inventory is NOT here. It is the catalog filtered by owner,
 * GET /listings/public?supplierId=…, so a storefront can never show a car the
 * dealer catalog would have hidden.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../decorator/is-public.decorator';
import { GetPublicStoreUseCase } from '../../../core/usecase/supplier-auth/get-public-store.usecase';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly getPublicStore: GetPublicStoreUseCase) {}

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getPublicStore.execute(id);
  }
}