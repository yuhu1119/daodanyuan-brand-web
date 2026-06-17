/**
 * 构建 sitemap.xml（写入 public/，由 Vite 复制到 dist/）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const baseUrl = (process.env.SITE_URL || 'https://www.daodanyuan.com').replace(/\/$/, '');

const staticPages = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/jiujiedan.html', changefreq: 'monthly', priority: '0.95' },
  { loc: '/jiujiedan-classic.html', changefreq: 'monthly', priority: '0.85' },
  { loc: '/jiujiedan-business.html', changefreq: 'monthly', priority: '0.85' },
  { loc: '/jiujiedan-gift.html', changefreq: 'monthly', priority: '0.85' },
  { loc: '/about.html', changefreq: 'monthly', priority: '0.8' },
  { loc: '/products.html', changefreq: 'monthly', priority: '0.9' },
  { loc: '/technology.html', changefreq: 'monthly', priority: '0.8' },
  { loc: '/news.html', changefreq: 'weekly', priority: '0.9' },
  { loc: '/business.html', changefreq: 'monthly', priority: '0.8' },
  { loc: '/contact.html', changefreq: 'monthly', priority: '0.7' },
];

/** @type {{ id: string, date?: string, link?: string }[]} */
let articles = [];
try {
  articles = JSON.parse(readFileSync(resolve(root, 'data/news.json'), 'utf-8'));
} catch {
  articles = [];
}

/**
 * @param {string} str
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const urls = [
  ...staticPages.map((page) => ({
    loc: `${baseUrl}${page.loc}`,
    changefreq: page.changefreq,
    priority: page.priority,
    lastmod: null,
  })),
  ...articles
    .filter((a) => !a.link)
    .map((a) => ({
      loc: `${baseUrl}/news-detail.html?id=${encodeURIComponent(a.id)}`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: a.date || null,
    })),
];

const body = urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outDir = resolve(root, 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'sitemap.xml'), xml, 'utf-8');
console.log(`[sitemap] 已生成 ${urls.length} 条 URL → public/sitemap.xml`);
