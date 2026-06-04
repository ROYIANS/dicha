// @vidorra/web ESLint config — extends the shared base, adds React rules.
// react-hooks runs in its strict/recommended preset (quality-guidelines.md).
import { baseConfig } from '../../eslint.config.base.mjs';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts'] },
  ...baseConfig,
  // Flat-format presets (the top-level `recommended-latest` is legacy eslintrc shape).
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // TanStack Router route files export a `Route` object (not a component) as the
    // entry — the router plugin owns their HMR, so react-refresh's component-only
    // heuristic doesn't apply here. Disable it for routes/ only.
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
