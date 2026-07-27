import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    include: ['test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    coverage: {
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
    },
  },
})
