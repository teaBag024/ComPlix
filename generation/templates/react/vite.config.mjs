import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({ base: './', plugins: [tailwindcss()], resolve: { alias: { '@': path.resolve('Library/src') } }, build: { outDir: '/workspace/output', emptyOutDir: true } });
