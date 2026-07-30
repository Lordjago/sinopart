import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { SUPPLIER_REPOSITORY } from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { Supplier } from '../../domain/entities/supplier';
import { UnauthorizedError } from '../../errors/unauthorized.error';

@Injectable()
export class GetSupplierProfileUseCase extends BaseUseCase<string, Supplier> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
  ) {
    super();
  }

  async execute(supplierId: string): Promise<Supplier> {
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) {
      throw new UnauthorizedError('Account not found for this session.');
    }
    return supplier;
  }
}
