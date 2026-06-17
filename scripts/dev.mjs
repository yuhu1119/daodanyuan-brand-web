/**
 * 同时启动 CMS 后台与 Vite 前台开发服
 */
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} label
 */
function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[dev:all] ${label} 已退出 (code ${code})`);
      process.exit(code);
    }
  });
  return child;
}

const admin = run('node', ['admin/server.js'], 'admin');
const vite = run('npx', ['vite'], 'vite');

console.log('[dev:all] 前台 http://localhost:5173');
console.log('[dev:all] 后台 http://localhost:5173/admin （或 http://localhost:3000/admin）');

function shutdown() {
  admin.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
