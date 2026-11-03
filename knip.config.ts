import { createKnipConfig } from '@ankhorage/devtools/knip';

export default createKnipConfig({
  entry: ['eslint.config.mjs', 'prettier.config.cjs'],
});
