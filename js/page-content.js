/**
 * 半 CMS：页面模块内容应用
 */

/** @type {Record<string, string>} */
export const PAGE_KEYS = {
  'index.html': 'index',
  '': 'index',
  'about.html': 'about',
  'jiujiedan.html': 'jiujiedan',
  'technology.html': 'technology',
  'business.html': 'business',
};

/** 不参与二级导航的楼层 */
const SUBNAV_EXCLUDE = new Set(['banner', 'hero', 'subnav', 'cta']);

/**
 * @returns {string}
 */
export function getCurrentPageKey() {
  const pageName = window.location.pathname.split('/').pop() || 'index.html';
  return PAGE_KEYS[pageName] || '';
}

/**
 * @param {HTMLElement} el
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function applyField(el, key, value) {
  const text = String(value || '').trim();

  if (key === 'bgImage') {
    if (!text) {
      el.style.removeProperty('background');
      el.style.removeProperty('background-image');
      return false;
    }
    if (el.classList.contains('page-banner')) {
      el.style.background = `linear-gradient(135deg, rgba(8, 28, 21, 0.88), rgba(27, 67, 50, 0.75)), url("${text.replace(/"/g, '&quot;')}") center/cover no-repeat`;
      return true;
    }
    el.style.backgroundImage = `url("${text.replace(/"/g, '&quot;')}")`;
    return true;
  }

  if (el.tagName === 'A' && key.endsWith('Href')) {
    if (!text) return false;
    el.setAttribute('href', text);
    return true;
  }

  if (el.tagName === 'A' && (key.endsWith('Text') || key === 'buttonText' || key === 'moreText' || key.startsWith('btn'))) {
    if (!text) return false;
    el.textContent = text;
    return true;
  }

  if (key === 'em' && el.tagName === 'EM') {
    if (!text) return false;
    el.textContent = text;
    return true;
  }

  if (!text) return false;
  el.textContent = text;
  return true;
}

/**
 * @param {Record<string, unknown>} sectionConfig
 * @param {HTMLElement} sectionEl
 */
function applySectionContent(sectionConfig, sectionEl) {
  sectionEl.querySelectorAll('[data-cms-bg]').forEach((node) => {
    const key = node.getAttribute('data-cms-bg');
    if (!key) return;
    applyField(node, key, String(sectionConfig[key] || ''));
  });

  sectionEl.querySelectorAll('[data-cms]').forEach((node) => {
    const key = node.getAttribute('data-cms');
    if (!key) return;
    const visible = applyField(node, key, String(sectionConfig[key] || ''));
    node.classList.toggle('hidden', !visible);

    if (node.tagName === 'A') {
      const hrefKey = key.replace(/Text$/, 'Href');
      const hrefVal = String(sectionConfig[hrefKey] || '').trim();
      if (hrefVal) node.setAttribute('href', hrefVal);
      if (!hrefVal && !String(sectionConfig[key] || '').trim()) node.classList.add('hidden');
    }
  });

  const emEl = sectionEl.querySelector('[data-cms="em"]');
  if (emEl) {
    const emVal = String(sectionConfig.em || '').trim();
    emEl.classList.toggle('hidden', !emVal);
    if (emVal) emEl.textContent = emVal;
  }
}

/**
 * 读取页面 HTML 中楼层的默认顺序
 * @returns {Record<string, number>}
 */
function getDomSectionOrder() {
  const items = [...document.querySelectorAll('[data-page-section]')];
  return Object.fromEntries(
    items.map((el, index) => [el.getAttribute('data-page-section') || '', index + 1])
  );
}

/**
 * @param {string} sectionId
 * @param {Record<string, { enabled?: boolean, order?: number }>} sections
 * @param {Record<string, number>} domOrder
 * @returns {number}
 */
function resolveSectionOrder(sectionId, sections, domOrder) {
  const configured = Number(sections[sectionId]?.order);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return domOrder[sectionId] ?? 999;
}

/**
 * @param {Record<string, { enabled?: boolean, order?: number, title?: string, navLabel?: string }>} sections
 * @param {Record<string, number>} domOrder
 */
function reorderSections(sections, domOrder) {
  const allItems = [...document.querySelectorAll('[data-page-section]')];
  if (!allItems.length) return;

  const anchor = document.querySelector('.hero-carousel, .jiujiedan-hero, .page-banner');
  const sortable = allItems.filter((el) => el !== anchor);
  const parent = document.body;

  const sorted = sortable
    .map((el) => {
      const id = el.getAttribute('data-page-section') || '';
      return {
        el,
        order: resolveSectionOrder(id, sections, domOrder),
        domIndex: domOrder[id] ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order || a.domIndex - b.domIndex);

  let insertRef = anchor || null;
  sorted.forEach(({ el }) => {
    if (insertRef) {
      parent.insertBefore(el, insertRef.nextSibling);
      insertRef = el;
    } else {
      parent.appendChild(el);
      insertRef = el;
    }
  });
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
 * 根据可见楼层同步二级导航链接
 * @param {Record<string, { enabled?: boolean, order?: number, title?: string, navLabel?: string }>} sections
 * @param {Record<string, number>} domOrder
 */
function syncPageSubnav(sections, domOrder) {
  const subnav = document.querySelector('[data-page-section="subnav"]');
  if (!subnav) return;

  const subnavConfig = sections.subnav || {};
  if (subnavConfig.enabled === false) {
    subnav.classList.add('hidden');
    return;
  }
  subnav.classList.remove('hidden');

  const inner = subnav.querySelector('.page-subnav__inner');
  if (!inner) return;

  const links = [...document.querySelectorAll('[data-page-section][id]')]
    .filter((el) => {
      const sectionId = el.getAttribute('data-page-section') || '';
      if (!sectionId || SUBNAV_EXCLUDE.has(sectionId)) return false;
      if (sections[sectionId]?.enabled === false) return false;
      if (el.classList.contains('hidden')) return false;
      return true;
    })
    .map((el) => {
      const sectionId = el.getAttribute('data-page-section') || '';
      return {
        el,
        order: resolveSectionOrder(sectionId, sections, domOrder),
        domIndex: domOrder[sectionId] ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order || a.domIndex - b.domIndex);

  if (!links.length) {
    subnav.classList.add('hidden');
    return;
  }

  const activeHref = inner.querySelector('.page-subnav__link.active')?.getAttribute('href');

  inner.innerHTML = links
    .map(({ el }, index) => {
      const sectionId = el.getAttribute('data-page-section') || '';
      const config = sections[sectionId] || {};
      const label =
        String(config.navLabel || '').trim() ||
        String(config.title || '').trim() ||
        el.querySelector('[data-cms="title"]')?.textContent?.trim() ||
        sectionId;
      const href = `#${el.id}`;
      const isActive = activeHref === href || (!activeHref && index === 0);
      return `<a href="${href}" class="page-subnav__link${isActive ? ' active' : ''}">${escapeHtml(label)}</a>`;
    })
    .join('');
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
export function applyPageContent(settings) {
  const pageKey = getCurrentPageKey();
  if (!pageKey) return;

  const pageData = settings.pageContent?.[pageKey];
  if (!pageData?.sections) return;

  const sections = pageData.sections;
  const domOrder = getDomSectionOrder();

  reorderSections(sections, domOrder);
  syncPageSubnav(sections, domOrder);

  Object.entries(sections).forEach(([sectionId, sectionConfig]) => {
    const sectionEl = document.querySelector(`[data-page-section="${sectionId}"]`);
    if (!sectionEl) return;
    if (sectionId === 'subnav') {
      sectionEl.classList.toggle('hidden', sectionConfig.enabled === false);
      return;
    }
    sectionEl.classList.toggle('hidden', sectionConfig.enabled === false);
    applySectionContent(sectionConfig, sectionEl);
  });

  syncPageSubnav(sections, domOrder);
  document.dispatchEvent(new CustomEvent('page-subnav-updated'));
}
