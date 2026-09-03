// Port: storage of uploaded artifacts (the raw CSV for now). Implemented by a
// local filesystem adapter today; could be backed by S3 later. Kept small and
// path-based so callers never load whole files into memory.

export type StoreFileInput = {
  // Application-generated dataset UUID. Determines the storage location so the
  // user-provided filename never influences the filesystem path.
  datasetId: string;
  // Path to a temporary source file (e.g. a multipart upload) to move into place.
  sourcePath: string;
};

export type StoredFile = {
  // Internal, controlled storage path. An implementation detail — not exposed via the API.
  storagePath: string;
};

export interface FileStorage {
  store(input: StoreFileInput): Promise<StoredFile>;
  // Compensating cleanup (e.g. when a DB insert fails after the file was stored).
  remove(datasetId: string): Promise<void>;
}
