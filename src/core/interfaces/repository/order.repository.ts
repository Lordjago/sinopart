import type { Order, OrderStatus } from '../../domain/entities/order';
import type { Page } from '../../domain/value-object/page';

export interface OrderFilters {
  status?: OrderStatus;
  buyerId?: string;
  supplierId?: string;
  listingId?: string;
  /** Free text over the reference. */
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  /**
   * An order already running against this car. Stops a second purchase of the
   * same vehicle if two requests race the listing status check.
   */
  findActiveForListing(listingId: string): Promise<Order | null>;
  /** One order per inspection: paying twice off one report is not a thing. */
  findByInspection(inspectionId: string): Promise<Order | null>;
  find(filters: OrderFilters): Promise<Page<Order>>;
  /** Newest first, unpaginated: one dealer's or one store's list is short. */
  findAllFor(filters: OrderFilters): Promise<Order[]>;
  update(id: string, patch: Partial<Order>): Promise<Order>;
}
