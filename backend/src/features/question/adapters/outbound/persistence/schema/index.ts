import path from 'node:path';

// The question feature owns its schema. Applied after the dataset schema (the
// questions table references datasets). `__dirname` resolves to the compiled
// location, alongside the .sql files copied there at build time.

export const questionSchemaFiles: readonly string[] = [path.join(__dirname, '003-create-questions.sql')];
