/**
 * Orders, from the two sides that are not the back office.
 *
 *   POST /orders                  (buyer)  -> pay for the car, creating the order
 *   GET  /orders                  (buyer)  -> my orders
 *   GET  /orders/supplier/mine    (seller) -> orders against my cars
 *   POST /orders/:id/prepared     (seller) -> the car is ready for collection
 *   POST /orders/:id/confirm      (buyer)  -> it matches the report; or dispute
 *   GET  /orders/:id              (either) -> one order, for the tracking screen
 *
 * Every route is authenticated. `POST /orders` is the payment, and the amount is
 * computed server-side from the inspection: a client cannot name its own price,
 * nor claim a credit it did not pay.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { CurrentUser } from '../decorator/current-user.decorator';
import type { AuthUser } from '../../../core/domain/value-object/auth-user';
import { UserRole } from '../../../core/domain/entities/user';
import { PurchaseListingUseCase } from '../../../core/usecase/order/purchase-listing.usecase';
import {
  ConfirmDeliveryUseCase,
  GetOrderUseCase,
  ListOrdersUseCase,
  MarkOrderPreparedUseCase,
} from '../../../core/usecase/order/order.usecases';
import {
  ConfirmDeliveryDto,
  ListOrdersDto,
  PurchaseListingDto,
} from '../../../application/dtos/order/order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly purchase: PurchaseListingUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly confirmDelivery: ConfirmDeliveryUseCase,
    private readonly markPrepared: MarkOrderPreparedUseCase,
  ) {}

  /** Stands in for a payment gateway, as the inspection fee does. */
  @Roles(UserRole.BUYER)
  @Post()
  buy(@CurrentUser() user: AuthUser, @Body() dto: PurchaseListingDto) {
    return this.purchase.execute({
      buyerId: user.id,
      inspectionId: dto.inspectionId,
    });
  }

  // buyerId is pinned to the caller, so the query string cannot widen it.
  @Roles(UserRole.BUYER)
  @Get()
  mine(@CurrentUser() user: AuthUser, @Query() dto: ListOrdersDto) {
    return this.listOrders.execute({ ...dto, buyerId: user.id, all: true });
  }

  @Roles(UserRole.SELLER)
  @Get('supplier/mine')
  forMyStore(@CurrentUser() user: AuthUser, @Query() dto: ListOrdersDto) {
    return this.listOrders.execute({ ...dto, supplierId: user.id, all: true });
  }

  /**
   * The store saying the car is ready for collection. A milestone, not a
   * transition: only the back office moves an order, and only a VIN-verified
   * loading releases the 85%.
   */
  @Roles(UserRole.SELLER)
  @Post(':id/prepared')
  prepared(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.markPrepared.execute({ orderId: id, supplierId: user.id });
  }

  @Roles(UserRole.BUYER)
  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConfirmDeliveryDto,
  ) {
    return this.confirmDelivery.execute({
      orderId: id,
      buyerId: user.id,
      disputeReason: dto.disputeReason,
    });
  }

  /** Last, so `supplier/mine` above is not swallowed by the `:id` pattern. */
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.getOrder.execute({
      orderId: id,
      as: user.role === UserRole.SELLER ? 'supplier' : 'buyer',
      viewerId: user.id,
    });
  }
}
