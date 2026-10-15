import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/', 'dist/', 'prisma/'],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
