/**
 * 账号管理模块
 */
import { paginateSlice, renderPaginationBar } from './admin-pagination.js';

/** @type {(sel: string) => Element | null} */
let $ = () => null;

/** @type {(url: string, opts?: RequestInit) => Promise<unknown>} */
let api = async () => ({});

/** @type {(msg: string) => void} */
let toast = () => {};

/** @type {{ id: string, username: string, role: string } | null} */
let currentUser = null;

/** @type {Array<Record<string, unknown>>} */
let users = [];

const ACCOUNTS_PAGE_SIZE = 10;

/** @type {number} */
let accountsPage = 1;

const ROLE_LABELS = {
  super: '超级管理员',
  admin: '管理员',
};

/**
 * @param {(sel: string) => Element | null} $
 * @param {(url: string, opts?: RequestInit) => Promise<unknown>} apiFn
 * @param {(msg: string) => void} toastFn
 * @param {{ id: string, username: string, role: string }} me
 */
export function initAccountsModule($fn, apiFn, toastFn, me) {
  $ = $fn;
  api = apiFn;
  toast = toastFn;
  currentUser = me;

  $('#account-form')?.addEventListener('submit', handleCreateUser);
  $('#btn-refresh-accounts')?.addEventListener('click', () => loadAccounts());
  $('#password-form')?.addEventListener('submit', handleChangePassword);
}

/**
 * @param {{ id: string, username: string, role: string }} me
 */
export function setCurrentUser(me) {
  currentUser = me;
}

export async function loadAccounts() {
  if (currentUser?.role !== 'super') return;
  users = /** @type {Array<Record<string, unknown>>} */ (await api('/api/users'));
  accountsPage = 1;
  renderAccountsTable();
}

function renderAccountsTable() {
  const tbody = $('#accounts-table-body');
  const paginationEl = $('#accounts-pagination');
  if (!tbody) return;

  const { items, page, totalPages, total } = paginateSlice(users, accountsPage, ACCOUNTS_PAGE_SIZE);
  accountsPage = page;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">暂无账号</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items
    .map((user) => {
      const id = String(user.id);
      const username = String(user.username);
      const role = String(user.role);
      const disabled = user.disabled === true;
      const isSelf = id === currentUser?.id;
      return `
      <tr>
        <td>${escapeHtml(username)}${isSelf ? ' <span class="tag tag--muted">当前</span>' : ''}</td>
        <td>${ROLE_LABELS[role] || role}</td>
        <td>${disabled ? '<span class="tag tag--warn">已禁用</span>' : '<span class="tag tag--ok">正常</span>'}</td>
        <td class="table-actions">
          <button type="button" class="btn btn--sm btn--outline" data-account-reset="${escapeAttr(id)}">重置密码</button>
          ${
            isSelf
              ? ''
              : `<button type="button" class="btn btn--sm btn--outline" data-account-toggle="${escapeAttr(id)}" data-disabled="${disabled ? '0' : '1'}">${disabled ? '启用' : '禁用'}</button>
                 <button type="button" class="btn btn--sm btn--danger" data-account-delete="${escapeAttr(id)}">删除</button>`
          }
        </td>
      </tr>`;
    })
    .join('');

  renderPaginationBar({
    container: paginationEl,
    page,
    totalPages,
    total,
    pageSize: ACCOUNTS_PAGE_SIZE,
    unit: '个账号',
    onPageChange: (next) => {
      accountsPage = next;
      renderAccountsTable();
    },
  });

  tbody.querySelectorAll('[data-account-reset]').forEach((btn) => {
    btn.addEventListener('click', () => resetUserPassword(btn.getAttribute('data-account-reset')));
  });
  tbody.querySelectorAll('[data-account-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleUser(btn.getAttribute('data-account-toggle'), btn.getAttribute('data-disabled') === '1'));
  });
  tbody.querySelectorAll('[data-account-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteAccount(btn.getAttribute('data-account-delete')));
  });
}

/**
 * @param {Event} e
 */
async function handleCreateUser(e) {
  e.preventDefault();
  const username = $('#account-username')?.value?.trim();
  const password = $('#account-password')?.value || '';
  const role = $('#account-role')?.value || 'admin';
  const err = $('#account-form-error');
  if (err) err.textContent = '';

  try {
    await api('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
    toast('账号已创建');
    $('#account-form')?.reset();
    await loadAccounts();
  } catch (error) {
    if (err) err.textContent = error.message;
  }
}

/**
 * @param {string | null} id
 */
async function resetUserPassword(id) {
  if (!id) return;
  const user = users.find((u) => u.id === id);
  const password = prompt(`为「${user?.username || id}」设置新密码（至少 6 位）`);
  if (!password) return;
  try {
    await api(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    toast('密码已重置');
    await loadAccounts();
  } catch (error) {
    toast(error.message);
  }
}

/**
 * @param {string | null} id
 * @param {boolean} disable
 */
async function toggleUser(id, disable) {
  if (!id) return;
  const user = users.find((u) => u.id === id);
  const action = disable ? '禁用' : '启用';
  if (!confirm(`确定${action}账号「${user?.username || id}」？`)) return;
  try {
    await api(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ disabled: disable }),
    });
    toast(`已${action}`);
    await loadAccounts();
  } catch (error) {
    toast(error.message);
  }
}

/**
 * @param {string | null} id
 */
async function deleteAccount(id) {
  if (!id) return;
  const user = users.find((u) => u.id === id);
  if (!confirm(`确定删除账号「${user?.username || id}」？此操作不可恢复。`)) return;
  try {
    await api(`/api/users/${id}`, { method: 'DELETE' });
    toast('账号已删除');
    await loadAccounts();
  } catch (error) {
    toast(error.message);
  }
}

/**
 * @param {Event} e
 */
async function handleChangePassword(e) {
  e.preventDefault();
  const oldPassword = $('#password-old')?.value || '';
  const newPassword = $('#password-new')?.value || '';
  const err = $('#password-form-error');
  if (err) err.textContent = '';

  try {
    await api('/api/account/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    toast('密码已修改');
    $('#password-form')?.reset();
  } catch (error) {
    if (err) err.textContent = error.message;
  }
}

/**
 * @param {string} str
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} str
 */
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}
