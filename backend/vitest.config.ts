import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Force NODE_ENV=test so env.ts does not treat an ambient NODE_ENV=production
    // as a production boot (it rejects a weak/missing JWT_SECRET there).
    env: { NODE_ENV: 'test' },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/', 'dist/', 'prisma/'],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
