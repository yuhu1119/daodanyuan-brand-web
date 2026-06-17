import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * 将 HTML 中的 partial 占位符替换为片段文件内容
 * @returns {import('vite').Plugin}
 */
function htmlPartialPlugin() {
  const partialsDir = resolve(__dirname, 'partials');

  return {
    name: 'html-partial',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*@partial\s+([\w.-]+)\s*-->/g, (_, file) => {
          const filePath = resolve(partialsDir, file);
          if (!existsSync(filePath)) {
            console.warn(`[html-partial] 未找到片段: ${file}`);
            return '';
          }
          return readFileSync(filePath, 'utf-8');
        });
      },
    },
  };
}

/** @type {import('vite').UserConfig} */
export default defineConfig({
  root: '.',
  plugins: [htmlPartialPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        jiujiedan: resolve(__dirname, 'jiujiedan.html'),
        jiujiedanClassic: resolve(__dirname, 'jiujiedan-classic.html'),
        jiujiedanBusiness: resolve(__dirname, 'jiujiedan-business.html'),
        jiujiedanGift: resolve(__dirname, 'jiujiedan-gift.html'),
        about: resolve(__dirname, 'about.html'),
        products: resolve(__dirname, 'products.html'),
        technology: resolve(__dirname, 'technology.html'),
        news: resolve(__dirname, 'news.html'),
        newsDetail: resolve(__dirname, 'news-detail.html'),
        business: resolve(__dirname, 'business.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
});
