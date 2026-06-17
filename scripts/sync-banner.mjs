/**
 * 将 data/banner.json 同步为前端 js/banner-data.js
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsonPath = resolve(root, 'data/banner.json');
const outPath = resolve(root, 'js/banner-data.js');

if (!existsSync(jsonPath)) {
  console.log('[sync-banner] data/banner.json 不存在，跳过');
  process.exit(0);
}

const banner = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const enabledSlides = (banner.slides || []).filter((slide) => slide.enabled !== false);

const header = `/**
 * 首页 Banner 数据（由后台自动生成，请勿手动编辑）
 * 编辑请登录管理后台：/admin
 */

/** @type {import('./banner-data.js').BannerSlide[]} */
export const BANNER_SLIDES = ${JSON.stringify(enabledSlides, null, 2)};
`;

writeFileSync(outPath, header, 'utf-8');
console.log(`[sync-banner] 已同步 ${enabledSlides.length} 张轮播（共 ${(banner.slides || []).length} 条）→ js/banner-data.js`);
