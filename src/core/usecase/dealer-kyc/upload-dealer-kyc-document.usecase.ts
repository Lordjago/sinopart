/**
 * UploadDealerKycDocumentUseCase: store one document (POST /kyc/documents)
 * ---------------------------------------------------------------------------
 * Called once per document (CAC certificate, proof of address, liveness). It
 * stores the file via the storage port, then attaches a PENDING document to the
 * dealer's file, replacing any earlier upload of the same type — a re-upload
 * before submitting, or a resubmit after a bounce.
 *
 * The accepted formats and size cap are BUSINESS policy ("KYC takes a PDF or a
 * photo, up to 10MB"), so they live here rather than in the HTTP layer. This
 * mirrors the supplier flow deliberately: two upload rules that drift apart
 * would mean a file a store may send and a dealer may not, for no reason
 * anyone could explain.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import {
  DEALER_KYC_REPOSITORY,
  FILE_STORAGE_SERVICE,
} from '../../injection.token';
import type { DealerKycRepository } from '../../interfaces/repository/dealer-kyc.repository';
import type { FileStorageService } from '../../interfaces/services/file-storage.service';
import { EDITABLE_DEALER_KYC_STATUSES } from '../../domain/entities/dealer-kyc';
import { REQUIRED_DEALER_DOC_LABELS } from './dealer-kyc.labels';
import {
  KycDocumentStatus,
  REQUIRED_DEALER_KYC_DOCUMENTS,
  type KycDocument,
  type KycDocumentType,
} from '../../domain/value-object/kyc';
import { ValidationError } from '../../errors/validation.error';
import {
  toDealerKycStatusView,
  type DealerKycStatusView,
} from './dealer-kyc.view';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export interface UploadDealerKycDocumentCommand {
  userId: string;
  type: KycDocumentType;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadDealerKycDocumentUseCase extends BaseUseCase<
  UploadDealerKycDocumentCommand,
  DealerKycStatusView
> {
  constructor(
    @Inject(DEALER_KYC_REPOSITORY)
    private readonly dealerKyc: DealerKycRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storage: FileStorageService,
  ) {
    super();
  }

  async execute(
    input: UploadDealerKycDocumentCommand,
  ): Promise<DealerKycStatusView> {
    // The enum covers both sides of the marketplace, so a dealer asking to
    // upload a `store_photo` is refused here rather than quietly stored as a
    // document nothing will ever review.
    if (!REQUIRED_DEALER_KYC_DOCUMENTS.includes(input.type)) {
      throw new ValidationError(
        `Dealers upload ${REQUIRED_DEALER_DOC_LABELS.join(', ')}.`,
      );
    }
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

    const existing = await this.dealerKyc.ensureForUser(input.userId);
    if (!EDITABLE_DEALER_KYC_STATUSES.has(existing.status)) {
      throw new ValidationError(
        'Your verification is with our team. You cannot change it while it is being reviewed.',
      );
    }

    const stored = await this.storage.store({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
      folder: `dealers/${input.userId}/kyc`,
    });

    // A re-upload restarts review from scratch: PENDING, and any earlier
    // reviewer's note cleared, so the admin panel never shows last round's
    // rejection reason against this round's file.
    const doc: KycDocument = {
      type: input.type,
      url: stored.url,
      filename: input.filename ?? null,
      mimeType: input.mimeType ?? null,
      status: KycDocumentStatus.PENDING,
      rejectionReason: null,
      reviewedBy: null,
      uploadedAt: new Date(),
      reviewedAt: null,
    };

    const saved = await this.dealerKyc.upsertKycDocument(input.userId, doc);
    return toDealerKycStatusView(saved);
  }
}
