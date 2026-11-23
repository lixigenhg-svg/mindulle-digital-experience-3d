import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    reporters: ['default', ['json', { outputFile: 'test-results/vitest-results.json' }]],
    outputFile: 'test-results/vitest-results.json'
  }
});
