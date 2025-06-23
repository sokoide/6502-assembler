import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/6502-assembler/',
    root: 'src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    publicDir: '../public',
    define: {
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});
