import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: '/workspace/business-workspace', plugins: [react()], base: './', build: { outDir: '/tmp/dist-lab', emptyOutDir: true }, preview: { port: 5185, strictPort: true, host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:8785', '/login': 'http://127.0.0.1:8785' } } });
