/**
 * UploadKycDocumentUseCase — store one KYC document (POST /supplier-auth/kyc/documents)
 * ---------------------------------------------------------------------------
 * Called once per document (license, identity, store photo). It stores the file
 * via the storage port, then attaches a PENDING KycDocument to the supplier,
 * replacing any earlier upload of the same type (a re-upload before submission,
 * or a resubmit after a rejection).
 *
 * The accepted formats and size cap are BUSINESS policy ("KYC takes a PDF or a
 * photo, up to 10MB"), so they live here rather than in the HTTP layer.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  FILE_STORAGE_SERVICE,
  SUPPLIER_REPOSITORY,
} from '../../injection.token';
import type { SupplierRepository } from '../../interfaces/repository/supplier.repository';
import type { FileStorageService } from '../../interfaces/services/file-storage.service';
import type { Supplier } from '../../domain/entities/supplier';
import {
  KycDocumentStatus,
  type KycDocument,
  type KycDocumentType,
} from '../../domain/value-object/kyc';
import { ResourceNotFoundError } from '../../errors/resource-not-found.error';
import { ValidationError } from '../../errors/validation.error';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export interface UploadKycDocumentInput {
  supplierId: string;
  type: KycDocumentType;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadKycDocumentUseCase extends BaseUseCase<
  UploadKycDocumentInput,
  Supplier
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly suppliers: SupplierRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storage: FileStorageService,
  ) {
    super();
  }

  async execute(input: UploadKycDocumentInput): Promise<Supplier> {
    if (!input.buffer || input.size === 0) {
      throw new ValidationError('No file was uploaded.');
    }
    if (input.size > MAX_BYTES) {
      throw new ValidationError('That file is too large. The limit is 10MB.');
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new ValidationError(
        'Upload a PDF or an image (JPG, PNG, or WebP).',
      );
    }

    // Confirm the supplier exists before spending an upload on them.
    const supplier = await this.suppliers.findById(input.supplierId);
    if (!supplier) {
      throw new ResourceNotFoundError('Supplier not found.');
    }

    const stored = await this.storage.store({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
      folder: `suppliers/${input.supplierId}/kyc`,
    });

    const doc: KycDocument = {
      type: input.type,
      url: stored.url,
      status: KycDocumentStatus.PENDING,
      rejectionReason: null,
      uploadedAt: new Date(),
      reviewedAt: null,
    };

    return this.suppliers.upsertKycDocument(input.supplierId, doc);
  }
}
