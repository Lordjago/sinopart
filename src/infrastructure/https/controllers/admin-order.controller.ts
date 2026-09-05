/**
 * The back office's side of an order.
 *
 *   GET  /admin/orders          (staff) -> the queue, any status
 *   GET  /admin/orders/:id      (staff) -> one, with both parties' contacts
 *   POST /admin/orders/:id/move (admin) -> advance a stage, with a note
 *
 * Moving a car is a commercial act with money attached (reaching IN_TRANSIT
 * releases 85% to the store), so it is admin-only. Inspectors may read the
 * queue, because an order is the context their inspection led to.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../decorator/roles.decorator';
import { UserRole } from '../../../core/domain/entities/user';
import {
  AdvanceOrderUseCase,
  GetOrderUseCase,
  ListOrdersUseCase,
} from '../../../core/usecase/order/order.usecases';
import {
  AdvanceOrderDto,
  ListOrdersDto,
} from '../../../application/dtos/order/order.dto';

@Controller('admin/orders')
export class AdminOrderController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly advance: AdvanceOrderUseCase,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get()
  list(@Query() dto: ListOrdersDto) {
    // The queue carries contacts: chasing a car means calling someone.
    return this.listOrders.execute({ ...dto, includeContact: true });
  }

  @Roles(UserRole.ADMIN, UserRole.INSPECTOR)
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.getOrder.execute({ orderId: id, as: 'admin' });
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/move')
  move(@Param('id') id: string, @Body() dto: AdvanceOrderDto) {
    return this.advance.execute({
      orderId: id,
      to: dto.to,
      note: dto.note,
      trackingReference: dto.trackingReference,
      etaAt: dto.etaAt,
    });
  }
}
