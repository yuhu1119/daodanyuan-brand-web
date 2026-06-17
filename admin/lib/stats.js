/**
 * 访问统计读写
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const STATS_FILE = resolve(ROOT, 'data/stats.json');

/**
 * @returns {{ total: number, today: { date: string, count: number }, pages: Record<string, number>, daily: Record<string, number> }}
 */
export function readStats() {
  if (!existsSync(STATS_FILE)) {
    return { total: 0, today: { date: todayKey(), count: 0 }, pages: {}, daily: {} };
  }
  return JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
}

/**
 * @param {string} path
 */
export function recordPageview(path) {
  const safePath = String(path || '/').slice(0, 200);
  const stats = readStats();
  const today = todayKey();

  stats.total = (stats.total || 0) + 1;
  stats.pages = stats.pages || {};
  stats.pages[safePath] = (stats.pages[safePath] || 0) + 1;
  stats.daily = stats.daily || {};
  stats.daily[today] = (stats.daily[today] || 0) + 1;

  if (!stats.today || stats.today.date !== today) {
    stats.today = { date: today, count: 1 };
  } else {
    stats.today.count += 1;
  }

  pruneDaily(stats.daily);
  mkdirSync(dirname(STATS_FILE), { recursive: true });
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  return stats;
}

/**
 * @param {Record<string, number>} daily
 */
function pruneDaily(daily) {
  const keys = Object.keys(daily).sort();
  while (keys.length > 90) {
    const old = keys.shift();
    if (old) delete daily[old];
  }
}

/** @returns {string} */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
