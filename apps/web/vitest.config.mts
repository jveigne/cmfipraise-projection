import path from 'node:path';

import { defineConfig } from 'vitest/config';

/** Tests de la web app : logique de lib/ et composants (jsdom + Testing Library). */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'out/**'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
