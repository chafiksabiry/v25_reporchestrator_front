import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import * as cheerio from 'cheerio';
import { stripHostManagedTrackingScripts } from './scripts/stripTrackingFromMicrofrontendHtml';

// Plugin to remove the React Refresh preamble that breaks the UMD build
// consumed by qiankun.
const removeReactRefreshScript = () => {
  return {
    name: 'remove-react-refresh',
    transformIndexHtml(html: string) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      stripHostManagedTrackingScripts($);
      return $.html();
    },
  };
};

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // In dev (`vite`/`command === 'serve'`) the host must load chunks/assets from
  // the LOCAL dev server, otherwise the browser fetches the production Netlify
  // bundle and local source changes never appear. Netlify build uses URL so
  // prod/dev sites keep their own asset origin (not hardcoded *-dev).
  const isDev = command === 'serve';
  const publicBase = isDev
    ? 'http://localhost:5174/'
    : `${(
        process.env.VITE_MF_BASE_URL ||
        process.env.URL ||
        process.env.DEPLOY_PRIME_URL ||
        'https://harx26reporchestratorfront-dev.netlify.app'
      ).replace(/\/+$/, '')}/`;

  return {
    // Absolute base so the host (qiankun) loads chunks/assets from the
    // micro-app's own origin (local in dev, this Netlify site in builds).
    base: publicBase,
    plugins: [
      react(),
      qiankun('reps', {
        useDevMode: isDev,
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
