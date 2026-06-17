/**
 * 道丹元 CMS 管理端
 */
import { loadSettings, loadStats, switchSettingsTab, initSettingsModule, hasUnsavedSettingsChanges } from './admin-settings.js';
import { initAccountsModule, loadAccounts, setCurrentUser } from './admin-accounts.js';
import { initLogsModule, loadLogs } from './admin-logs.js';
import { todayDateLocal } from './admin-date.js';
import { paginateSlice, renderPaginationBar } from './admin-pagination.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const CATEGORIES = {
  company: '企业新闻',
  event: '品牌活动',
  industry: '行业资讯',
  media: '媒体报道',
};

const CONTACT_TYPES = {
  product: '产品咨询',
  business: '商务合作',
  dealer: '经销商加盟',
  group: '企业团购',
  restaurant: '餐饮合作',
  media: '媒体采访',
  other: '其他',
};

const MESSAGE_STATUS = {
  pending: '待处理',
  read: '已读',
  done: '已处理',
};

let articles = [];
let blocks = [];
let bannerSlides = [];
let bannerButtons = [];
let messages = [];
let currentUser = null;
let isNewArticle = false;
let isNewBanner = false;

/** @type {number} */
let newsListPage = 1;
/** @type {number} */
let bannerListPage = 1;
/** @type {number} */
let messagesListPage = 1;

const LIST_PAGE_SIZE = 10;

/** @param {string} url @param {RequestInit} [opts] */
async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 404 ? '接口不存在，请重启后台服务（npm run admin）' : `请求失败 (${res.status})`;
    throw new Error(data.error || fallback);
  }
  return data;
}

/** @param {string} msg */
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function showLogin() {
  $('#login-view').classList.remove('hidden');
  $('#dashboard-view').classList.add('hidden');
}

function showDashboard() {
  $('#login-view').classList.add('hidden');
  $('#dashboard-view').classList.remove('hidden');
}

function updateUserLabel() {
  if (!currentUser) return;
  const roleLabel = currentUser.role === 'super' ? '超级管理员' : '管理员';
  $('#user-label').textContent = `${currentUser.username}（${roleLabel}）`;
}

function applySuperNav() {
  const isSuper = currentUser?.role === 'super';
  document.querySelectorAll('.sidebar__item--super').forEach((el) => {
    el.classList.toggle('hidden', !isSuper);
  });
}

async function bootstrapDashboard() {
  updateUserLabel();
  applySuperNav();
  setCurrentUser(currentUser);
  await Promise.all([loadNews(), loadBanner(), loadMessages(), loadSettings($, api)]);
  if (currentUser?.role === 'super') {
    await loadAccounts();
  }
}

function switchPanel(name) {
  $('#panel-banner-list').classList.toggle('hidden', name !== 'banner-list');
  $('#panel-banner-edit').classList.toggle('hidden', name !== 'banner-edit');
  $('#panel-list').classList.toggle('hidden', name !== 'list');
  $('#panel-edit').classList.toggle('hidden', name !== 'edit');
  $('#panel-messages').classList.toggle('hidden', name !== 'messages');
  $('#panel-settings').classList.toggle('hidden', name !== 'settings');
  $('#panel-accounts').classList.toggle('hidden', name !== 'accounts');
  $('#panel-logs').classList.toggle('hidden', name !== 'logs');

  const sidebarMap = { 'banner-edit': 'banner-list', edit: 'list' };
  const active = sidebarMap[name] || name;
  $$('.sidebar__item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === active);
  });
}

/** @param {object[]} list */
function renderTable(list) {
  const tbody = $('#news-table-body');
  const paginationEl = $('#news-pagination');
  const { items, page, totalPages, total } = paginateSlice(list, newsListPage, LIST_PAGE_SIZE);
  newsListPage = page;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999">暂无文章</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items
    .map(
      (a) => `
    <tr>
      <td>${escapeHtml(a.title)}</td>
      <td>${a.date}</td>
      <td>${CATEGORIES[a.category] || a.category}</td>
      <td>${a.link ? '<span class="badge badge--link">外链</span>' : '<span class="badge">详情</span>'}</td>
      <td>
        <button type="button" class="btn btn--sm btn--outline" data-edit="${a.id}">编辑</button>
        <button type="button" class="btn btn--sm btn--danger" data-del="${a.id}">删除</button>
      </td>
    </tr>`
    )
    .join('');

  renderPaginationBar({
    container: paginationEl,
    page,
    totalPages,
    total,
    pageSize: LIST_PAGE_SIZE,
    onPageChange: (next) => {
      newsListPage = next;
      renderTable(list);
    },
  });

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.edit));
  });
  tbody.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteArticle(btn.dataset.del));
  });
}

/** @param {string} str */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {string} plain */
function textToHtml(plain) {
  return plain
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** @param {string} html */
function htmlToPlain(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function renderBlocks() {
  const container = $('#blocks-container');
  container.innerHTML = blocks
    .map((block, i) => {
      const typeLabel = { text: '文字', image: '图片', video: '视频' }[block.type];
      if (block.type === 'text') {
        return `
        <div class="block-card" data-index="${i}">
          <div class="block-card__head">
            <span class="block-card__type">${typeLabel}</span>
            <button type="button" class="btn btn--sm btn--danger" data-remove="${i}">删除</button>
          </div>
          <label class="field">
            <span>正文（段落之间空一行）</span>
            <textarea rows="6" data-field="html">${escapeHtml(htmlToPlain(block.html || ''))}</textarea>
          </label>
        </div>`;
      }
      if (block.type === 'image') {
        return `
        <div class="block-card" data-index="${i}">
          <div class="block-card__head">
            <span class="block-card__type">${typeLabel}</span>
            <button type="button" class="btn btn--sm btn--danger" data-remove="${i}">删除</button>
          </div>
          <label class="field"><span>图片 URL</span><input type="text" data-field="src" value="${escapeAttr(block.src || '')}"></label>
          <label class="field"><span>替代文字</span><input type="text" data-field="alt" value="${escapeAttr(block.alt || '')}"></label>
          <label class="field"><span>图片说明</span><input type="text" data-field="caption" value="${escapeAttr(block.caption || '')}"></label>
        </div>`;
      }
      return `
        <div class="block-card" data-index="${i}">
          <div class="block-card__head">
            <span class="block-card__type">${typeLabel}</span>
            <button type="button" class="btn btn--sm btn--danger" data-remove="${i}">删除</button>
          </div>
          <label class="field"><span>视频 URL（mp4）</span><input type="text" data-field="src" value="${escapeAttr(block.src || '')}"></label>
          <label class="field"><span>封面图 URL</span><input type="text" data-field="poster" value="${escapeAttr(block.poster || '')}"></label>
          <label class="field"><span>视频说明</span><input type="text" data-field="caption" value="${escapeAttr(block.caption || '')}"></label>
        </div>`;
    })
    .join('');

  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      blocks.splice(Number(btn.dataset.remove), 1);
      renderBlocks();
    });
  });
}

/** @param {string} s */
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** 切换新闻展示方式表单 */
function toggleContentTypeUI() {
  const isLink = $('#field-content-type').value === 'link';
  $('#field-link-wrap').classList.toggle('hidden', !isLink);
  $('#field-link-target-wrap').classList.toggle('hidden', !isLink);
  $('#blocks-section').classList.toggle('hidden', isLink);
}

function defaultBannerButtons() {
  return [
    { text: '', url: '', style: 'accent' },
    { text: '', url: '', style: 'outline-light' },
  ];
}

/** @param {object[]} list */
function renderBannerTable(list) {
  const tbody = $('#banner-table-body');
  const paginationEl = $('#banner-pagination');
  const { items, page, totalPages, total } = paginateSlice(list, bannerListPage, LIST_PAGE_SIZE);
  bannerListPage = page;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999">暂无 Banner</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items
    .map(
      (slide) => {
        const globalIndex = list.findIndex((item) => item.id === slide.id);
        return `
    <tr>
      <td>${slide.image ? `<img class="table-thumb" src="${escapeAttr(slide.image)}" alt="">` : '—'}</td>
      <td>${escapeHtml(slide.title || '—')}</td>
      <td>${escapeHtml(slide.tag || '—')}</td>
      <td>${slide.enabled !== false ? '<span class="badge">已上线</span>' : '<span class="badge badge--offline">已下线</span>'}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="btn btn--sm btn--outline" data-banner-edit="${slide.id}">编辑</button>
          <button type="button" class="btn btn--sm btn--outline" data-banner-toggle="${slide.id}">${slide.enabled !== false ? '下线' : '上线'}</button>
          <button type="button" class="btn btn--sm btn--outline" data-banner-up="${slide.id}" ${globalIndex <= 0 ? 'disabled' : ''}>上移</button>
          <button type="button" class="btn btn--sm btn--outline" data-banner-down="${slide.id}" ${globalIndex >= list.length - 1 ? 'disabled' : ''}>下移</button>
          <button type="button" class="btn btn--sm btn--danger" data-banner-del="${slide.id}">删除</button>
        </div>
      </td>
    </tr>`;
      }
    )
    .join('');

  renderPaginationBar({
    container: paginationEl,
    page,
    totalPages,
    total,
    pageSize: LIST_PAGE_SIZE,
    onPageChange: (next) => {
      bannerListPage = next;
      renderBannerTable(list);
    },
  });

  tbody.querySelectorAll('[data-banner-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openBannerEditor(btn.dataset.bannerEdit));
  });
  tbody.querySelectorAll('[data-banner-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleBannerStatus(btn.dataset.bannerToggle));
  });
  tbody.querySelectorAll('[data-banner-up]').forEach((btn) => {
    btn.addEventListener('click', () => moveBanner(btn.dataset.bannerUp, 'up'));
  });
  tbody.querySelectorAll('[data-banner-down]').forEach((btn) => {
    btn.addEventListener('click', () => moveBanner(btn.dataset.bannerDown, 'down'));
  });
  tbody.querySelectorAll('[data-banner-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteBanner(btn.dataset.bannerDel));
  });
}

function renderBannerButtons() {
  const container = $('#banner-buttons-container');
  container.innerHTML = [0, 1]
    .map(
      (btnIndex) => `
    <div class="block-card">
      <div class="block-card__head">
        <span class="block-card__type">按钮 ${btnIndex + 1}</span>
      </div>
      <div class="slide-card__grid">
        <label class="field"><span>文字</span><input type="text" data-banner-btn="text" data-banner-btn-index="${btnIndex}" value="${escapeAttr(bannerButtons[btnIndex]?.text || '')}"></label>
        <label class="field"><span>链接</span><input type="text" data-banner-btn="url" data-banner-btn-index="${btnIndex}" value="${escapeAttr(bannerButtons[btnIndex]?.url || '')}"></label>
        <label class="field"><span>样式</span>
          <select data-banner-btn="style" data-banner-btn-index="${btnIndex}">
            <option value="accent" ${bannerButtons[btnIndex]?.style !== 'outline-light' ? 'selected' : ''}>强调色</option>
            <option value="outline-light" ${bannerButtons[btnIndex]?.style === 'outline-light' ? 'selected' : ''}>描边浅色</option>
          </select>
        </label>
      </div>
    </div>`
    )
    .join('');
}

function collectBannerButtonsFromDom() {
  return [0, 1]
    .map((btnIndex) => {
      const text = $(`[data-banner-btn="text"][data-banner-btn-index="${btnIndex}"]`)?.value?.trim() || '';
      const url = $(`[data-banner-btn="url"][data-banner-btn-index="${btnIndex}"]`)?.value?.trim() || '';
      const style = $(`[data-banner-btn="style"][data-banner-btn-index="${btnIndex}"]`)?.value || 'accent';
      return { text, url, style };
    })
    .filter((btn) => btn.text && btn.url);
}

/** @param {string} [id] */
function openBannerEditor(id) {
  isNewBanner = !id;
  const slide = id ? bannerSlides.find((s) => s.id === id) : null;

  $('#banner-edit-title').textContent = slide ? '编辑 Banner' : '新建 Banner';
  $('#banner-original-id').value = slide?.id || '';
  $('#banner-field-id').value = slide?.id || '';
  $('#banner-field-id').readOnly = !!slide;
  $('#banner-field-image').value = slide?.image || '/images/brand/hero-1.jpg';
  $('#banner-field-tag').value = slide?.tag || '';
  $('#banner-field-title').value = slide?.title || '';
  $('#banner-field-subtitle').value = slide?.subtitle || '';
  bannerButtons = slide?.buttons?.length
    ? JSON.parse(JSON.stringify(slide.buttons))
    : defaultBannerButtons();
  while (bannerButtons.length < 2) bannerButtons.push({ text: '', url: '', style: 'outline-light' });
  renderBannerButtons();
  $('#banner-form-error').textContent = '';
  switchPanel('banner-edit');
}

/** @param {string} id */
async function deleteBanner(id) {
  if (!confirm('确定删除这条 Banner？')) return;
  await api(`/api/banner/${id}`, { method: 'DELETE' });
  toast('已删除');
  await loadBanner();
}

/** @param {string} id */
async function toggleBannerStatus(id) {
  const slide = bannerSlides.find((s) => s.id === id);
  if (!slide) return;
  const enabled = slide.enabled === false;
  await api(`/api/banner/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
  toast(enabled ? '已上线' : '已下线');
  await loadBanner();
}

/**
 * @param {string} id
 * @param {'up' | 'down'} direction
 */
async function moveBanner(id, direction) {
  await api(`/api/banner/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
  await loadBanner();
}

async function loadBanner() {
  const data = await api('/api/banner');
  bannerSlides = data.slides || [];
  renderBannerTable(bannerSlides);
}

/** @param {string} iso */
function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/**
 * @param {string} status
 * @returns {string}
 */
function renderMessageStatusBadge(status) {
  if (status === 'done') return '<span class="badge">已处理</span>';
  if (status === 'read') return '<span class="badge badge--link">已读</span>';
  return '<span class="badge badge--offline">待处理</span>';
}

/** @param {object[]} list */
function renderMessagesTable(list) {
  const tbody = $('#messages-table-body');
  const paginationEl = $('#messages-pagination');
  const { items, page, totalPages, total } = paginateSlice(list, messagesListPage, LIST_PAGE_SIZE);
  messagesListPage = page;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999">暂无留言</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items
    .map(
      (m) => `
    <tr>
      <td>${formatDateTime(m.createdAt)}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.phone)}</td>
      <td>${CONTACT_TYPES[m.type] || m.type}</td>
      <td>${renderMessageStatusBadge(m.status)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="btn btn--sm btn--outline" data-msg-view="${m.id}">查看</button>
          ${m.status !== 'read' ? `<button type="button" class="btn btn--sm btn--outline" data-msg-read="${m.id}">标为已读</button>` : ''}
          ${m.status !== 'done' ? `<button type="button" class="btn btn--sm btn--outline" data-msg-done="${m.id}">标为已处理</button>` : ''}
          <button type="button" class="btn btn--sm btn--danger" data-msg-del="${m.id}">删除</button>
        </div>
      </td>
    </tr>`
    )
    .join('');

  renderPaginationBar({
    container: paginationEl,
    page,
    totalPages,
    total,
    pageSize: LIST_PAGE_SIZE,
    onPageChange: (next) => {
      messagesListPage = next;
      renderMessagesTable(list);
    },
  });

  tbody.querySelectorAll('[data-msg-view]').forEach((btn) => {
    btn.addEventListener('click', () => showMessageDetail(btn.dataset.msgView));
  });
  tbody.querySelectorAll('[data-msg-read]').forEach((btn) => {
    btn.addEventListener('click', () => updateMessageStatus(btn.dataset.msgRead, 'read'));
  });
  tbody.querySelectorAll('[data-msg-done]').forEach((btn) => {
    btn.addEventListener('click', () => updateMessageStatus(btn.dataset.msgDone, 'done'));
  });
  tbody.querySelectorAll('[data-msg-del]').forEach((btn) => {
    btn.addEventListener('click', () => deleteMessage(btn.dataset.msgDel));
  });
}

async function loadMessages() {
  const from = $('#filter-msg-from')?.value || '';
  const to = $('#filter-msg-to')?.value || '';
  if (from && to && from > to) {
    toast('开始日期不能晚于结束日期');
    return;
  }
  const qs = getMessageFilterQuery();
  messages = await api(`/api/messages${qs ? `?${qs}` : ''}`);
  messagesListPage = 1;
  renderMessagesTable(messages);
  const countEl = $('#messages-count');
  if (countEl) {
    countEl.textContent = messages.length ? `共 ${messages.length} 条留言（当前筛选结果）` : '当前筛选条件下暂无留言';
  }
}

/**
 * @returns {string}
 */
function getMessageFilterQuery() {
  const type = $('#filter-msg-type')?.value || 'all';
  const status = $('#filter-msg-status')?.value || 'all';
  const from = $('#filter-msg-from')?.value || '';
  const to = $('#filter-msg-to')?.value || '';
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);
  if (status !== 'all') params.set('status', status);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.toString();
}

function resetMessageFilters() {
  const typeEl = $('#filter-msg-type');
  const statusEl = $('#filter-msg-status');
  const fromEl = $('#filter-msg-from');
  const toEl = $('#filter-msg-to');
  if (typeEl) typeEl.value = 'all';
  if (statusEl) statusEl.value = 'all';
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';
  loadMessages();
}

async function exportMessages() {
  const from = $('#filter-msg-from')?.value || '';
  const to = $('#filter-msg-to')?.value || '';
  if (from && to && from > to) {
    throw new Error('开始日期不能晚于结束日期');
  }
  const qs = getMessageFilterQuery();
  const res = await fetch(`/api/export/messages${qs ? `?${qs}` : ''}`, { credentials: 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const fallback = res.status === 404 ? '导出接口不存在，请重启后台服务' : `导出失败 (${res.status})`;
    throw new Error(data.error || fallback);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `messages-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast(`已导出 ${messages.length} 条留言`);
}

/** @param {string} id */
function showMessageDetail(id) {
  const m = messages.find((item) => item.id === id);
  if (!m) return;

  $('#message-modal-body').innerHTML = `
    <div class="detail-list">
      <div class="detail-list__item"><span class="detail-list__label">提交时间</span><span>${formatDateTime(m.createdAt)}</span></div>
      <div class="detail-list__item"><span class="detail-list__label">姓名</span><span>${escapeHtml(m.name)}</span></div>
      <div class="detail-list__item"><span class="detail-list__label">电话</span><span>${escapeHtml(m.phone)}</span></div>
      <div class="detail-list__item"><span class="detail-list__label">邮箱</span><span>${escapeHtml(m.email || '—')}</span></div>
      <div class="detail-list__item"><span class="detail-list__label">咨询类型</span><span>${CONTACT_TYPES[m.type] || m.type}</span></div>
      <div class="detail-list__item"><span class="detail-list__label">状态</span><span>${MESSAGE_STATUS[m.status] || m.status}</span></div>
    </div>
    <div class="detail-list__message">${escapeHtml(m.message)}</div>
  `;
  $('#message-modal').classList.remove('hidden');

  if (m.status === 'pending') {
    updateMessageStatus(id, 'read', false);
  }
}

function closeMessageModal() {
  $('#message-modal').classList.add('hidden');
}

/**
 * @param {string} id
 * @param {'pending'|'read'|'done'} status
 * @param {boolean} [reload=true]
 */
async function updateMessageStatus(id, status, reload = true) {
  await api(`/api/messages/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (reload) {
    toast(status === 'done' ? '已标为已处理' : status === 'read' ? '已标为已读' : '已更新');
    await loadMessages();
  } else {
    const item = messages.find((m) => m.id === id);
    if (item) item.status = status;
    renderMessagesTable(messages);
  }
}

/** @param {string} id */
async function deleteMessage(id) {
  if (!confirm('确定删除这条留言？')) return;
  await api(`/api/messages/${id}`, { method: 'DELETE' });
  toast('已删除');
  await loadMessages();
}

function collectBlocksFromDom() {
  return [...$$('#blocks-container .block-card')].map((card) => {
    const type = blocks[Number(card.dataset.index)]?.type || 'text';
    if (type === 'text') {
      const ta = card.querySelector('textarea[data-field="html"]');
      return { type: 'text', html: textToHtml(ta?.value || '') };
    }
    if (type === 'image') {
      return {
        type: 'image',
        src: card.querySelector('[data-field="src"]')?.value || '',
        alt: card.querySelector('[data-field="alt"]')?.value || '',
        caption: card.querySelector('[data-field="caption"]')?.value || '',
      };
    }
    return {
      type: 'video',
      src: card.querySelector('[data-field="src"]')?.value || '',
      poster: card.querySelector('[data-field="poster"]')?.value || '',
      caption: card.querySelector('[data-field="caption"]')?.value || '',
    };
  });
}

/** @param {string} [id] */
function openEditor(id) {
  isNewArticle = !id;
  const article = id ? articles.find((a) => a.id === id) : null;

  $('#edit-title-label').textContent = article ? '编辑文章' : '新建文章';
  $('#original-id').value = article?.id || '';
  $('#field-id').value = article?.id || '';
  $('#field-id').readOnly = !!article;
  $('#field-date').value = isNewArticle ? todayDateLocal() : (article?.date || todayDateLocal());
  $('#field-category').value = article?.category || 'company';
  $('#field-title').value = article?.title || '';
  $('#field-excerpt').value = article?.excerpt || '';
  $('#field-cover').value = article?.cover || '/images/brand/news-1.jpg';
  const hasLink = !!article?.link;
  $('#field-content-type').value = hasLink ? 'link' : 'detail';
  $('#field-link').value = article?.link || '';
  $('#field-link-target').value = article?.linkTarget || '_blank';
  blocks = hasLink
    ? []
    : article?.blocks?.length
      ? JSON.parse(JSON.stringify(article.blocks))
      : [{ type: 'text', html: '<p></p>' }];
  toggleContentTypeUI();
  renderBlocks();
  $('#form-error').textContent = '';
  switchPanel('edit');
}

/** @param {string} id */
async function deleteArticle(id) {
  if (!confirm('确定删除这篇文章？')) return;
  await api(`/api/news/${id}`, { method: 'DELETE' });
  toast('已删除');
  await loadNews();
}

async function loadNews() {
  articles = await api('/api/news');
  newsListPage = 1;
  renderTable(articles);
}

/** @param {File} file */
async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '上传失败');
  return data.url;
}

async function init() {
  try {
    currentUser = await api('/api/me');
    showDashboard();
    try {
      await bootstrapDashboard();
    } catch (err) {
      console.error(err);
      toast(err.message || '部分数据加载失败，请刷新重试');
    }
  } catch {
    showLogin();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    $('#login-error').textContent = '';
    try {
      const result = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: fd.get('username'),
          password: fd.get('password'),
        }),
      });
      currentUser = {
        id: '',
        username: result.username,
        role: result.role || 'admin',
      };
      const me = await api('/api/me');
      currentUser = me;
      showDashboard();
      try {
        await bootstrapDashboard();
      } catch (err) {
        console.error(err);
        toast(err.message || '部分数据加载失败，请刷新重试');
      }
    } catch (err) {
      $('#login-error').textContent = err.message;
    }
  });

  $('#btn-logout').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    currentUser = null;
    showLogin();
  });

  initAccountsModule($, api, toast, currentUser);
  initLogsModule($, api);

  /** @type {boolean} */
  let publishLocked = false;

  const PUBLISH_LABELS = {
    news: '新闻',
    banner: 'Banner',
    settings: '网站设置',
  };

  /**
   * @param {boolean} locked
   */
  function setPublishLock(locked) {
    publishLocked = locked;
    const toggle = $('#btn-publish-toggle');
    toggle.disabled = locked;
    toggle.classList.toggle('is-publishing', locked);
    toggle.textContent = locked ? '发布中…' : '发布到官网 ▾';
    $$('.publish-dropdown__item').forEach((btn) => {
      btn.disabled = locked;
    });
  }

  /**
   * @returns {Promise<{ changed: string[], counts: Record<string, unknown>, hasDist: boolean, version?: string | null, settingsPublishedAt?: string | null }>}
   */
  async function fetchPublishPreview() {
    return api('/api/publish/preview');
  }

  /**
   * @param {string[]} modules
   * @param {{ counts: Record<string, unknown>, hasDist: boolean }} preview
   */
  function buildConfirmMessage(modules, preview) {
    const lines = [];
    if (preview.version) {
      lines.push(`当前线上配置版本：${preview.version}`);
      if (preview.settingsPublishedAt) {
        lines.push(`最近设置发布时间：${new Date(preview.settingsPublishedAt).toLocaleString('zh-CN', { hour12: false })}`);
      }
      lines.push('');
    }
    if (modules.includes('news')) {
      lines.push(`· 新闻：${preview.counts.news ?? 0} 条`);
    }
    if (modules.includes('banner')) {
      const on = preview.counts.banner ?? 0;
      const total = preview.counts.bannerTotal ?? on;
      lines.push(`· Banner：已上线 ${on} / 共 ${total} 张`);
    }
    if (modules.includes('settings')) {
      lines.push('· 网站设置：SEO、联系信息、页脚等');
    }
    const changed = modules.filter((m) => preview.changed.includes(m));
    if (changed.length) {
      lines.push(`\n待同步变更：${changed.map((m) => PUBLISH_LABELS[m]).join('、')}`);
    } else if (modules.length) {
      lines.push('\n（与上次发布内容一致，仍将重新同步）');
    }
    if (preview.hasDist) {
      lines.push('\n提示：线上使用 dist 静态包时，需执行「构建静态站」后变更才会生效。');
    }
    return lines.join('\n');
  }

  /**
   * @param {string} action
   */
  async function handlePublishAction(action) {
    if (publishLocked) return;
    $('#publish-menu').classList.add('hidden');

    let modules = [];
    let build = false;
    let title = '';

    if (action === 'build') {
      if (hasUnsavedSettingsChanges()) {
        toast('网站设置有未保存的修改，请先点击「保存设置」再构建');
        return;
      }
      title = '构建静态站';
      if (!confirm('将执行 npm run build 生成 dist 静态包，可能需数十秒，继续？')) return;
      setPublishLock(true);
      try {
        const res = await api('/api/publish/build', { method: 'POST' });
        toast(res.message || '构建完成');
      } catch (err) {
        toast(err.message);
      } finally {
        setPublishLock(false);
      }
      return;
    }

    if (action === 'all-build') {
      modules = ['all'];
      build = true;
      title = '全部发布并构建';
    } else if (action === 'all') {
      modules = ['all'];
      title = '全部发布';
    } else {
      modules = [action];
      title = `发布${PUBLISH_LABELS[action] || action}`;
    }

    const includesSettings =
      action === 'settings' || action === 'all' || action === 'all-build';

    if (includesSettings && hasUnsavedSettingsChanges()) {
      toast('网站设置有未保存的修改，请先点击「保存设置」再发布');
      return;
    }

    let preview;
    try {
      preview = await fetchPublishPreview();
    } catch (err) {
      toast(err.message);
      return;
    }

    const normModules = action === 'all' || action === 'all-build'
      ? ['news', 'banner', 'settings']
      : modules;

    const verEl = $('#publish-version');
    if (verEl && preview.version) {
      verEl.textContent = `版本 ${preview.version}`;
    }

    const msg = `${title}\n\n${buildConfirmMessage(normModules, preview)}${build ? '\n\n将同时构建静态站 (dist)。' : ''}\n\n发布前会自动备份相关文件。`;
    if (!confirm(msg)) return;

    setPublishLock(true);
    try {
      const res = await api('/api/publish', {
        method: 'POST',
        body: JSON.stringify({ modules, build }),
      });
      if (res.partial) {
        toast(res.message || '内容已同步，但构建失败');
      } else {
        toast(res.message || '发布成功');
      }
      const nextPreview = await fetchPublishPreview();
      const verEl = $('#publish-version');
      if (verEl) verEl.textContent = nextPreview.version ? `版本 ${nextPreview.version}` : '版本未发布';
    } catch (err) {
      toast(err.message);
    } finally {
      setPublishLock(false);
    }
  }

  $('#btn-publish-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    if (publishLocked) return;
    $('#publish-menu').classList.toggle('hidden');
  });

  fetchPublishPreview()
    .then((preview) => {
      const verEl = $('#publish-version');
      if (!verEl) return;
      verEl.textContent = preview.version ? `版本 ${preview.version}` : '版本未发布';
    })
    .catch(() => {});

  $$('.publish-dropdown__item').forEach((btn) => {
    btn.addEventListener('click', () => handlePublishAction(btn.dataset.publish));
  });

  document.addEventListener('click', (e) => {
    const dropdown = $('#publish-dropdown');
    if (!dropdown.contains(e.target)) {
      $('#publish-menu').classList.add('hidden');
    }
  });

  $$('.sidebar__item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'banner-list') switchPanel('banner-list');
      else if (view === 'list') switchPanel('list');
      else if (view === 'messages') switchPanel('messages');
      else if (view === 'settings') {
        switchPanel('settings');
        switchSettingsTab('stats');
      } else if (view === 'accounts') {
        switchPanel('accounts');
        loadAccounts();
      } else if (view === 'logs') {
        switchPanel('logs');
        loadLogs();
      }
    });
  });

  initSettingsModule($, $$, api, toast, escapeHtml, escapeAttr, uploadImage);

  $('#filter-msg-type').addEventListener('change', () => loadMessages());
  $('#filter-msg-status').addEventListener('change', () => loadMessages());
  $('#filter-msg-from').addEventListener('change', () => loadMessages());
  $('#filter-msg-to').addEventListener('change', () => loadMessages());
  $('#btn-filter-msg-reset').addEventListener('click', () => resetMessageFilters());
  $('#btn-export-messages').addEventListener('click', async () => {
    try {
      await exportMessages();
    } catch (err) {
      toast(err.message);
    }
  });
  $$('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeMessageModal);
  });

  $('#btn-new-banner').addEventListener('click', () => openBannerEditor());
  $('#btn-cancel-banner-edit').addEventListener('click', () => switchPanel('banner-list'));

  $('#banner-image-upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      $('#banner-field-image').value = await uploadImage(file);
      toast('图片上传成功');
    } catch (err) {
      toast(err.message);
    }
    e.target.value = '';
  });

  $('#banner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#banner-form-error').textContent = '';
    const payload = {
      id: $('#banner-field-id').value.trim(),
      image: $('#banner-field-image').value.trim(),
      tag: $('#banner-field-tag').value.trim(),
      title: $('#banner-field-title').value.trim(),
      subtitle: $('#banner-field-subtitle').value.trim(),
      buttons: collectBannerButtonsFromDom(),
      enabled: true,
    };
    if (!payload.image || !payload.title) {
      $('#banner-form-error').textContent = '请填写背景图与主标题';
      return;
    }
    try {
      const originalId = $('#banner-original-id').value;
      if (originalId) {
        const existing = bannerSlides.find((s) => s.id === originalId);
        if (existing) payload.enabled = existing.enabled !== false;
        await api(`/api/banner/${originalId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/banner', { method: 'POST', body: JSON.stringify(payload) });
      }
      toast('保存成功');
      await loadBanner();
      switchPanel('banner-list');
    } catch (err) {
      $('#banner-form-error').textContent = err.message;
    }
  });

  $('#field-content-type').addEventListener('change', toggleContentTypeUI);

  $('#btn-new').addEventListener('click', () => openEditor());
  $('#btn-cancel-edit').addEventListener('click', () => switchPanel('list'));

  $$('[data-add-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.addBlock;
      if (type === 'text') blocks.push({ type: 'text', html: '<p></p>' });
      else if (type === 'image') blocks.push({ type: 'image', src: '', alt: '', caption: '' });
      else blocks.push({ type: 'video', src: '', poster: '', caption: '' });
      renderBlocks();
    });
  });

  $('#cover-upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      $('#field-cover').value = await uploadImage(file);
      toast('封面上传成功');
    } catch (err) {
      toast(err.message);
    }
    e.target.value = '';
  });

  $('#article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#form-error').textContent = '';
    const contentType = $('#field-content-type').value;
    const link = contentType === 'link' ? $('#field-link').value.trim() : '';
    if (contentType === 'link' && !link) {
      $('#form-error').textContent = '外链模式下请填写跳转链接';
      return;
    }
    const payload = {
      id: $('#field-id').value.trim(),
      date: $('#field-date').value.trim() || todayDateLocal(),
      category: $('#field-category').value,
      title: $('#field-title').value.trim(),
      excerpt: $('#field-excerpt').value.trim(),
      cover: $('#field-cover').value.trim(),
      blocks: contentType === 'link' ? [] : collectBlocksFromDom(),
    };
    if (link) {
      payload.link = link;
      payload.linkTarget = $('#field-link-target').value;
    }
    try {
      const originalId = $('#original-id').value;
      if (originalId) {
        await api(`/api/news/${originalId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/news', { method: 'POST', body: JSON.stringify(payload) });
      }
      toast('保存成功');
      await loadNews();
      switchPanel('list');
    } catch (err) {
      $('#form-error').textContent = err.message;
    }
  });
}

init();
