/**
 * CloudinaryStorageServiceImpl — the ADAPTER that stores files in Cloudinary.
 * ---------------------------------------------------------------------------
 * Bound to FILE_STORAGE_SERVICE in service.module when CLOUDINARY_URL is set.
 * Uploads go over Cloudinary's upload_stream (buffer in, no temp file).
 *
 * KYC documents are NOT public marketing images: `type: 'authenticated'` means
 * Cloudinary won't serve them from a guessable URL — they need a signed link,
 * which the app generates when an admin actually needs to view one.
 */
import { Logger } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type {
  FileStorageService,
  StoreFileInput,
  StoredFile,
} from '../../../core/interfaces/services/file-storage.service';

export class CloudinaryStorageServiceImpl implements FileStorageService {
  private readonly logger = new Logger('FileStorage');

  constructor(cloudinaryUrl: string) {
    // CLOUDINARY_URL (cloudinary://key:secret@cloud) configures the SDK globally.
    // Passing it explicitly keeps config out of the adapter and in env/DI.
    cloudinary.config({ secure: true, ...parseCloudinaryUrl(cloudinaryUrl) });
  }

  store(input: StoreFileInput): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: input.folder,
          resource_type: 'auto', // handles both images and PDFs
          type: 'authenticated', // not publicly reachable without a signed URL
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message ?? 'no result'}`,
            );
            return reject(
              error instanceof Error ? error : new Error('Upload failed'),
            );
          }
          resolve({ url: result.secure_url, key: result.public_id });
        },
      );
      stream.end(input.buffer);
    });
  }

  async remove(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key, { type: 'authenticated' });
    } catch (err) {
      // Best-effort: a failed cleanup shouldn't break the caller's flow.
      this.logger.warn(
        `Cloudinary remove failed for ${key}: ${(err as Error).message}`,
      );
    }
  }
}

/** Parse `cloudinary://<key>:<secret>@<cloud_name>` into the SDK's config shape. */
function parseCloudinaryUrl(url: string): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim());
  if (!match) {
    throw new Error(
      'CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>',
    );
  }
  const [, api_key, api_secret, cloud_name] = match;
  return { cloud_name, api_key, api_secret };
}
