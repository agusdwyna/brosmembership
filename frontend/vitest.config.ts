import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Force NODE_ENV=test so React loads its development build (which exports
    // `act`). An ambient NODE_ENV=production makes React load the production
    // build, whose missing `act` breaks @testing-library/react's act().
    env: { NODE_ENV: 'test' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      exclude: ['node_modules/', 'dist/'],
    },
  },
});
