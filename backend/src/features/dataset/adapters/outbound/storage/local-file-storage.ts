import { copyFile, mkdir, rename, rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { FileStorage, StoreFileInput, StoredFile } from '@app/features/dataset/application/ports/file-storage';

// Outbound adapter: stores uploaded files on the local filesystem under a
// controlled directory. Layout: <root>/<datasetId>/original.csv
//
// Security: the storage location is derived solely from the application-generated
// dataset UUID and a fixed filename. The user-provided filename is never used to
// build a path, so path traversal is not possible.

const STORED_FILENAME = 'original.csv';

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string = path.resolve(process.cwd(), 'data', 'uploads')) {
    this.root = root;
  }

  async store({ datasetId, sourcePath }: StoreFileInput): Promise<StoredFile> {
    const dir = path.join(this.root, datasetId);
    await mkdir(this.root, { recursive: true });
    // Non-recursive: throws EEXIST if this dataset's directory already exists,
    // so we never overwrite another dataset's files.
    await mkdir(dir);

    const destination = path.join(dir, STORED_FILENAME);
    await moveFile(sourcePath, destination);
    return { storagePath: destination };
  }

  async remove(datasetId: string): Promise<void> {
    const dir = path.join(this.root, datasetId);
    await rm(dir, { recursive: true, force: true });
  }
}

// Prefer an atomic rename; fall back to copy+unlink across filesystems (EXDEV).
async function moveFile(source: string, destination: string): Promise<void> {
  try {
    await rename(source, destination);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    await copyFile(source, destination);
    await unlink(source);
  }
}
