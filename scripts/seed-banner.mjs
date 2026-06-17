/**
 * 首次初始化：写入默认 data/banner.json
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const jsonPath = resolve(root, 'data/banner.json');

if (existsSync(jsonPath)) {
  console.log('[seed-banner] data/banner.json 已存在，跳过');
  process.exit(0);
}

const dataPath = resolve(root, 'js/banner-data.js');
if (existsSync(dataPath)) {
  const mod = await import(`file://${dataPath}`);
  mkdirSync(resolve(root, 'data'), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify({ slides: mod.BANNER_SLIDES || [] }, null, 2), 'utf-8');
  console.log(`[seed-banner] 已从 banner-data.js 写入 ${(mod.BANNER_SLIDES || []).length} 张轮播`);
  process.exit(0);
}

console.log('[seed-banner] 无默认数据，跳过');
