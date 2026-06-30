import { baseConfig } from '../../eslint.config.base.mjs';

export default [
  { ignores: ['dist', 'node_modules', 'test'] },
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];

