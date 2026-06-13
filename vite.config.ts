import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import * as cheerio from 'cheerio';

// Plugin to remove the React Refresh preamble that breaks the UMD build
// consumed by qiankun.
const removeReactRefreshScript = () => {
  return {
    name: 'remove-react-refresh',
    transformIndexHtml(html: string) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      return $.html();
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Absolute base so the host (qiankun) loads chunks/assets from the
    // micro-app's own Netlify origin.
    base: 'https://harxv25reporchestratorfront.netlify.app/',
    plugins: [
      react(),
      qiankun('reps', {
        useDevMode: true,
      }),
      removeReactRefreshScript(),
    ],
    define: {
      'import.meta.env': env,
    },
    server: {
      port: 5174,
      strictPort: true,
      cors: true,
      hmr: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      fs: {
        strict: true,
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: 'index.js',
          chunkFileNames: 'chunk-[name].js',
          assetFileNames: (assetInfo) => {
            const isCss =
              assetInfo.name?.endsWith('.css') ||
              (assetInfo.names && assetInfo.names.some((n) => n.endsWith('.css')));
            if (isCss) {
              return 'index.css';
            }
            return '[name].[ext]';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
