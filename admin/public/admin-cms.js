/**
 * 半 CMS 后台：导航与页面模块编辑
 */
import { createDomPaginator } from './admin-pagination.js';

/** @type {Record<string, string>} */
const PAGE_LABELS = {
  index: '首页',
  about: '关于我们',
  jiujiedan: '九解丹',
  technology: '创新技术',
  business: '商务合作',
};

/** @type {ReturnType<typeof createDomPaginator> | null} */
let navPaginator = null;

/** @type {ReturnType<typeof createDomPaginator> | null} */
let pageContentPaginator = null;

/**
 * 初始化 CMS 列表分页
 */
function ensureCmsPaginators() {
  if (!navPaginator) {
    navPaginator = createDomPaginator({
      container: document.querySelector('#nav-pagination'),
      itemSelector: '#nav-settings-container [data-nav-index]',
      pageSize: 5,
      unit: '项导航',
    });
  }
  if (!pageContentPaginator) {
    pageContentPaginator = createDomPaginator({
      container: document.querySelector('#page-content-pagination'),
      itemSelector: '#page-content-container .cms-page-group',
      pageSize: 1,
      unit: '个页面',
    });
  }
}

/**
 * 刷新 CMS 列表分页
 * @param {boolean} [reset]
 */
export function refreshCmsPaginators(reset = false) {
  ensureCmsPaginators();
  navPaginator?.refresh(reset);
  pageContentPaginator?.refresh(reset);
}

/** @type {Record<string, Record<string, string>>} */
const SECTION_LABELS = {
  index: {
    intro: '企业简介',
    news: '最新资讯',
    tech: '技术与品控亮点',
    scenes: '多元渠道',
    products: '九解丹全系产品',
  },
  about: {
    banner: '页头 Banner',
    subnav: '二级导航',
    profile: '公司简介',
    team: '管理团队',
    culture: '企业文化',
    responsibility: '社会责任',
  },
  jiujiedan: {
    hero: '首屏 Banner',
    subnav: '二级导航',
    advantages: '核心优势',
    'nine-scenes': '九大解法',
    products: '全系产品',
    philosophy: '品牌理念',
    cta: '底部转化区',
  },
  technology: {
    banner: '页头 Banner',
    subnav: '二级导航',
    rd: '研发实力',
    formula: '草本配方',
    process: '生产工艺',
    testing: '检测体系',
    quality: '质量管理',
  },
  business: {
    banner: '页头 Banner',
    dealer: '合作介绍',
    partners: '多元合作',
    cta: '开启合作之旅',
  },
};

/** @type {Record<string, string>} */
const FIELD_LABELS = {
  title: '标题',
  desc: '描述',
  heading: '内容标题',
  body1: '正文段落 1',
  body2: '正文段落 2',
  subtitle: '副标题',
  tagline: '标语',
  buttonText: '按钮文字',
  buttonHref: '按钮链接',
  moreText: '更多按钮',
  moreHref: '更多链接',
  btn1Text: '按钮1文字',
  btn1Href: '按钮1链接',
  btn2Text: '按钮2文字',
  btn2Href: '按钮2链接',
  em: '强调文字',
  bgImage: '背景图 URL',
  enabled: '启用',
  order: '排序',
  navLabel: '导航显示名',
};

/** @type {string[]} */
const TEXT_FIELDS = [
  'title',
  'desc',
  'heading',
  'body1',
  'body2',
  'subtitle',
  'tagline',
  'buttonText',
  'buttonHref',
  'moreText',
  'moreHref',
  'btn1Text',
  'btn1Href',
  'btn2Text',
  'btn2Href',
  'em',
  'bgImage',
  'navLabel',
];

/** @type {Array<{ id: string, label: string, href: string, enabled: boolean, order: number, type: string, children?: Array<{ id: string, label: string, href: string, enabled: boolean, external: boolean }> }>} */
const DEFAULT_NAV = [
  { id: 'home', label: '首页', href: 'index.html', enabled: true, order: 1, type: 'link' },
  { id: 'about', label: '关于我们', href: 'about.html', enabled: true, order: 2, type: 'link' },
  {
    id: 'jiujiedan',
    label: '九解丹',
    href: 'jiujiedan.html',
    enabled: true,
    order: 3,
    type: 'dropdown',
    children: [
      { id: 'jj-overview', label: '品牌概览', href: 'jiujiedan.html', enabled: true, external: false },
      { id: 'jj-classic', label: '经典版', href: 'jiujiedan-classic.html', enabled: true, external: true },
      { id: 'jj-business', label: '商务版', href: 'jiujiedan-business.html', enabled: true, external: true },
      { id: 'jj-gift', label: '礼遇版', href: 'jiujiedan-gift.html', enabled: true, external: true },
    ],
  },
  { id: 'technology', label: '创新技术', href: 'technology.html', enabled: true, order: 4, type: 'link' },
  { id: 'news', label: '新闻动态', href: 'news.html', enabled: true, order: 5, type: 'link' },
  { id: 'business', label: '商务合作', href: 'business.html', enabled: true, order: 6, type: 'link' },
  { id: 'contact', label: '联系我们', href: 'contact.html', enabled: true, order: 7, type: 'link' },
];

/** @type {Record<string, { sections: Record<string, Record<string, unknown>> }>} */
const DEFAULT_PAGE_CONTENT = {
  index: {
    sections: {
      intro: { enabled: true, order: 1, title: '企业简介', desc: '道丹元专注东方草本健康饮品，以科学验证与品质管控构建企业信誉', heading: '专注实业 · 坚守品质', body1: '道丹元坚持发展实体经济，深耕草本饮品先进制造。公司建有标准化生产基地与质量检测中心，构建「总部—区域—分公司」三级质量管控体系，旗下九解丹产品面向商务应酬、高端宴请与企业团购等场景。', body2: '品牌的基石，一半是质量，一半是诚信。我们始终严控质量，以合规、体面的方式让本草走进现代商务生活。', buttonText: '了解更多 →', buttonHref: 'about.html' },
      news: { enabled: true, order: 2, title: '最新资讯', moreText: '查看更多 →', moreHref: 'news.html' },
      tech: { enabled: true, order: 3, title: '技术与品控亮点', desc: '从配方研发到批次放行，全链路品质管控', buttonText: '探索创新技术 →', buttonHref: 'technology.html' },
      scenes: { enabled: true, order: 4, title: '多元渠道 · 共创增长', desc: '经销商加盟、企业团购、餐饮渠道，精准匹配您的商业场景' },
      products: { enabled: true, order: 5, title: '九解丹全系产品', desc: '经典版 · 商务版 · 礼遇版，覆盖日常、商务与赠礼场景', buttonText: '了解九解丹品牌', buttonHref: 'jiujiedan.html#products' },
    },
  },
  about: {
    sections: {
      banner: { enabled: true, order: 1, title: '关于我们', desc: '了解道丹元 · 传承东方草本智慧，以科技创新服务现代健康需求', bgImage: '/images/brand/hero-1.jpg' },
      subnav: { enabled: true, order: 2 },
      profile: { enabled: true, order: 3, title: '公司简介', navLabel: '公司简介', body1: '道丹元是一家专注于东方草本健康饮品研发、生产与推广的企业。公司坚持实业固本、品质为先，在巩固饮品制造能力的同时，积极向大健康与药食同源领域拓展。', body2: '旗下核心产品「九解丹」面向商务应酬、高端宴请与企业团购等场景。公司总部位于深圳，拥有标准化生产基地、研发中心与质量检测中心。' },
      team: { enabled: true, order: 4, title: '核心团队', navLabel: '管理团队', desc: '跨界融合草本研究、食品工程与商业运营经验' },
      culture: { enabled: true, order: 5, title: '使命 · 愿景 · 价值观', navLabel: '企业文化' },
      responsibility: { enabled: true, order: 6, title: '践行责任 · 回馈社会', navLabel: '社会责任' },
    },
  },
  jiujiedan: {
    sections: {
      hero: { enabled: true, order: 1, title: '一饮九解 自在逍遥', subtitle: '九解丹 · 草本植物饮', tagline: '师承古方 · 科学赋能 · 道法自然', btn1Text: '了解九大解法', btn1Href: '#nine-scenes', btn2Text: '商务合作咨询', btn2Href: 'business.html', bgImage: '/images/brand/hero-2.jpg' },
      subnav: { enabled: true, order: 2 },
      advantages: { enabled: true, order: 3, title: '核心优势', navLabel: '核心优势' },
      'nine-scenes': { enabled: true, order: 4, title: '九大解法 解锁自在生活', navLabel: '九大解法' },
      products: { enabled: true, order: 5, title: '九解丹全系产品', navLabel: '全系产品', desc: '经典版 · 商务版 · 礼遇版，覆盖日常、商务与赠礼场景' },
      philosophy: { enabled: true, order: 6, title: '品牌理念 · 品质保障', navLabel: '品牌理念' },
      cta: { enabled: true, order: 7, title: '一饮九解 自在逍遥', desc: '个人选购 · 批量采购 · 礼品定制 一站式服务', btn1Text: '立即咨询', btn1Href: 'contact.html', btn2Text: '批量采购', btn2Href: 'business.html#group' },
    },
  },
  technology: {
    sections: {
      banner: { enabled: true, order: 1, title: '创新技术', desc: '研发驱动 · 品质为本 · 构建信任壁垒', bgImage: '/images/brand/hero-1.jpg' },
      subnav: { enabled: true, order: 2 },
      rd: { enabled: true, order: 3, title: '科研团队 · 技术平台', navLabel: '研发实力' },
      formula: { enabled: true, order: 4, title: '1+1 > 2 的黄金配比', navLabel: '草本配方', desc: '古籍为源，科学验证，精准复配' },
      process: { enabled: true, order: 5, title: '纳米包埋 · 三步吸收', navLabel: '生产工艺', desc: '怎样实现口服也能高效吸收？' },
      testing: { enabled: true, order: 6, title: '全流程 · 可验证', navLabel: '检测体系' },
      quality: { enabled: true, order: 7, title: '体系化 · 常态化', navLabel: '质量管理' },
    },
  },
  business: {
    sections: {
      banner: { enabled: true, order: 1, title: '商务合作', desc: '携手道丹元，共创东方草本商务伴饮新生态', bgImage: '/images/brand/hero-1.jpg' },
      dealer: { enabled: true, order: 2, title: '覆盖全国的销售与服务网络', body1: '道丹元已建立完善的经销商体系与渠道支持政策，从培训赋能到物料供应，从区域保护到联合推广，助力合作伙伴快速开拓市场、持续盈利。', buttonText: '立即咨询合作', buttonHref: 'contact.html' },
      partners: { enabled: true, order: 3, title: '多元合作 · 灵活对接' },
      cta: { enabled: true, order: 4, title: '开启', em: '合作之旅', desc: '无论您是寻求区域代理、企业团购还是餐饮渠道合作，我们都期待与您携手。', buttonText: '立即咨询 →', buttonHref: 'contact.html' },
    },
  },
};

/**
 * @param {object} settings
 */
export function withCmsDefaults(settings = {}) {
  const nav = Array.isArray(settings.nav) && settings.nav.length ? settings.nav : DEFAULT_NAV;
  const pageContent = {};
  Object.keys(PAGE_LABELS).forEach((pageKey) => {
    const basePage = DEFAULT_PAGE_CONTENT[pageKey] || { sections: {} };
    const rawPage = settings.pageContent?.[pageKey] || {};
    const mergedSections = {};
    const sectionKeys = new Set([...Object.keys(basePage.sections || {}), ...Object.keys(rawPage.sections || {})]);
    sectionKeys.forEach((sectionId) => {
      mergedSections[sectionId] = {
        ...(basePage.sections?.[sectionId] || { enabled: true, order: 99 }),
        ...(rawPage.sections?.[sectionId] || {}),
      };
    });
    pageContent[pageKey] = { sections: mergedSections };
  });
  return { ...settings, nav, pageContent };
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

/**
 * @param {object} settings
 * @param {(sel: string) => Element | null} $
 * @param {(file: File) => Promise<string>} uploadImage
 * @param {(msg: string) => void} toast
 */
export function fillCmsForm(settings, $, uploadImage, toast) {
  renderNavEditor(settings?.nav || [], $);
  renderPageContentEditor(settings?.pageContent || {}, $, uploadImage, toast);
  refreshCmsPaginators(true);
}

/**
 * @param {object[]} nav
 * @param {(sel: string) => Element | null} $
 */
function renderNavEditor(nav, $) {
  const container = $('#nav-settings-container');
  if (!container) return;

  container.innerHTML = nav
    .map((item, index) => {
      const children =
        item.type === 'dropdown' && item.children?.length
          ? `
        <div class="nav-children" data-nav-children="${index}">
          ${item.children
            .map(
              (child, ci) => `
            <div class="nav-child-row" data-nav-child="${index}-${ci}">
              <label class="field field--inline"><span>子项启用</span><input type="checkbox" data-nav-child-field="enabled" ${child.enabled !== false ? 'checked' : ''}></label>
              <label class="field"><span>名称</span><input type="text" data-nav-child-field="label" value="${escapeAttr(child.label || '')}"></label>
              <label class="field"><span>链接</span><input type="text" data-nav-child-field="href" value="${escapeAttr(child.href || '')}"></label>
              <label class="field field--inline"><span>外链</span><input type="checkbox" data-nav-child-field="external" ${child.external ? 'checked' : ''}></label>
            </div>`
            )
            .join('')}
        </div>`
          : '';

      return `
      <div class="block-card" data-nav-index="${index}">
        <div class="block-card__head">
          <span class="block-card__type">${escapeHtml(item.label || `导航 ${index + 1}`)}</span>
          <span class="block-card__meta">${item.type === 'dropdown' ? '下拉菜单' : '链接'}</span>
        </div>
        <div class="form-grid">
          <label class="field field--inline"><span>启用</span><input type="checkbox" data-nav-field="enabled" ${item.enabled !== false ? 'checked' : ''}></label>
          <label class="field field--inline"><span>排序</span><input type="number" min="1" data-nav-field="order" value="${Number(item.order) || index + 1}"></label>
          <label class="field"><span>显示名称</span><input type="text" data-nav-field="label" value="${escapeAttr(item.label || '')}"></label>
          <label class="field"><span>链接地址</span><input type="text" data-nav-field="href" value="${escapeAttr(item.href || '')}"></label>
        </div>
        ${children}
      </div>`;
    })
    .join('');
}

/**
 * @param {Record<string, { sections?: Record<string, object> }>} pageContent
 * @param {(sel: string) => Element | null} $
 * @param {(file: File) => Promise<string>} uploadImage
 * @param {(msg: string) => void} toast
 */
function renderPageContentEditor(pageContent, $, uploadImage, toast) {
  const container = $('#page-content-container');
  if (!container) return;

  container.innerHTML = Object.keys(PAGE_LABELS)
    .map((pageKey) => {
      const sections = pageContent[pageKey]?.sections || {};
      const sectionKeys = Object.keys(SECTION_LABELS[pageKey] || {});

      const sectionHtml = sectionKeys
        .map((sectionId) => {
          const section = sections[sectionId] || {};
          const sectionLabel = SECTION_LABELS[pageKey][sectionId] || sectionId;

          if (sectionId === 'subnav') {
            return `
          <div class="block-card" data-page-key="${pageKey}" data-section-id="${sectionId}">
            <div class="block-card__head"><span class="block-card__type">${escapeHtml(sectionLabel)}</span></div>
            <p class="panel__hint">固定在页头 Banner 下方；链接根据本页其他已启用楼层自动生成，可用各楼层的「导航显示名」调整文案。</p>
            <div class="form-grid">
              <label class="field field--inline"><span>启用模块</span><input type="checkbox" data-page-field="enabled" ${section.enabled !== false ? 'checked' : ''}></label>
              <label class="field field--inline"><span>排序</span><input type="number" min="1" data-page-field="order" value="${Number(section.order) || 2}"></label>
            </div>
          </div>`;
          }

          const fields = TEXT_FIELDS.filter((key) => key in section || key in (getDefaultFieldKeys(pageKey, sectionId) || {}))
            .map((key) => {
              const label = FIELD_LABELS[key] || key;
              const value = section[key] ?? '';
              const isLong = key.startsWith('body') || key === 'desc';
              if (key === 'bgImage') {
                return `<label class="field field--full"><span>${label}</span><div class="input-row"><input type="text" data-page-field="${key}" value="${escapeAttr(String(value))}"><label class="btn btn--outline upload-btn">上传<input type="file" data-page-upload="${pageKey}-${sectionId}-${key}" accept="image/*" hidden></label></div></label>`;
              }
              if (isLong) {
                return `<label class="field field--full"><span>${label}</span><textarea rows="2" data-page-field="${key}">${escapeHtml(String(value))}</textarea></label>`;
              }
              return `<label class="field field--full"><span>${label}</span><input type="text" data-page-field="${key}" value="${escapeAttr(String(value))}"></label>`;
            })
            .join('');

          return `
          <div class="block-card" data-page-key="${pageKey}" data-section-id="${sectionId}">
            <div class="block-card__head"><span class="block-card__type">${escapeHtml(sectionLabel)}</span></div>
            <div class="form-grid">
              <label class="field field--inline"><span>启用模块</span><input type="checkbox" data-page-field="enabled" ${section.enabled !== false ? 'checked' : ''}></label>
              <label class="field field--inline"><span>排序</span><input type="number" min="1" data-page-field="order" value="${Number(section.order) || 1}"></label>
            </div>
            ${fields}
          </div>`;
        })
        .join('');

      return `
      <div class="cms-page-group" data-cms-page="${pageKey}">
        <h3 class="settings-section-title">${PAGE_LABELS[pageKey]}</h3>
        ${sectionHtml}
      </div>`;
    })
    .join('');

  container.querySelectorAll('[data-page-upload]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        const row = e.target.closest('.input-row');
        const field = row?.querySelector('input[data-page-field]');
        if (field) field.value = url;
        toast('背景图上传成功');
      } catch (err) {
        toast(err.message || '上传失败');
      }
      e.target.value = '';
    });
  });
}

/**
 * @param {string} pageKey
 * @param {string} sectionId
 */
function getDefaultFieldKeys(pageKey, sectionId) {
  const map = {
    'index.intro': ['title', 'desc', 'heading', 'body1', 'body2', 'buttonText', 'buttonHref'],
    'index.news': ['title', 'moreText', 'moreHref'],
    'index.tech': ['title', 'desc', 'buttonText', 'buttonHref'],
    'index.scenes': ['title', 'desc'],
    'index.products': ['title', 'desc', 'buttonText', 'buttonHref'],
    'about.banner': ['title', 'desc', 'bgImage'],
    'about.profile': ['title', 'navLabel', 'body1', 'body2'],
    'about.team': ['title', 'navLabel', 'desc'],
    'about.culture': ['title', 'navLabel'],
    'about.responsibility': ['title', 'navLabel'],
    'jiujiedan.hero': ['title', 'subtitle', 'tagline', 'btn1Text', 'btn1Href', 'btn2Text', 'btn2Href', 'bgImage'],
    'jiujiedan.advantages': ['title', 'navLabel'],
    'jiujiedan.nine-scenes': ['title', 'navLabel'],
    'jiujiedan.products': ['title', 'navLabel', 'desc'],
    'jiujiedan.philosophy': ['title', 'navLabel'],
    'jiujiedan.cta': ['title', 'desc', 'btn1Text', 'btn1Href', 'btn2Text', 'btn2Href'],
    'technology.banner': ['title', 'desc', 'bgImage'],
    'technology.rd': ['title', 'navLabel'],
    'technology.formula': ['title', 'navLabel', 'desc'],
    'technology.process': ['title', 'navLabel', 'desc'],
    'technology.testing': ['title', 'navLabel'],
    'technology.quality': ['title', 'navLabel'],
    'business.banner': ['title', 'desc', 'bgImage'],
    'business.dealer': ['title', 'body1', 'buttonText', 'buttonHref'],
    'business.partners': ['title'],
    'business.cta': ['title', 'em', 'desc', 'buttonText', 'buttonHref'],
  };
  const keys = map[`${pageKey}.${sectionId}`];
  if (!keys) return null;
  return Object.fromEntries(keys.map((k) => [k, '']));
}

/**
 * @param {object | null} siteSettings
 */
export function collectCmsData(siteSettings) {
  const nav = collectNavFromDom(siteSettings?.nav || []);
  const pageContent = collectPageContentFromDom(siteSettings?.pageContent || {});
  return { nav, pageContent };
}

/**
 * @param {object[]} originalNav
 */
function collectNavFromDom(originalNav) {
  const cards = [...document.querySelectorAll('[data-nav-index]')];
  return cards.map((card) => {
    const index = Number(card.dataset.navIndex);
    const base = originalNav[index] || {};
    const item = {
      id: base.id || `nav-${index + 1}`,
      label: card.querySelector('[data-nav-field="label"]')?.value?.trim() || '',
      href: card.querySelector('[data-nav-field="href"]')?.value?.trim() || '#',
      enabled: card.querySelector('[data-nav-field="enabled"]')?.checked !== false,
      order: Number(card.querySelector('[data-nav-field="order"]')?.value) || index + 1,
      type: base.type === 'dropdown' ? 'dropdown' : 'link',
      children: [],
    };

    if (base.type === 'dropdown' && base.children?.length) {
      item.children = [...card.querySelectorAll('[data-nav-child]')].map((row) => {
        const parts = row.dataset.navChild.split('-');
        const ci = Number(parts[1]);
        const childBase = base.children[ci] || {};
        return {
          id: childBase.id || `nav-child-${ci + 1}`,
          label: row.querySelector('[data-nav-child-field="label"]')?.value?.trim() || '',
          href: row.querySelector('[data-nav-child-field="href"]')?.value?.trim() || '#',
          enabled: row.querySelector('[data-nav-child-field="enabled"]')?.checked !== false,
          external: row.querySelector('[data-nav-child-field="external"]')?.checked === true,
        };
      });
    }

    return item;
  });
}

/**
 * @param {Record<string, { sections?: Record<string, object> }>} original
 */
function collectPageContentFromDom(original) {
  const result = {};

  document.querySelectorAll('[data-page-key][data-section-id]').forEach((card) => {
    const pageKey = card.dataset.pageKey;
    const sectionId = card.dataset.sectionId;
    if (!pageKey || !sectionId) return;

    if (!result[pageKey]) result[pageKey] = { sections: {} };

    const section = {
      enabled: card.querySelector('[data-page-field="enabled"]')?.checked !== false,
      order: Number(card.querySelector('[data-page-field="order"]')?.value) || 1,
    };

    card.querySelectorAll('[data-page-field]').forEach((input) => {
      const key = input.getAttribute('data-page-field');
      if (!key || key === 'enabled' || key === 'order') return;
      section[key] = input.value?.trim() || '';
    });

    const baseId = original[pageKey]?.sections?.[sectionId]?.id;
    if (baseId) section.id = baseId;

    result[pageKey].sections[sectionId] = section;
  });

  return result;
}
