import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', ['json', { outputFile: 'docs/vitest-results.json' }]],
    outputFile: 'docs/vitest-results.json'
  }
});
