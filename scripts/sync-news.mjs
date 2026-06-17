/**
 * 将 data/news.json 同步为前端 js/news-data.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsonPath = resolve(root, 'data/news.json');
const outPath = resolve(root, 'js/news-data.js');

const articles = JSON.parse(readFileSync(jsonPath, 'utf-8'));

const header = `/**
 * 新闻数据（由后台自动生成，请勿手动编辑）
 * 编辑请登录管理后台：/admin
 */

/** @type {Record<string, string>} */
export const NEWS_CATEGORIES = {
  company: '企业新闻',
  event: '品牌活动',
  industry: '行业资讯',
  media: '媒体报道',
};

/** @type {import('./news-data.js').NewsArticle[]} */
export const NEWS_ARTICLES = ${JSON.stringify(articles, null, 2)};

/**
 * 根据 ID 获取新闻
 * @param {string} id
 */
export function getNewsById(id) {
  return NEWS_ARTICLES.find((item) => item.id === id);
}

/**
 * 获取分类显示名
 * @param {string} category
 */
export function getCategoryLabel(category) {
  return NEWS_CATEGORIES[category] || '新闻动态';
}
`;

writeFileSync(outPath, header, 'utf-8');
console.log(`[sync-news] 已同步 ${articles.length} 条新闻 → js/news-data.js`);
