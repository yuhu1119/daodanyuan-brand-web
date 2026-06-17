/**
 * 将 data/settings.json 同步为前端 js/site-settings.js
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsonPath = resolve(root, 'data/settings.json');
const outPath = resolve(root, 'js/site-settings.js');

if (!existsSync(jsonPath)) {
  console.log('[sync-settings] data/settings.json 不存在，跳过');
  process.exit(0);
}

const settings = JSON.parse(readFileSync(jsonPath, 'utf-8'));

const header = `/**
 * 网站配置（由后台自动生成，请勿手动编辑）
 * 编辑请登录管理后台：/admin
 */

/** @type {import('./site-settings.js').SiteSettings} */
export const SITE_SETTINGS = ${JSON.stringify(settings, null, 2)};
`;

writeFileSync(outPath, header, 'utf-8');
console.log('[sync-settings] 已同步网站配置 → js/site-settings.js');
