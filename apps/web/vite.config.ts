import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // ⚠️ tanstackRouter() MUST come BEFORE react() (it transforms route files).
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Resolve the workspace contract package to its TS SOURCE (not the CJS
      // `dist`). Vite dev (esbuild/native ESM) cannot see named exports through
      // shared's tslib `__exportStar(require(...))` CJS re-export, so a `dist`
      // import of `contract` fails at runtime. Source keeps dev/build/typecheck
      // consistent and gives instant HMR on shared edits. `apps/api` (CJS) keeps
      // consuming the `dist` build — only web maps to source.
      '@dicha/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    proxy: {
      // Same-origin in dev so the future BFF httpOnly/SameSite cookie works (architecture.md §3/§6).
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
