/**
 * UploadListingVideoUseCase: store one walkaround clip, return its URL.
 * (POST /listings/videos)
 * ---------------------------------------------------------------------------
 * Separate from the photo endpoint rather than a flag on it, because the two
 * differ in every way that matters: a clip is ten times the size, takes a
 * different set of container formats, and is optional where five photos are
 * required. One endpoint with a branch would have to describe both limits in a
 * single error message, and would let a 90MB file through the photo path by
 * mistake.
 *
 * Like photos, the client uploads first and sends the returned URL in
 * create/update, so a half-finished draft never holds a dangling file
 * reference.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { FILE_STORAGE_SERVICE } from '../../injection.token';
import type { FileStorageService } from '../../interfaces/services/file-storage.service';
import { ValidationError } from '../../errors/validation.error';

/**
 * 90MB. A walkaround shot on a phone at 1080p runs about a minute and lands
 * well inside this; anything larger is a supplier uploading raw footage, which
 * is worth refusing before it costs them the wait.
 */
const MAX_BYTES = 90 * 1024 * 1024;

/**
 * What phones actually produce. MOV covers iPhone, MP4 and 3GPP cover Android,
 * WebM covers a desktop re-encode. AVI and WMV are deliberately absent: they
 * play badly in browsers and a dealer who cannot watch the clip is worse off
 * than one who never had it.
 */
const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-m4v',
]);

export interface UploadListingVideoInput {
  supplierId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadListingVideoUseCase extends BaseUseCase<
  UploadListingVideoInput,
  { url: string }
> {
  constructor(
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storage: FileStorageService,
  ) {
    super();
  }

  async execute(input: UploadListingVideoInput): Promise<{ url: string }> {
    if (!input.buffer || input.size === 0) {
      throw new ValidationError('No video was uploaded.');
    }
    if (input.size > MAX_BYTES) {
      throw new ValidationError(
        'That video is too large. The limit is 90MB, so trim it or record at a lower quality.',
      );
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new ValidationError(
        'Upload a video file (MP4, MOV, WebM or 3GP).',
      );
    }

    const stored = await this.storage.store({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
      // Kept apart from the stills so the two are distinguishable in storage
      // without parsing the filename.
      folder: `suppliers/${input.supplierId}/listing-videos`,
    });

    return { url: stored.url };
  }
}
