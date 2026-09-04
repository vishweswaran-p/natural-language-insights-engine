import { unlink } from 'node:fs/promises';
import { ApiError } from '@app/shared/http';
import type { PlatformRequest } from '@app/shared/http';
import { getLogger } from '@app/shared/logging';

const log = getLogger('upload');

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

// A single file received by Sails' built-in multipart parser (skipper). Streamed
// to a temporary location on disk — never buffered fully in memory.
export interface UploadedFile {
  fd: string; // temp file path
  size: number; // bytes
  type: string; // reported MIME type
  filename: string; // original user-facing filename
}

// Structural view of the skipper-enabled request. `req.file()` is added by Sails'
// HTTP hook; typing it narrowly here keeps Sails specifics inside this adapter.
type Upstream = {
  upload: (
    opts: { maxBytes: number },
    cb: (err: (Error & { code?: string }) | null, files: UploadedFile[]) => void,
  ) => void;
};
type MultipartRequest = PlatformRequest & { file: (field: string) => Upstream };

// Receive the uploaded files for `field`, enforcing the size limit during
// streaming. A file exceeding the limit becomes a FILE_TOO_LARGE ApiError.
export function receiveUpload(req: PlatformRequest, field: string): Promise<UploadedFile[]> {
  const upstream = (req as MultipartRequest).file(field);
  return new Promise((resolve, reject) => {
    upstream.upload({ maxBytes: MAX_UPLOAD_BYTES }, (err, files) => {
      if (err) {
        if (err.code === 'E_EXCEEDS_UPLOAD_LIMIT') {
          reject(new ApiError(413, 'FILE_TOO_LARGE', `File exceeds the ${MAX_UPLOAD_BYTES} byte limit.`));
          return;
        }
        reject(err);
        return;
      }
      resolve(files);
    });
  });
}

// Best-effort removal of temp files (e.g. after a validation failure). Never throws.
export async function cleanupTempFiles(files: UploadedFile[]): Promise<void> {
  await Promise.all(
    files.map((file) =>
      unlink(file.fd).catch((err) => {
        log.warn('Failed to remove temp upload file', { path: file.fd, err });
      }),
    ),
  );
}
