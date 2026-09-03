import { datasetSchemaFiles } from '@app/features/dataset/adapters/outbound/persistence/schema';
import { questionSchemaFiles } from '@app/features/question/adapters/outbound/persistence/schema';

// All feature schema files, applied in order at startup. Order matters:
// datasets first (jobs and questions reference it).
export const schemaFiles: readonly string[] = [...datasetSchemaFiles, ...questionSchemaFiles];
