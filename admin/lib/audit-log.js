/**
 * 操作日志（JSON 文件存储）
 */
import { randomBytes } from 'crypto';
import { readAuditLogs, writeAuditLogs } from './storage.js';

const MAX_LOGS = 1000;

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} username
 * @property {string} [userId]
 * @property {string} action
 * @property {string} detail
 * @property {string} [ip]
 */

/**
 * @param {{ username?: string, userId?: string, action: string, detail?: string, ip?: string }} entry
 * @returns {AuditLogEntry}
 */
export function appendAuditLog(entry) {
  const logs = readAuditLogs();
  const item = {
    id: `log-${Date.now()}-${randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    username: String(entry.username || 'system').trim() || 'system',
    userId: entry.userId || '',
    action: String(entry.action || '').trim(),
    detail: String(entry.detail || '').trim().slice(0, 500),
    ip: String(entry.ip || '').trim(),
  };

  logs.unshift(item);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  writeAuditLogs(logs);
  return item;
}

/**
 * @param {{ limit?: number, offset?: number, action?: string, username?: string }} [query]
 * @returns {{ items: AuditLogEntry[], total: number }}
 */
export function queryAuditLogs(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 200);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const action = String(query.action || '').trim();
  const username = String(query.username || '').trim();

  let logs = readAuditLogs();
  if (action) {
    logs = logs.filter((log) => log.action.includes(action));
  }
  if (username) {
    logs = logs.filter((log) => log.username.includes(username));
  }

  return {
    items: logs.slice(offset, offset + limit),
    total: logs.length,
  };
}

/**
 * @param {import('express').Request} req
 * @param {string} action
 * @param {string} [detail]
 */
export function auditFromRequest(req, action, detail = '') {
  return appendAuditLog({
    username: req.session?.user?.username,
    userId: req.session?.user?.id,
    action,
    detail,
    ip: req.ip,
  });
}
