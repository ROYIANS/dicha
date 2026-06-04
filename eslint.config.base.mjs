// Shared ESLint flat config for the vidorra-life monorepo.
// Both apps (web / api) and packages import and extend this.
// Type-safety rules mirror .trellis/spec/frontend/type-safety.md (no any, no @ts-ignore).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Base config shared across the workspace.
 * Consumers add `languageOptions.parserOptions.tsconfigRootDir`/`project`
 * for type-aware linting, plus framework-specific plugins (react-hooks, etc.).
 */
export const baseConfig = tseslint.config(
  {
    ignores: ['dist', 'build', '.turbo', '.vite', 'node_modules', '**/*.gen.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // type-safety.md: no implicit/explicit any; escape hatch must carry a reason.
      '@typescript-eslint/no-explicit-any': 'error',
      // type-safety.md: forbid @ts-ignore — require @ts-expect-error with a description.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  // Keep ESLint out of Prettier's lane (formatting handled by Prettier).
  prettier,
);
