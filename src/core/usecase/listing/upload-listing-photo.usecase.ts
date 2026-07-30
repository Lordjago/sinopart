/**
 * UploadListingPhotoUseCase — store one listing photo, return its URL.
 * ---------------------------------------------------------------------------
 * Listings hold photos as stored URLs, so the client uploads each image here
 * first (getting back a URL) and then sends those URLs in create/update. Images
 * only — a car photo is never a PDF.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { FILE_STORAGE_SERVICE } from '../../injection.token';
import type { FileStorageService } from '../../interfaces/services/file-storage.service';
import { ValidationError } from '../../errors/validation.error';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadListingPhotoInput {
  supplierId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadListingPhotoUseCase extends BaseUseCase<
  UploadListingPhotoInput,
  { url: string }
> {
  constructor(
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storage: FileStorageService,
  ) {
    super();
  }

  async execute(input: UploadListingPhotoInput): Promise<{ url: string }> {
    if (!input.buffer || input.size === 0) {
      throw new ValidationError('No file was uploaded.');
    }
    if (input.size > MAX_BYTES) {
      throw new ValidationError('That image is too large. The limit is 10MB.');
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new ValidationError('Upload an image (JPG, PNG, or WebP).');
    }

    const stored = await this.storage.store({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
      folder: `suppliers/${input.supplierId}/listings`,
    });

    return { url: stored.url };
  }
}
