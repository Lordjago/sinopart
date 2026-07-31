export interface StoreFileInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
}

export interface StoredFile {
  url: string;
  key: string;
}

export interface FileStorageService {
  store(input: StoreFileInput): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}
