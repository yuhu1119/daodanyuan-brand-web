/**
 * 操作日志模块
 */
import { renderPaginationBar } from './admin-pagination.js';

/** @type {(sel: string) => Element | null} */
let $ = () => null;

/** @type {(url: string, opts?: RequestInit) => Promise<unknown>} */
let api = async () => ({});

const LOGS_PAGE_SIZE = 20;

/** @type {number} */
let logsPage = 1;

const ACTION_LABELS = {
  'login.success': '登录成功',
  'login.failed': '登录失败',
  logout: '退出登录',
  'user.create': '创建账号',
  'user.update': '更新账号',
  'user.delete': '删除账号',
  'account.password': '修改密码',
  'news.create': '创建新闻',
  'news.update': '更新新闻',
  'news.delete': '删除新闻',
  'banner.create': '创建 Banner',
  'banner.update': '更新 Banner',
  'banner.delete': '删除 Banner',
  'banner.status': 'Banner 上下线',
  'banner.move': 'Banner 排序',
  'message.status': '留言状态',
  'message.delete': '删除留言',
  'message.export': '导出留言',
  'contact.create': '前台留言',
  'settings.update': '更新网站设置',
  publish: '发布内容',
  'publish.build': '构建静态站',
  upload: '上传图片',
};

/**
 * @param {(sel: string) => Element | null} $
 * @param {(url: string, opts?: RequestInit) => Promise<unknown>} apiFn
 */
export function initLogsModule($fn, apiFn) {
  $ = $fn;
  api = apiFn;

  $('#btn-refresh-logs')?.addEventListener('click', () => loadLogs());
  $('#btn-filter-logs')?.addEventListener('click', () => {
    logsPage = 1;
    loadLogs();
  });
  $('#btn-filter-logs-reset')?.addEventListener('click', () => {
    $('#log-filter-action').value = '';
    $('#log-filter-user').value = '';
    logsPage = 1;
    loadLogs();
  });
}

export async function loadLogs() {
  const action = $('#log-filter-action')?.value?.trim() || '';
  const username = $('#log-filter-user')?.value?.trim() || '';
  const offset = (logsPage - 1) * LOGS_PAGE_SIZE;
  const params = new URLSearchParams({
    limit: String(LOGS_PAGE_SIZE),
    offset: String(offset),
  });
  if (action) params.set('action', action);
  if (username) params.set('username', username);

  const data = /** @type {{ items: Array<Record<string, unknown>>, total: number }} */ (
    await api(`/api/logs?${params}`)
  );
  const totalPages = Math.max(1, Math.ceil(data.total / LOGS_PAGE_SIZE));
  if (logsPage > totalPages) {
    logsPage = totalPages;
    if (offset > 0) {
      await loadLogs();
      return;
    }
  }
  renderLogsTable(data.items, data.total);
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {number} total
 */
function renderLogsTable(items, total) {
  const tbody = $('#logs-table-body');
  const summary = $('#logs-summary');
  const paginationEl = $('#logs-pagination');
  const totalPages = Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE));

  if (summary) {
    summary.textContent = total
      ? `共 ${total} 条记录，当前第 ${logsPage}/${totalPages} 页`
      : '暂无日志记录';
  }
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">暂无日志</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items
    .map((log) => {
      const action = String(log.action || '');
      return `
      <tr>
        <td>${formatTime(String(log.timestamp || ''))}</td>
        <td>${escapeHtml(String(log.username || ''))}</td>
        <td>${escapeHtml(ACTION_LABELS[action] || action)}</td>
        <td>${escapeHtml(String(log.detail || ''))}</td>
        <td>${escapeHtml(String(log.ip || ''))}</td>
      </tr>`;
    })
    .join('');

  renderPaginationBar({
    container: paginationEl,
    page: logsPage,
    totalPages,
    total,
    pageSize: LOGS_PAGE_SIZE,
    onPageChange: (next) => {
      logsPage = next;
      loadLogs();
    },
  });
}

/**
 * @param {string} iso
 */
function formatTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { hour12: false });
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
