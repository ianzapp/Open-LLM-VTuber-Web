import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src/renderer/src') },
  },
  test: {
    environment: 'node',
    include: ['src/renderer/**/*.test.ts'],
  },
});
