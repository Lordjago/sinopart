/**
 * NullStorageServiceImpl — the fallback ADAPTER used when CLOUDINARY_URL is unset.
 * ---------------------------------------------------------------------------
 * Storage is only needed for KYC uploads, so — unlike mail/SMS/Slack, which the
 * app refuses to boot without — a missing storage config shouldn't stop the
 * whole API from starting. This adapter lets everything else run and fails
 * loudly, with a clear message, only if someone actually tries to upload.
 *
 * Swap it for CloudinaryStorageServiceImpl by setting CLOUDINARY_URL.
 */
import type {
  FileStorageService,
  StoredFile,
} from '../../../core/interfaces/services/file-storage.service';
import { ValidationError } from '../../../core/errors/validation.error';

export class NullStorageServiceImpl implements FileStorageService {
  store(): Promise<StoredFile> {
    throw new ValidationError(
      'File uploads are not available right now. (Storage is not configured — set CLOUDINARY_URL.)',
    );
  }

  async remove(): Promise<void> {
    // Nothing was ever stored; removal is a no-op.
  }
}
