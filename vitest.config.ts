import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      './src/**/*.spec.ts',
      './src/**/*.spec.tsx',
      './src/**/*.test.ts',
      './src/**/*.test.tsx',
    ],
  },
});
