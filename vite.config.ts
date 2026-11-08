import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Local data/backups (.local) and Playwright browsers (.tools) hold gigabytes of files. Watching them made
// the dev server's first CSS request take ~40 s on Windows, long enough to time out browser tests.
// Tailwind compiles the utility classes used by src/components (see src/style.css).
export default defineConfig({
  plugins: [tailwindcss()],
  server: { watch: { ignored: ['**/.local/**', '**/.tools/**', '**/test-results/**'] } },
});
