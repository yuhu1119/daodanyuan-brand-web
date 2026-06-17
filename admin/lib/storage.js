/**
 * JSON 数据读写
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '../..');
const DATA_DIR = resolve(ROOT, 'data');

const NEWS_FILE = resolve(DATA_DIR, 'news.json');
const BANNER_FILE = resolve(DATA_DIR, 'banner.json');
const MESSAGES_FILE = resolve(DATA_DIR, 'messages.json');
const SETTINGS_FILE = resolve(DATA_DIR, 'settings.json');
const ADMIN_FILE = resolve(DATA_DIR, 'admin.json');
const USERS_FILE = resolve(DATA_DIR, 'users.json');
const AUDIT_LOG_FILE = resolve(DATA_DIR, 'audit-log.json');

/**
 * @template T
 * @param {string} file
 * @param {T} fallback
 * @returns {T}
 */
function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

/**
 * @param {string} file
 * @param {unknown} data
 */
function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

/** @returns {import('../types.js').NewsArticle[]} */
export function readNews() {
  return readJson(NEWS_FILE, []);
}

/**
 * @param {import('../types.js').NewsArticle[]} articles
 */
export function writeNews(articles) {
  writeJson(NEWS_FILE, articles);
}

/** @returns {import('../types.js').AdminConfig | null} */
export function readAdminConfig() {
  return readJson(ADMIN_FILE, null);
}

/**
 * @param {import('../types.js').AdminConfig} config
 */
export function writeAdminConfig(config) {
  writeJson(ADMIN_FILE, config);
}

/** @returns {{ slides: import('../types.js').BannerSlide[] }} */
export function readBanner() {
  return readJson(BANNER_FILE, { slides: [] });
}

/**
 * @param {{ slides: import('../types.js').BannerSlide[] }} banner
 */
export function writeBanner(banner) {
  writeJson(BANNER_FILE, banner);
}

/** @returns {import('../types.js').ContactMessage[]} */
export function readMessages() {
  return readJson(MESSAGES_FILE, []);
}

/**
 * @param {import('../types.js').ContactMessage[]} messages
 */
export function writeMessages(messages) {
  writeJson(MESSAGES_FILE, messages);
}

/** @returns {import('../types.js').SiteSettings} */
export function readSettings() {
  return readJson(SETTINGS_FILE, null);
}

/**
 * @param {import('../types.js').SiteSettings} settings
 */
export function writeSettings(settings) {
  writeJson(SETTINGS_FILE, settings);
}

/** @returns {import('../types.js').AdminUser[]} */
export function readUsers() {
  return readJson(USERS_FILE, []);
}

/**
 * @param {import('../types.js').AdminUser[]} users
 */
export function writeUsers(users) {
  writeJson(USERS_FILE, users);
}

/** @returns {import('../types.js').AuditLogEntry[]} */
export function readAuditLogs() {
  return readJson(AUDIT_LOG_FILE, []);
}

/**
 * @param {import('../types.js').AuditLogEntry[]} logs
 */
export function writeAuditLogs(logs) {
  writeJson(AUDIT_LOG_FILE, logs);
}
