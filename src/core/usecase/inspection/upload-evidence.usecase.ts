/**
 * UploadInspectionEvidenceUseCase: store one report photo or clip.
 * (POST /admin/inspections/:id/evidence)
 * ---------------------------------------------------------------------------
 * The inspector uploads from the yard, one named shot at a time, and sends the
 * returned URLs with the report. Same shape as the listing uploads: the file
 * lands first, so a half-finished report never holds a dangling reference.
 *
 * Both kinds go through here rather than through two endpoints. Unlike the
 * listing case, where a still and a walkaround are gathered at different times
 * by different people, an inspector fills one evidence sheet in one sitting and
 * the limits differ only by which slot they are filling.
 */
import { Inject, Injectable } from '@nestjs/common';
import { BaseUseCase } from '../base.usecase';
import { FILE_STORAGE_SERVICE } from '../../injection.token';
import type { FileStorageService } from '../../interfaces/services/file-storage.service';
import { ValidationError } from '../../errors/validation.error';

const PHOTO_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 90 * 1024 * 1024;

const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-m4v',
]);

export interface UploadEvidenceInput {
  inspectionId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadInspectionEvidenceUseCase extends BaseUseCase<
  UploadEvidenceInput,
  { url: string; kind: 'photo' | 'video' }
> {
  constructor(
    @Inject(FILE_STORAGE_SERVICE)
    private readonly storage: FileStorageService,
  ) {
    super();
  }

  async execute(input: UploadEvidenceInput) {
    if (!input.buffer || input.size === 0) {
      throw new ValidationError('No file was uploaded.');
    }

    // The file decides which limits apply, rather than the caller claiming a
    // kind: a client that mislabels a 90MB video as a photo would otherwise
    // slip past the photo cap.
    const isPhoto = PHOTO_MIME.has(input.mimeType);
    const isVideo = VIDEO_MIME.has(input.mimeType);
    if (!isPhoto && !isVideo) {
      throw new ValidationError(
        'Upload a photo (JPG, PNG, WebP) or a video (MP4, MOV, WebM, 3GP).',
      );
    }

    const max = isVideo ? VIDEO_MAX : PHOTO_MAX;
    if (input.size > max) {
      throw new ValidationError(
        isVideo
          ? 'That video is too large. The limit is 90MB.'
          : 'That photo is too large. The limit is 10MB.',
      );
    }

    const stored = await this.storage.store({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
      // Filed under the inspection, not the store: this is our evidence about
      // their car, and it has to stay readable if the listing is deleted.
      folder: `inspections/${input.inspectionId}/evidence`,
    });

    return {
      url: stored.url,
      kind: isVideo ? ('video' as const) : ('photo' as const),
    };
  }
}
