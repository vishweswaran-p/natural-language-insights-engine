// Local filesystem storage for uploaded CSV files.

export type StoreFileInput = {
  datasetId: string;
  sourcePath: string;
};

export type StoredFile = {
  storagePath: string;
};

export interface FileStorage {
  store(input: StoreFileInput): Promise<StoredFile>;
  remove(datasetId: string): Promise<void>;
}
