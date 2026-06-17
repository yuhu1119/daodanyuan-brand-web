/**
 * 分模块发布、备份与构建
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { ROOT } from './storage.js';

const PUBLIC_DATA = resolve(ROOT, 'public/data');
const BACKUP_DIR = resolve(ROOT, 'data/backups');
const STATE_FILE = resolve(ROOT, 'data/publish-state.json');
const MAX_BACKUPS = 20;

/** @type {boolean} */
let publishing = false;

/** @type {Record<string, { data: string, js: string, public: string }>} */
const MODULE_FILES = {
  news: {
    data: resolve(ROOT, 'data/news.json'),
    js: resolve(ROOT, 'js/news-data.js'),
    public: resolve(PUBLIC_DATA, 'news.json'),
  },
  banner: {
    data: resolve(ROOT, 'data/banner.json'),
    js: resolve(ROOT, 'js/banner-data.js'),
    public: resolve(PUBLIC_DATA, 'banner.json'),
  },
  settings: {
    data: resolve(ROOT, 'data/settings.json'),
    js: resolve(ROOT, 'js/site-settings.js'),
    public: resolve(PUBLIC_DATA, 'settings.json'),
  },
};

/** @type {Record<string, string>} */
const SYNC_SCRIPTS = {
  news: resolve(ROOT, 'scripts/sync-news.mjs'),
  banner: resolve(ROOT, 'scripts/sync-banner.mjs'),
  settings: resolve(ROOT, 'scripts/sync-settings.mjs'),
};

const MODULE_LABELS = {
  news: '新闻',
  banner: 'Banner',
  settings: '网站设置',
};

/**
 * @param {string} file
 */
function fileChecksum(file) {
  if (!existsSync(file)) return null;
  return createHash('md5').update(readFileSync(file)).digest('hex');
}

/**
 * @returns {Record<string, { checksum: string | null, publishedAt: string | null }>}
 */
function readPublishState() {
  if (!existsSync(STATE_FILE)) {
    return { news: { checksum: null, publishedAt: null }, banner: { checksum: null, publishedAt: null }, settings: { checksum: null, publishedAt: null } };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

/**
 * @param {Record<string, { checksum: string | null, publishedAt: string }>} state
 */
function writePublishState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * @param {string[]} modules
 * @returns {string[]}
 */
function normalizeModules(modules) {
  if (modules.includes('all')) return ['news', 'banner', 'settings'];
  return modules.filter((m) => MODULE_FILES[m]);
}

/**
 * @returns {{ publishing: boolean, changed: string[], counts: Record<string, number | boolean>, hasDist: boolean }}
 */
export function getPublishPreview() {
  const state = readPublishState();
  const changed = [];
  const counts = {};

  for (const [key, files] of Object.entries(MODULE_FILES)) {
    const checksum = fileChecksum(files.data);
    const prev = state[key]?.checksum;
    if (checksum && checksum !== prev) changed.push(key);

    if (key === 'news' && existsSync(files.data)) {
      counts.news = JSON.parse(readFileSync(files.data, 'utf-8')).length;
    } else if (key === 'banner' && existsSync(files.data)) {
      const banner = JSON.parse(readFileSync(files.data, 'utf-8'));
      const slides = banner.slides || [];
      counts.banner = slides.filter((s) => s.enabled !== false).length;
      counts.bannerTotal = slides.length;
    } else if (key === 'settings' && existsSync(files.data)) {
      counts.settings = true;
    }
  }

  return {
    publishing,
    changed,
    counts,
    hasDist: existsSync(resolve(ROOT, 'dist')),
    version: buildPublishVersion(state),
    settingsPublishedAt: state.settings?.publishedAt || null,
  };
}

/** @returns {boolean} */
export function isPublishing() {
  return publishing;
}

/**
 * @param {string[]} modules
 */
function createBackup(modules) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = resolve(BACKUP_DIR, stamp);
  mkdirSync(dir, { recursive: true });

  for (const mod of modules) {
    const files = MODULE_FILES[mod];
    if (existsSync(files.data)) copyFileSync(files.data, resolve(dir, `${mod}.json`));
    if (existsSync(files.js)) copyFileSync(files.js, resolve(dir, `${mod}-data.js`));
  }

  pruneBackups();
  return dir;
}

function pruneBackups() {
  if (!existsSync(BACKUP_DIR)) return;
  const dirs = readdirSync(BACKUP_DIR)
    .map((name) => resolve(BACKUP_DIR, name))
    .filter((path) => existsSync(path))
    .sort()
    .reverse();
  dirs.slice(MAX_BACKUPS).forEach((path) => {
    rmSync(path, { recursive: true, force: true });
  });
}

/**
 * @param {string} mod
 */
function syncModule(mod) {
  const script = SYNC_SCRIPTS[mod];
  if (!existsSync(script)) throw new Error(`同步脚本不存在: ${mod}`);
  execSync(`node "${script}"`, { stdio: 'pipe', cwd: ROOT });
}

/**
 * @param {string} mod
 */
function copyModuleToPublic(mod) {
  const files = MODULE_FILES[mod];
  if (!existsSync(files.data)) return;
  mkdirSync(PUBLIC_DATA, { recursive: true });
  copyFileSync(files.data, files.public);
}

/**
 * @param {string[]} modules
 */
function updateStateForModules(modules) {
  const state = readPublishState();
  const now = new Date().toISOString();
  for (const mod of modules) {
    state[mod] = {
      checksum: fileChecksum(MODULE_FILES[mod].data),
      publishedAt: now,
    };
  }
  writePublishState(state);
}

/**
 * @returns {{ ok: true }}
 */
function runBuild() {
  const output = execSync('npm run build', { stdio: 'pipe', cwd: ROOT, encoding: 'utf-8' });
  return { ok: true, log: output.slice(-500) };
}

/**
 * @param {string[]} modules
 * @param {{ build?: boolean }} [opts]
 */
export function publishModules(modules, opts = {}) {
  if (publishing) {
    throw new Error('发布进行中，请稍候');
  }

  const list = normalizeModules(modules);
  if (!list.length) throw new Error('未指定发布模块');

  publishing = true;
  try {
    const backupDir = createBackup(list);

    for (const mod of list) {
      if (!existsSync(MODULE_FILES[mod].data)) {
        throw new Error(`${MODULE_LABELS[mod]} 数据文件不存在`);
      }
      syncModule(mod);
      copyModuleToPublic(mod);
    }

    updateStateForModules(list);

    const stats = getPublishStats(list);
    /** @type {{ ok: boolean, error?: string, log?: string } | null} */
    let build = null;

    if (opts.build) {
      try {
        build = runBuild();
      } catch (err) {
        const msg = err.stderr?.toString?.() || err.stdout?.toString?.() || err.message || '构建失败';
        return {
          ok: true,
          partial: true,
          backupDir,
          modules: list,
          build: { ok: false, error: msg },
          message: `内容已同步，但静态站构建失败：${msg.slice(0, 200)}`,
          ...stats,
        };
      }
    }

    const labels = list.map((m) => MODULE_LABELS[m]).join('、');
    const buildNote = opts.build ? (build?.ok ? '，静态站已构建' : '') : '（未构建 dist，线上若使用静态包请单独执行构建）';

    return {
      ok: true,
      backupDir,
      modules: list,
      build,
      message: `已发布：${labels}${buildNote}`,
      ...stats,
    };
  } finally {
    publishing = false;
  }
}

/**
 * @param {string[]} modules
 */
function getPublishStats(modules) {
  const result = { articleCount: 0, slideCount: 0, slideTotal: 0 };

  if (modules.includes('news') && existsSync(MODULE_FILES.news.data)) {
    result.articleCount = JSON.parse(readFileSync(MODULE_FILES.news.data, 'utf-8')).length;
  }
  if (modules.includes('banner') && existsSync(MODULE_FILES.banner.data)) {
    const banner = JSON.parse(readFileSync(MODULE_FILES.banner.data, 'utf-8'));
    const slides = banner.slides || [];
    result.slideTotal = slides.length;
    result.slideCount = slides.filter((s) => s.enabled !== false).length;
  }

  return result;
}

/**
 * 仅构建静态站 dist
 */
export function buildDistOnly() {
  if (publishing) throw new Error('发布进行中，请稍候');
  publishing = true;
  try {
    const build = runBuild();
    return { ok: true, message: '静态站构建完成', build };
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.stdout?.toString?.() || err.message || '构建失败';
    throw new Error(`静态站构建失败：${msg.slice(0, 300)}`);
  } finally {
    publishing = false;
  }
}

export { MODULE_LABELS };

/**
 * @param {Record<string, { checksum: string | null, publishedAt: string | null }>} state
 */
function buildPublishVersion(state) {
  const checksum = String(state.settings?.checksum || '').slice(0, 8);
  const publishedAt = state.settings?.publishedAt;
  if (!checksum || !publishedAt) return null;
  const stamp = new Date(publishedAt).getTime();
  if (!Number.isFinite(stamp)) return null;
  return `v${stamp}-${checksum}`;
}
