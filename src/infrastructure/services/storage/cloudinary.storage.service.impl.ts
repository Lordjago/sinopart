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
    cloudinary.config({ secure: true, ...parseCloudinaryUrl(cloudinaryUrl) });
  }

  store(input: StoreFileInput): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: input.folder,
          resource_type: 'auto',
          type: 'authenticated',
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
