import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import * as cheerio from 'cheerio';

// Plugin to remove React Refresh preamble
const removeReactRefreshScript = () => {
  return {
    name: 'remove-react-refresh',
    transformIndexHtml(html: any) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      return $.html();
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isQiankun = mode === 'qiankun';

  return {
    base: 'https://rep-orchestrator.harx.ai/',
    plugins: [
      react({
        jsxRuntime: 'classic',
      }),
      qiankun('reporchestrator', {
        useDevMode: true,
      }),
      removeReactRefreshScript(), // Add the script removal plugin
    ],

    define: {
      'import.meta.env': env,
      __POWERED_BY_QIANKUN__: isQiankun,
    },
    server: {
      port: 5185,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      hmr: false,
      fs: {
        strict: true, // Ensure static assets are correctly resolved
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'umd',
          name: 'reporchestrator',
          entryFileNames: 'index.js', // Fixed name for the JS entry file
          chunkFileNames: 'chunk-[name].js', // Fixed name for chunks
          assetFileNames: (assetInfo) => {
            // Ensure CSS files are consistently named
            if (assetInfo.name?.endsWith('.css')) {
              return 'index.css';
            }
            return '[name].[ext]'; // Default for other asset types
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