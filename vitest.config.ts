import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // כל הבדיקות כאן הן על מודולים טהורים — אין DOM ואין צורך בו
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
