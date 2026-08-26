import type {
  Inspection,
  InspectionStatus,
} from '../../domain/entities/inspection';
import type { Page } from '../../domain/value-object/page';

export interface InspectionFilters {
  status?: InspectionStatus;
  buyerId?: string;
  supplierId?: string;
  listingId?: string;
  /** Free text over the reference. */
  search?: string;
  page?: number;
  limit?: number;
}

export interface InspectionRepository {
  create(inspection: Inspection): Promise<Inspection>;
  findById(id: string): Promise<Inspection | null>;
  /**
   * Whether this car is already spoken for. Used before taking payment, so two
   * dealers cannot both pay to inspect the same car.
   */
  findActiveForListing(listingId: string): Promise<Inspection | null>;
  find(filters: InspectionFilters): Promise<Page<Inspection>>;
  /** Newest first, unpaginated: one buyer's or one store's own list is small. */
  findAllFor(filters: InspectionFilters): Promise<Inspection[]>;
  update(id: string, patch: Partial<Inspection>): Promise<Inspection>;
}
