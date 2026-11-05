import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the built site works from any folder.
  base: './',
  plugins: [react()],
  // lunar-typescript ships as one ~425 kB module that can't be tree-shaken; the whole app is ~175 kB gzipped.
  build: { chunkSizeWarningLimit: 600 },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
