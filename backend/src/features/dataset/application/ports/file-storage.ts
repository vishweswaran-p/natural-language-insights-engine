// Port: storage of uploaded artifacts (the raw CSV, derived files, etc.).
// Later implemented by a local filesystem adapter and/or an S3 adapter.

export interface FileStorage {
  // Persists the given contents under `key` and returns a storage path/URI
  // that adapters (profiler, query engine) can later resolve.
  save(key: string, contents: Buffer): Promise<string>;

  read(key: string): Promise<Buffer>;
}
