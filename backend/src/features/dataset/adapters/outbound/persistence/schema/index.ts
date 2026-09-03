import path from 'node:path';

// The dataset feature owns its schema. Ordered list of SQL files applied by the
// shared database initializer at startup. `__dirname` resolves to the compiled
// location, alongside the .sql files copied there at build time.

export const datasetSchemaFiles: readonly string[] = [path.join(__dirname, '001-create-datasets.sql')];
