/**
 * 首次初始化：从现有 js/news-data.js 导出 data/news.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsonPath = resolve(root, 'data/news.json');

if (existsSync(jsonPath)) {
  console.log('[seed] data/news.json 已存在，跳过');
  process.exit(0);
}

const mod = await import(`file://${resolve(root, 'js/news-data.js')}`);
mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(mod.NEWS_ARTICLES, null, 2), 'utf-8');
console.log(`[seed] 已写入 ${mod.NEWS_ARTICLES.length} 条新闻到 data/news.json`);
