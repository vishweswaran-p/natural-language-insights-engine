import { withStatus } from '../../../../../../shared/http';
import type { Ctx, RouteDefinition } from '../../../../../../shared/http';
import { makeCreateDatasetUseCase } from '../../../factory';
import { ApiError, toResponse } from '../api-error';
import { toDatasetDto } from '../dataset-dto';
import { cleanupTempFiles, receiveUpload, UploadedFile } from '../multipart';

// Accepted MIME types for CSV. Browsers/platforms are inconsistent, so we accept
// a pragmatic set and rely primarily on the .csv extension + non-zero size.
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

// POST /api/datasets — upload a CSV, store it, and create a PROCESSING dataset.
const handler = (ctx: Ctx) =>
  toResponse(async () => {
    const files = await receiveUpload(ctx.req, 'file');
    const file = validateSingleCsv(files);

    const dataset = await makeCreateDatasetUseCase().exec({
      filename: file.filename,
      fileSizeBytes: file.size,
      mimeType: file.type,
      sourcePath: file.fd,
    });

    return withStatus(201, toDatasetDto(dataset));
  });

export const route: RouteDefinition = { method: 'post', path: '/api/datasets', handler };

// Validate that exactly one non-empty .csv file was uploaded. On any failure the
// temp files are cleaned up before an ApiError is thrown.
function validateSingleCsv(files: UploadedFile[]): UploadedFile {
  if (files.length === 0) {
    throw new ApiError(400, 'FILE_REQUIRED', 'A file is required in the "file" field.');
  }
  if (files.length > 1) {
    rejectAfterCleanup(files, 400, 'MULTIPLE_FILES_NOT_SUPPORTED', 'Exactly one file may be uploaded.');
  }

  const file = files[0];
  if (file.size === 0) {
    rejectAfterCleanup(files, 400, 'EMPTY_FILE', 'The uploaded file is empty.');
  }
  if (!file.filename.toLowerCase().endsWith('.csv')) {
    rejectAfterCleanup(files, 400, 'INVALID_FILE_TYPE', 'Only .csv files are supported.');
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    rejectAfterCleanup(files, 400, 'INVALID_FILE_TYPE', `Unsupported content type: ${file.type}.`);
  }
  return file;
}

function rejectAfterCleanup(files: UploadedFile[], status: number, code: string, message: string): never {
  void cleanupTempFiles(files);
  throw new ApiError(status, code, message);
}
