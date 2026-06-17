/**
 * 管理员账号初始化（兼容旧入口，实际逻辑在 users.js）
 */
export { ensureUsers as ensureAdminUser, validateUser, findUserById } from './users.js';

/**
 * @deprecated 请使用 users.js
 * @returns {null}
 */
export function getAdminConfig() {
  return null;
}
