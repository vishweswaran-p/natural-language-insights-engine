// Copies non-TypeScript assets (currently .sql schema files) into dist/,
// preserving the src/ directory structure. Runs after `tsc` in the build.
import { cpSync, statSync } from 'node:fs';

cpSync('src', 'dist/src', {
  recursive: true,
  filter: (source) => statSync(source).isDirectory() || source.endsWith('.sql'),
});
