import { createConfig } from '@ankhorage/devtools/eslint';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  project: ['./tsconfig.json'],
  files: ['src/**/*.{ts,tsx}'],
});
