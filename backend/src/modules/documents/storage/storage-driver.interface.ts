export interface SavedFile {
  key: string;
  sizeBytes: number;
}

// Storage is abstracted behind this interface so the S3/R2 driver can be added
// later without touching DocumentsService - only StorageModule's provider
// factory needs to change. Only 'local' is implemented right now (see
// STORAGE_DRIVER in .env.example); requesting 's3' or 'r2' fails loudly at
// boot instead of pretending to work.
export interface StorageDriver {
  save(applicationId: string, originalFilename: string, buffer: Buffer): Promise<SavedFile>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
