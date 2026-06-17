/**
 * 管理账号读写与校验
 */
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { readUsers, writeUsers, readAdminConfig } from './storage.js';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'daodanyuan2026';
const SUPER_ROLE = 'super';
const ADMIN_ROLE = 'admin';

/**
 * @typedef {Object} AdminUser
 * @property {string} id
 * @property {string} username
 * @property {string} passwordHash
 * @property {'super' | 'admin'} role
 * @property {boolean} disabled
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @returns {AdminUser[]}
 */
export function listUsers() {
  return readUsers();
}

/**
 * 确保至少存在一个超级管理员，并从旧版 admin.json 迁移
 */
export function ensureUsers() {
  let users = readUsers();
  if (users.length > 0) {
    syncEnvSuperPassword(users);
    return users;
  }

  const legacy = readAdminConfig();
  const envUsername = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const password = envPassword || (legacy ? null : DEFAULT_PASSWORD);

  if (legacy) {
    users = [{
      id: 'user-admin',
      username: legacy.username || envUsername,
      passwordHash: legacy.passwordHash,
      role: SUPER_ROLE,
      disabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  } else {
    const plain = password || DEFAULT_PASSWORD;
    users = [createUserRecord(envUsername, plain, SUPER_ROLE)];
    logBootstrap(plain, true);
  }

  if (envPassword) {
    const superUser = users.find((u) => u.role === SUPER_ROLE) || users[0];
    if (superUser && !bcrypt.compareSync(envPassword, superUser.passwordHash)) {
      superUser.passwordHash = bcrypt.hashSync(envPassword, 12);
      superUser.updatedAt = new Date().toISOString();
    }
  }

  if (envUsername) {
    const superUser = users.find((u) => u.role === SUPER_ROLE) || users[0];
    if (superUser && superUser.username !== envUsername) {
      superUser.username = envUsername;
      superUser.updatedAt = new Date().toISOString();
    }
  }

  writeUsers(users);
  warnDefaultPassword(users);
  if (!legacy) logBootstrap(envPassword || null, false);
  return users;
}

/**
 * @param {AdminUser[]} users
 */
function syncEnvSuperPassword(users) {
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!envPassword) return;

  const superUser = users.find((u) => u.role === SUPER_ROLE && !u.disabled);
  if (!superUser || bcrypt.compareSync(envPassword, superUser.passwordHash)) return;

  superUser.passwordHash = bcrypt.hashSync(envPassword, 12);
  superUser.updatedAt = new Date().toISOString();
  writeUsers(users);
  console.log('[admin] 已根据 .env 中的 ADMIN_PASSWORD 更新超级管理员密码');
}

/**
 * @param {AdminUser[]} users
 */
function warnDefaultPassword(users) {
  if (process.env.NODE_ENV !== 'production' || process.env.ADMIN_PASSWORD) return;
  const superUser = users.find((u) => u.role === SUPER_ROLE);
  if (superUser && bcrypt.compareSync(DEFAULT_PASSWORD, superUser.passwordHash)) {
    console.error('[admin] 安全警告：生产环境仍在使用默认密码，请立即在 .env 中设置 ADMIN_PASSWORD');
  }
}

/**
 * @param {string | null} envPassword
 * @param {boolean} isNew
 */
function logBootstrap(envPassword, isNew) {
  if (envPassword) {
    console.log(`[admin] 超级管理员: ${process.env.ADMIN_USERNAME || DEFAULT_USERNAME}（密码来自 .env）`);
    return;
  }
  if (isNew) {
    console.warn(`[admin] 已创建超级管理员 ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}，请配置 .env 修改密码`);
    return;
  }
  console.log(`[admin] 超级管理员: ${DEFAULT_USERNAME}（默认密码 ${DEFAULT_PASSWORD}，或执行 npm run admin:reset）`);
}

/**
 * @param {string} username
 * @param {string} password
 * @param {'super' | 'admin'} role
 * @returns {AdminUser}
 */
function createUserRecord(username, password, role) {
  const now = new Date().toISOString();
  return {
    id: `user-${randomBytes(6).toString('hex')}`,
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 12),
    role,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {AdminUser | null}
 */
export async function validateUser(username, password) {
  const users = readUsers();
  const user = users.find((u) => u.username === username && !u.disabled);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

/**
 * @param {string} id
 * @returns {AdminUser | undefined}
 */
export function findUserById(id) {
  return readUsers().find((u) => u.id === id);
}

/**
 * @param {AdminUser} user
 * @returns {Record<string, unknown>}
 */
export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * @param {{ username: string, password: string, role?: string }} input
 * @returns {AdminUser}
 */
export function createUser(input) {
  const username = String(input.username || '').trim();
  const password = String(input.password || '');
  const role = input.role === SUPER_ROLE ? SUPER_ROLE : ADMIN_ROLE;

  if (!username || username.length < 2) {
    throw new Error('用户名至少 2 个字符');
  }
  if (!password || password.length < 6) {
    throw new Error('密码至少 6 位');
  }

  const users = readUsers();
  if (users.some((u) => u.username === username)) {
    throw new Error('用户名已存在');
  }

  const user = createUserRecord(username, password, role);
  users.push(user);
  writeUsers(users);
  return user;
}

/**
 * @param {string} id
 * @param {{ password?: string, disabled?: boolean, role?: string }} input
 * @param {string} operatorId
 * @returns {AdminUser}
 */
export function updateUser(id, input, operatorId) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error('账号不存在');

  const user = users[idx];

  if (input.disabled === true && user.id === operatorId) {
    throw new Error('不能禁用当前登录账号');
  }

  if (input.role === ADMIN_ROLE && user.role === SUPER_ROLE) {
    const superCount = users.filter((u) => u.role === SUPER_ROLE && !u.disabled).length;
    if (superCount <= 1) {
      throw new Error('至少保留一个可用的超级管理员');
    }
  }

  if (typeof input.disabled === 'boolean') {
    user.disabled = input.disabled;
  }

  if (input.role === SUPER_ROLE || input.role === ADMIN_ROLE) {
    user.role = input.role;
  }

  const password = String(input.password || '').trim();
  if (password) {
    if (password.length < 6) throw new Error('密码至少 6 位');
    user.passwordHash = bcrypt.hashSync(password, 12);
  }

  user.updatedAt = new Date().toISOString();
  users[idx] = user;
  writeUsers(users);
  return user;
}

/**
 * @param {string} id
 * @param {string} operatorId
 */
export function deleteUser(id, operatorId) {
  if (id === operatorId) {
    throw new Error('不能删除当前登录账号');
  }

  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('账号不存在');

  if (user.role === SUPER_ROLE) {
    const superCount = users.filter((u) => u.role === SUPER_ROLE && !u.disabled).length;
    if (superCount <= 1 && !user.disabled) {
      throw new Error('至少保留一个可用的超级管理员');
    }
  }

  writeUsers(users.filter((u) => u.id !== id));
}

/**
 * @param {string} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export function changePassword(userId, oldPassword, newPassword) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('账号不存在');
  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    throw new Error('原密码不正确');
  }
  if (String(newPassword).length < 6) {
    throw new Error('新密码至少 6 位');
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.updatedAt = new Date().toISOString();
  writeUsers(users);
}

/**
 * 重置超级管理员（供 CLI 使用）
 * @param {string} username
 * @param {string} password
 */
export function resetSuperAdmin(username, password) {
  let users = readUsers();
  const now = new Date().toISOString();

  if (!users.length) {
    users = [createUserRecord(username, password, SUPER_ROLE)];
    writeUsers(users);
    return users[0];
  }

  let superUser = users.find((u) => u.role === SUPER_ROLE);
  if (!superUser) {
    superUser = createUserRecord(username, password, SUPER_ROLE);
    users.push(superUser);
  } else {
    superUser.username = username;
    superUser.passwordHash = bcrypt.hashSync(password, 12);
    superUser.disabled = false;
    superUser.updatedAt = now;
  }

  writeUsers(users);
  return superUser;
}

export { SUPER_ROLE, ADMIN_ROLE };
