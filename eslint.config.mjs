// Root ESLint config — lints repo-level config/scripts only.
// Each workspace package has its own eslint.config.mjs extending eslint.config.base.mjs.
import { baseConfig } from './eslint.config.base.mjs';

export default [
  {
    ignores: ['apps/**', 'packages/**', 'dist', 'build', '.turbo', 'node_modules'],
  },
  ...baseConfig,
];
