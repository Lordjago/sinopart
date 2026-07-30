/**
 * FileStorageService — outbound port for storing uploaded files (KYC docs, etc.)
 * ---------------------------------------------------------------------------
 * The core never touches Cloudinary, S3, or the filesystem directly: it hands
 * raw bytes to this port and gets back a stored reference. The adapter decides
 * where the bytes actually live. Same ports-and-adapters shape as MailService
 * and SmsService.
 *
 * `folder` groups related uploads (e.g. `suppliers/<id>/kyc`) so storage stays
 * navigable and a supplier's files can be found/purged together.
 */
export interface StoreFileInput {
  buffer: Buffer;
  /** Original filename — used for extension/format hints only, never as the key. */
  filename: string;
  mimeType: string;
  folder: string;
}

export interface StoredFile {
  /** The reference we persist and later serve/verify. Adapter-defined
   *  (Cloudinary: the secure URL). */
  url: string;
  /** Stable id for deletion/replacement (Cloudinary: the public_id). */
  key: string;
}

export interface FileStorageService {
  store(input: StoreFileInput): Promise<StoredFile>;

  /** Best-effort removal — used when a doc is replaced or a submission is purged. */
  remove(key: string): Promise<void>;
}
