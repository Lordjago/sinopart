import type { Supplier } from '../../../core/domain/entities/supplier';

export interface SupplierAuthResponse {
  supplier: Supplier;
  token: string;
  storeVerified: boolean;
}
