/**
 * 后台网站设置模块
 */
import { fillCmsForm, collectCmsData, withCmsDefaults, refreshCmsPaginators } from './admin-cms.js';
import { createDomPaginator, paginateSlice, renderPaginationBar } from './admin-pagination.js';

const PAGE_LABELS = {
  index: '首页',
  about: '关于我们',
  products: '产品中心',
  technology: '创新技术',
  news: '新闻动态',
  'news-detail': '新闻详情',
  business: '商务合作',
  contact: '联系我们',
};

/** @type {object | null} */
let siteSettings = null;

/** @type {((url: string, opts?: RequestInit) => Promise<any>) | null} */
let settingsApi = null;
/** @type {(file: File) => Promise<string>} */
let settingsUploadImage = async () => '';
/** @type {(msg: string) => void} */
let settingsToast = () => {};

/** @type {string} */
let lastSavedSnapshot = '';

/** @type {ReturnType<typeof createDomPaginator> | null} */
let seoPaginator = null;

/** @type {ReturnType<typeof createDomPaginator> | null} */
let socialPaginator = null;

/** @type {number} */
let statsPage = 1;

const STATS_PAGE_SIZE = 10;

/** @type {Array<[string, number]>} */
let statsPageRows = [];

/**
 * 将当前设置表单序列化为可比较字符串
 * @returns {string}
 */
function serializeSettingsSnapshot() {
  return JSON.stringify(collectSettingsFromDom());
}

/**
 * 标记设置已与磁盘一致（加载或保存成功后调用）
 */
function markSettingsSaved() {
  lastSavedSnapshot = serializeSettingsSnapshot();
}

/**
 * 网站设置是否存在未保存修改
 * @returns {boolean}
 */
export function hasUnsavedSettingsChanges() {
  if (!lastSavedSnapshot) return false;
  return lastSavedSnapshot !== serializeSettingsSnapshot();
}

/**
 * @param {(sel: string) => Element | null} $
 * @param {(sel: string) => NodeListOf<Element>} $$
 * @param {(url: string, opts?: RequestInit) => Promise<any>} api
 * @param {(msg: string) => void} toast
 * @param {(str: string) => string} escapeHtml
 * @param {(str: string) => string} escapeAttr
 * @param {(file: File) => Promise<string>} uploadImage
 */
export function initSettingsModule($, $$, api, toast, escapeHtml, escapeAttr, uploadImage) {
  settingsApi = api;
  settingsUploadImage = uploadImage;
  settingsToast = toast;
  $$('.settings-tabs__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchSettingsTab(btn.dataset.settingsTab);
    });
  });

  $('#btn-save-settings')?.addEventListener('click', async () => {
    $('#settings-error').textContent = '';
    try {
      const payload = collectSettingsFromDom();
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      siteSettings = withCmsDefaults(payload);
      markSettingsSaved();
      toast('设置已保存');
    } catch (err) {
      $('#settings-error').textContent = err.message;
    }
  });

  $('#site-logo-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      $('#site-logo').value = await uploadImage(file);
      toast('Logo 上传成功');
    } catch (err) {
      toast(err.message);
    }
    e.target.value = '';
  });

  $('#site-favicon-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      $('#site-favicon').value = await uploadImage(file);
      toast('Favicon 上传成功');
    } catch (err) {
      toast(err.message);
    }
    e.target.value = '';
  });

  return { loadSettings, loadStats, switchSettingsTab };
}

/**
 * @param {string} name
 */
export function switchSettingsTab(name) {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  $$('.settings-tabs__btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.settingsTab === name);
  });
  $$('.settings-tab').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== `settings-tab-${name}`);
  });
  if (name === 'stats' && settingsApi) loadStats(settingsApi);
  if (name === 'seo') refreshSeoPagination(false);
  if (name === 'social') refreshSocialPagination(false);
  if (name === 'nav' || name === 'page-content') refreshCmsPaginators(false);
}

/**
 * @param {(sel: string) => Element | null} $
 * @param {(url: string, opts?: RequestInit) => Promise<any>} api
 */
export async function loadSettings($, api) {
  siteSettings = withCmsDefaults(await api('/api/settings'));
  fillSettingsForm($);
  markSettingsSaved();
}

/** @param {(sel: string) => Element | null} $} */
function fillSettingsForm($) {
  if (!siteSettings) return;
  const { site, seo, analytics, contact, footer, social } = siteSettings;

  $('#site-enabled').checked = site?.enabled !== false;
  $('#site-name').value = site?.name || '';
  $('#site-logo').value = site?.logo || '';
  $('#site-logo-icon-text').value = site?.logoIconText || '';
  $('#site-favicon').value = site?.favicon || '';
  $('#site-maintenance-title').value = site?.maintenanceTitle || '';
  $('#site-maintenance-message').value = site?.maintenanceMessage || '';

  $('#seo-default-title').value = seo?.defaultTitle || '';
  $('#seo-default-desc').value = seo?.defaultDescription || '';
  $('#seo-default-keywords').value = seo?.defaultKeywords || '';
  renderSeoPages($);

  $('#analytics-track').checked = analytics?.trackPageviews !== false;
  $('#analytics-baidu').value = analytics?.baiduSiteId || '';
  $('#analytics-ga').value = analytics?.googleAnalyticsId || '';
  $('#analytics-custom').value = analytics?.customHeadScript || '';

  $('#contact-hotline').value = contact?.hotline || '';
  $('#contact-business-hotline').value = contact?.businessHotline || '';
  $('#contact-service-phone').value = contact?.servicePhone || '';
  $('#contact-business-email').value = contact?.businessEmail || '';
  $('#contact-service-email').value = contact?.serviceEmail || '';
  $('#contact-address').value = contact?.address || '';
  $('#contact-work-hours').value = contact?.workHours || '';
  $('#contact-map-caption').value = contact?.mapCaption || '';

  $('#footer-brand-name').value = footer?.brandName || '';
  $('#footer-brand-product').value = footer?.brandProduct || '';
  $('#footer-brand-desc').value = footer?.brandDesc || '';
  $('#footer-copyright').value = footer?.copyright || '';
  $('#footer-icp').value = footer?.icp || '';
  $('#footer-disclaimer').value = footer?.disclaimer || '';

  renderSocialSettings($, social || []);
  fillCmsForm(siteSettings, $, settingsUploadImage, settingsToast);
  refreshSeoPagination(true);
  refreshSocialPagination(true);
}

/**
 * 刷新 SEO 页面列表分页
 * @param {boolean} [reset]
 */
function refreshSeoPagination(reset = false) {
  if (!seoPaginator) {
    seoPaginator = createDomPaginator({
      container: document.querySelector('#seo-pagination'),
      itemSelector: '#seo-pages-container [data-seo-page]',
      pageSize: 5,
      unit: '个页面',
    });
  }
  seoPaginator.refresh(reset);
}

/**
 * 刷新社交媒体列表分页
 * @param {boolean} [reset]
 */
function refreshSocialPagination(reset = false) {
  if (!socialPaginator) {
    socialPaginator = createDomPaginator({
      container: document.querySelector('#social-pagination'),
      itemSelector: '#social-settings-container [data-social-index]',
      pageSize: 5,
      unit: '个平台',
    });
  }
  socialPaginator.refresh(reset);
}

/** @param {(sel: string) => Element | null} $} */
function renderSeoPages($) {
  const container = $('#seo-pages-container');
  const pages = siteSettings?.seo?.pages || {};
  const keys = Object.keys(PAGE_LABELS);

  container.innerHTML = keys
    .map((key) => {
      const page = pages[key] || {};
      return `
      <div class="block-card" data-seo-page="${key}">
        <div class="block-card__head"><span class="block-card__type">${PAGE_LABELS[key]}</span></div>
        <label class="field field--full"><span>标题</span><input type="text" data-seo-field="title" value="${escapeAttr(page.title || '')}"></label>
        <label class="field field--full"><span>描述</span><textarea rows="2" data-seo-field="description">${escapeHtml(page.description || '')}</textarea></label>
        <label class="field field--full"><span>关键词</span><input type="text" data-seo-field="keywords" value="${escapeAttr(page.keywords || '')}"></label>
      </div>`;
    })
    .join('');
}

/**
 * @param {(sel: string) => Element | null} $
 * @param {object[]} social
 */
function renderSocialSettings($, social) {
  const container = $('#social-settings-container');
  container.innerHTML = social
    .map(
      (item, i) => `
    <div class="block-card" data-social-index="${i}">
      <div class="block-card__head"><span class="block-card__type">${escapeHtml(item.name || `平台 ${i + 1}`)}</span></div>
      <div class="form-grid">
        <label class="field"><span>平台名称</span><input type="text" data-social-field="name" value="${escapeAttr(item.name || '')}"></label>
        <label class="field"><span>图标图片 URL</span><input type="text" data-social-field="icon" value="${escapeAttr(item.icon || '')}"></label>
        <label class="field"><span>账号名</span><input type="text" data-social-field="account" value="${escapeAttr(item.account || '')}"></label>
        <label class="field"><span>链接</span><input type="text" data-social-field="url" value="${escapeAttr(item.url || '')}"></label>
        <label class="field field--full">
          <span>二维码图片 URL</span>
          <div class="input-row">
            <input type="text" data-social-field="qrcode" value="${escapeAttr(item.qrcode || '')}">
            <label class="btn btn--outline upload-btn">上传<input type="file" data-social-upload="${i}" accept="image/*" hidden></label>
          </div>
        </label>
      </div>
    </div>`
    )
    .join('');

  container.querySelectorAll('[data-social-upload]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const index = Number(e.target.dataset.socialUpload);
      try {
        const url = await uploadImage(file);
        const card = container.querySelector(`[data-social-index="${index}"]`);
        card?.querySelector('[data-social-field="qrcode"]')?.setAttribute('value', url);
        const field = card?.querySelector('[data-social-field="qrcode"]');
        if (field) field.value = url;
        toast('二维码上传成功');
      } catch (err) {
        toast(err.message);
      }
      e.target.value = '';
    });
  });
}

function collectSettingsFromDom() {
  const $ = (sel) => document.querySelector(sel);
  const pages = {};
  $$('[data-seo-page]').forEach((card) => {
    const key = card.dataset.seoPage;
    pages[key] = {
      title: card.querySelector('[data-seo-field="title"]')?.value?.trim() || '',
      description: card.querySelector('[data-seo-field="description"]')?.value?.trim() || '',
      keywords: card.querySelector('[data-seo-field="keywords"]')?.value?.trim() || '',
    };
  });

  const social = [...$$('#social-settings-container [data-social-index]')].map((card, index) => ({
    id: siteSettings?.social?.[index]?.id || `social-${index + 1}`,
    name: card.querySelector('[data-social-field="name"]')?.value?.trim() || '',
    icon: card.querySelector('[data-social-field="icon"]')?.value?.trim() || '',
    account: card.querySelector('[data-social-field="account"]')?.value?.trim() || '',
    url: card.querySelector('[data-social-field="url"]')?.value?.trim() || '#',
    qrcode: card.querySelector('[data-social-field="qrcode"]')?.value?.trim() || '',
  }));

  const cms = collectCmsData(siteSettings);

  return {
    site: {
      enabled: $('#site-enabled')?.checked !== false,
      name: $('#site-name')?.value?.trim() || '',
      logo: $('#site-logo')?.value?.trim() || '',
      logoIconText: $('#site-logo-icon-text')?.value?.trim() || '',
      favicon: $('#site-favicon')?.value?.trim() || '',
      maintenanceTitle: $('#site-maintenance-title')?.value?.trim() || '',
      maintenanceMessage: $('#site-maintenance-message')?.value?.trim() || '',
    },
    seo: {
      defaultTitle: $('#seo-default-title')?.value?.trim() || '',
      defaultDescription: $('#seo-default-desc')?.value?.trim() || '',
      defaultKeywords: $('#seo-default-keywords')?.value?.trim() || '',
      pages,
    },
    analytics: {
      trackPageviews: $('#analytics-track')?.checked !== false,
      baiduSiteId: $('#analytics-baidu')?.value?.trim() || '',
      googleAnalyticsId: $('#analytics-ga')?.value?.trim() || '',
      customHeadScript: $('#analytics-custom')?.value?.trim() || '',
    },
    contact: {
      hotline: $('#contact-hotline')?.value?.trim() || '',
      businessHotline: $('#contact-business-hotline')?.value?.trim() || '',
      servicePhone: $('#contact-service-phone')?.value?.trim() || '',
      businessEmail: $('#contact-business-email')?.value?.trim() || '',
      serviceEmail: $('#contact-service-email')?.value?.trim() || '',
      address: $('#contact-address')?.value?.trim() || '',
      workHours: $('#contact-work-hours')?.value?.trim() || '',
      mapCaption: $('#contact-map-caption')?.value?.trim() || '',
    },
    footer: {
      brandName: $('#footer-brand-name')?.value?.trim() || '',
      brandProduct: $('#footer-brand-product')?.value?.trim() || '',
      brandDesc: $('#footer-brand-desc')?.value?.trim() || '',
      copyright: $('#footer-copyright')?.value?.trim() || '',
      icp: $('#footer-icp')?.value?.trim() || '',
      disclaimer: $('#footer-disclaimer')?.value?.trim() || '',
    },
    social,
    nav: cms.nav,
    pageContent: cms.pageContent,
  };
}

/** @param {(url: string, opts?: RequestInit) => Promise<any>} api */
export async function loadStats(api) {
  const stats = await api('/api/stats');
  const $ = (sel) => document.querySelector(sel);
  $('#stats-cards').innerHTML = `
    <div class="stat-box"><div class="stat-box__num">${stats.total || 0}</div><div class="stat-box__label">总访问量 (PV)</div></div>
    <div class="stat-box"><div class="stat-box__num">${stats.today?.count || 0}</div><div class="stat-box__label">今日访问</div></div>
    <div class="stat-box"><div class="stat-box__num">${Object.keys(stats.pages || {}).length}</div><div class="stat-box__label">受访页面数</div></div>
  `;

  statsPageRows = Object.entries(stats.pages || {}).sort((a, b) => b[1] - a[1]);
  statsPage = 1;
  renderStatsPagesTable();
}

function renderStatsPagesTable() {
  const $ = (sel) => document.querySelector(sel);
  const tbody = $('#stats-pages-body');
  const paginationEl = $('#stats-pagination');
  const { items, page, totalPages, total } = paginateSlice(statsPageRows, statsPage, STATS_PAGE_SIZE);
  statsPage = page;

  if (!tbody) return;

  if (!total) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#999">暂无访问数据</td></tr>';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  tbody.innerHTML = items.map(([path, count]) => `<tr><td>${path}</td><td>${count}</td></tr>`).join('');

  renderPaginationBar({
    container: paginationEl,
    page,
    totalPages,
    total,
    pageSize: STATS_PAGE_SIZE,
    unit: '个页面',
    onPageChange: (next) => {
      statsPage = next;
      renderStatsPagesTable();
    },
  });
}

/** @param {string} str */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {string} str */
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

/** @param {string} sel */
function $$(sel) {
  return document.querySelectorAll(sel);
}
