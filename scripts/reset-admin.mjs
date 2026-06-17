/**
 * 重置超级管理员密码
 * 用法：npm run admin:reset
 * 或：ADMIN_PASSWORD=新密码 npm run admin:reset
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resetSuperAdmin } from '../admin/lib/users.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'daodanyuan2026';

const user = resetSuperAdmin(username, password);

console.log(`[reset-admin] 已重置超级管理员：${user.username}`);
if (process.env.ADMIN_PASSWORD) {
  console.log('[reset-admin] 密码来自环境变量 ADMIN_PASSWORD');
} else {
  console.log(`[reset-admin] 默认密码：${password}`);
}
