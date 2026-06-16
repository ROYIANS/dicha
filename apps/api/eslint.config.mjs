// @dicha/api ESLint config — extends the shared base, adds NestJS specifics.
import { baseConfig } from '../../eslint.config.base.mjs';

export default [
  { ignores: ['dist', 'node_modules', 'test'] },
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        // Type-aware linting against the app tsconfig.
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS providers/controllers use class properties initialized by DI.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
