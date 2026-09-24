import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      // The gate has to live here to exist at all: `vitest run --coverage` prints a table and
      // exits 0 at any coverage whatsoever, so a threshold stated only in prose can never turn
      // red. 80 is the number the brief names, not the number this suite happens to reach — a
      // threshold pinned to today's coverage locks in today's suite.
      thresholds: { statements: 80 }
    }
  }
})
