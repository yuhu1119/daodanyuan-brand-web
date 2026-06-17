/**
 * 前台网站配置应用：SEO、统计、联系信息、社交二维码、站点品牌等
 */
import { SITE_SETTINGS } from './site-settings.js';
import { applyNav } from './nav-render.js';
import { applyPageContent } from './page-content.js';

const CONTACT_COOLDOWN_KEY = 'ddy_contact_submit_at';
const CONTACT_COOLDOWN_MS = 15 * 60 * 1000;

const PAGE_KEYS = {
  'index.html': 'index',
  '': 'index',
  'about.html': 'about',
  'products.html': 'products',
  'technology.html': 'technology',
  'news.html': 'news',
  'news-detail.html': 'news-detail',
  'business.html': 'business',
  'contact.html': 'contact',
};

/**
 * @returns {Promise<import('./site-settings.js').SiteSettings>}
 */
async function loadSettings() {
  const cacheBust = `${Date.now()}`;
  try {
    const res = await fetch('/api/public/settings', { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch {
    /* 静态站或开发环境回退 */
  }
  try {
    const res = await fetch(`/data/settings.json?v=${cacheBust}`, { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch {
    /* 纯静态包回退 */
  }
  return SITE_SETTINGS;
}

/**
 * @param {object} obj
 * @param {string} path
 */
function getSettingValue(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

/**
 * @param {string} name
 * @param {string} content
 */
function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * @param {string} property
 * @param {string} content
 */
function setOgMeta(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * @param {{ title?: string, description?: string, image?: string, type?: string }} opts
 */
export function applyOpenGraph(opts) {
  const title = opts.title || document.title;
  const description = opts.description || document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const url = window.location.href;
  const image = opts.image || new URL('/images/brand/hero-1.jpg', window.location.origin).href;

  setOgMeta('og:title', title);
  setOgMeta('og:description', description);
  setOgMeta('og:type', opts.type || 'website');
  setOgMeta('og:url', url);
  setOgMeta('og:locale', 'zh_CN');
  if (image) setOgMeta('og:image', image);

  setMeta('twitter:card', 'summary_large_image');
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (!twitterTitle) {
    twitterTitle = document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    document.head.appendChild(twitterTitle);
  }
  twitterTitle.setAttribute('content', title);
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applySeo(settings) {
  const pageName = window.location.pathname.split('/').pop() || 'index.html';
  const pageKey = PAGE_KEYS[pageName] || 'index';
  const pageSeo = settings.seo?.pages?.[pageKey] || {};
  if (pageKey === 'news-detail') return;

  const title = pageSeo.title || settings.seo?.defaultTitle;
  const description = pageSeo.description || settings.seo?.defaultDescription;
  const keywords = pageSeo.keywords || settings.seo?.defaultKeywords;

  if (title) document.title = title;
  setMeta('description', description);
  setMeta('keywords', keywords);
  applyOpenGraph({ title, description });
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applyAnalytics(settings) {
  const { analytics } = settings;
  if (!analytics) return;

  if (analytics.baiduSiteId) {
    const script = document.createElement('script');
    script.textContent = `var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?${analytics.baiduSiteId}";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();`;
    document.head.appendChild(script);
  }

  if (analytics.googleAnalyticsId) {
    const gid = analytics.googleAnalyticsId;
    const loader = document.createElement('script');
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${gid}`;
    document.head.appendChild(loader);
    const inline = document.createElement('script');
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gid}');`;
    document.head.appendChild(inline);
  }

  if (analytics.customHeadScript) {
    const wrap = document.createElement('div');
    wrap.innerHTML = analytics.customHeadScript;
    wrap.querySelectorAll('script').forEach((old) => {
      const script = document.createElement('script');
      if (old.src) script.src = old.src;
      if (old.textContent) script.textContent = old.textContent;
      document.head.appendChild(script);
    });
  }

  if (analytics.trackPageviews) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applySiteBranding(settings) {
  const site = settings.site || {};
  const name = String(site.name || '').trim();
  const logo = String(site.logo || '').trim();
  const iconText = String(site.logoIconText || name.slice(0, 1) || '道').trim();
  const favicon = String(site.favicon || '').trim();

  const logoText = document.getElementById('site-logo-text');
  const logoIcon = document.getElementById('site-logo-icon');
  const logoImg = document.getElementById('site-logo-img');
  const logoLink = document.getElementById('site-logo-link');

  if (logoText && name) logoText.textContent = name;
  if (logoLink && name) logoLink.setAttribute('aria-label', name);

  if (logoImg && logoIcon) {
    if (logo) {
      logoImg.src = logo;
      logoImg.alt = name || '网站 Logo';
      logoImg.classList.remove('hidden');
      logoIcon.classList.add('hidden');
    } else {
      logoImg.removeAttribute('src');
      logoImg.classList.add('hidden');
      logoIcon.textContent = iconText;
      logoIcon.classList.remove('hidden');
    }
  }

  if (favicon) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
}

/**
 * @param {import('./site-settings.js').SiteSettings['site']} site
 */
function showMaintenance(site) {
  const title = site?.maintenanceTitle || '网站维护中';
  const message = site?.maintenanceMessage || '网站暂时无法访问，请稍后再试。';
  const overlay = document.createElement('div');
  overlay.className = 'site-maintenance';
  overlay.innerHTML = `
    <div class="site-maintenance__card">
      <div class="site-maintenance__icon" aria-hidden="true">⏸</div>
      <h1 class="site-maintenance__title">${escapeHtml(title)}</h1>
      <p class="site-maintenance__message">${escapeHtml(message)}</p>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('site-maintenance-active');
}

/**
 * @param {Element} block
 * @returns {Element | null}
 */
function getSiteTextTarget(block) {
  if (block.hasAttribute('data-site')) return block;
  return block.querySelector('[data-site]');
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applyConditionalBlocks(settings) {
  document.querySelectorAll('[data-site-block]').forEach((block) => {
    const key = block.dataset.siteBlock;
    const value = String(getSettingValue(settings, key) || '').trim();
    const visible = Boolean(value);

    block.classList.toggle('hidden', !visible);
    if (!visible) return;

    const textTarget = getSiteTextTarget(block);

    if (block.hasAttribute('data-site-href')) {
      const hrefKey = block.dataset.siteHref || key;
      const hrefValue = String(getSettingValue(settings, hrefKey) || value).trim();
      if (hrefKey.includes('Email')) block.setAttribute('href', `mailto:${hrefValue}`);
      else if (hrefKey.includes('hotline') || hrefKey.includes('Phone')) {
        block.setAttribute('href', `tel:${hrefValue.replace(/-/g, '')}`);
      }
      if (textTarget) textTarget.textContent = hrefValue;
      else block.textContent = hrefValue;
    } else if (textTarget) {
      textTarget.textContent = value;
    } else {
      block.textContent = value;
    }
  });
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applyContactLayout(settings) {
  const contactPanel = document.getElementById('contact-info-panel');
  const contactTitle = document.getElementById('contact-info-title');
  const contactGrid = document.querySelector('.contact-grid');
  const visibleItems = contactPanel?.querySelectorAll('.contact-info__item:not(.hidden)') || [];

  if (contactPanel) {
    const hasItems = visibleItems.length > 0;
    contactPanel.classList.toggle('is-empty', !hasItems);
    contactTitle?.classList.toggle('hidden', !hasItems);
  }
  contactGrid?.classList.toggle('contact-grid--single', contactPanel?.classList.contains('is-empty'));

  const address = String(settings.contact?.address || '').trim();
  const mapCaption = String(settings.contact?.mapCaption || '').trim();
  const mapSection = document.getElementById('contact-map-section');
  if (mapSection) {
    mapSection.classList.toggle('hidden', !address && !mapCaption);
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

/**
 * @param {string} icon
 */
function isSocialIconImage(icon) {
  const value = String(icon || '').trim();
  return /^(https?:\/\/|\/)/.test(value);
}

/**
 * @param {string} icon
 * @param {string} [alt]
 */
function renderSocialIcon(icon, alt = '') {
  const value = String(icon || '').trim();
  if (isSocialIconImage(value)) {
    return `<img src="${escapeAttr(value)}" alt="${escapeAttr(alt)}" class="social-icon-img" loading="lazy">`;
  }
  return escapeHtml(value);
}

/**
 * @param {import('./site-settings.js').SiteSocialItem} item
 */
function renderSocialQrCard(item) {
  const placeholderText = isSocialIconImage(item.icon)
    ? String(item.name || '').slice(0, 1)
    : String(item.icon || '');
  const qr = item.qrcode
    ? `<img src="${escapeAttr(item.qrcode)}" alt="${escapeAttr(item.name)}二维码" loading="lazy">`
    : `<div class="social-qr-card__placeholder">${escapeHtml(placeholderText)}</div>`;
  const linkStart = item.url && item.url !== '#' ? `<a href="${escapeAttr(item.url)}" class="social-qr-card" target="_blank" rel="noopener noreferrer">` : '<div class="social-qr-card">';
  const linkEnd = item.url && item.url !== '#' ? '</a>' : '</div>';
  return `
    ${linkStart}
      <div class="social-qr-card__qr">${qr}</div>
      <div class="social-qr-card__icon">${renderSocialIcon(item.icon, item.name)}</div>
      <div class="social-qr-card__name">${escapeHtml(item.name)}</div>
      <div class="social-qr-card__id">${escapeHtml(item.account)}</div>
    ${linkEnd}`;
}

/**
 * @param {import('./site-settings.js').SiteSocialItem} item
 */
function isSocialVisible(item) {
  return Boolean(String(item.name || '').trim() || String(item.account || '').trim() || String(item.qrcode || '').trim());
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
function applySocial(settings) {
  const social = (settings.social || []).filter(isSocialVisible);
  const contactGrid = document.querySelector('#contact-social-grid');
  const contactSection = document.getElementById('contact-social-section');

  if (contactGrid) {
    contactGrid.innerHTML = social.length ? social.map(renderSocialQrCard).join('') : '';
    contactGrid.classList.toggle('social-grid--empty', !social.length);
  }
  contactSection?.classList.toggle('hidden', !social.length);

  const footerSocial = document.querySelector('#footer-social');
  const footerSocialWrap = document.getElementById('footer-social-wrap');
  if (footerSocial) {
    footerSocial.innerHTML = social
      .map((item) => {
        const qr = item.qrcode
          ? `<img src="${escapeAttr(item.qrcode)}" alt="${escapeAttr(item.name)}">`
          : isSocialIconImage(item.icon)
            ? `<img src="${escapeAttr(item.icon)}" alt="${escapeAttr(item.name)}" class="social-icon-img">`
            : `<span class="footer-social__placeholder">${escapeHtml(item.icon || '')}</span>`;
        return `
        <div class="footer-social__item">
          <button type="button" class="footer-social__btn" aria-label="${escapeAttr(item.name)}">${renderSocialIcon(item.icon, item.name)}</button>
          <div class="footer-social__popup">
            <div class="footer-social__qr">${qr}</div>
            <div class="footer-social__name">${escapeHtml(item.name)}</div>
            <div class="footer-social__account">${escapeHtml(item.account)}</div>
          </div>
        </div>`;
      })
      .join('');
  }
  footerSocialWrap?.classList.toggle('hidden', !social.length);
}

/**
 * @returns {number}
 */
function getContactCooldownRemaining() {
  const last = Number(localStorage.getItem(CONTACT_COOLDOWN_KEY) || 0);
  if (!last) return 0;
  return Math.max(0, CONTACT_COOLDOWN_MS - (Date.now() - last));
}

/**
 * 联系表单冷却与提示
 */
export function initContactCooldown() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  let hint = form.querySelector('.contact-form__hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'contact-form__hint form-hint';
    hint.setAttribute('role', 'status');
    form.insertBefore(hint, form.firstChild);
  }

  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.tabIndex = -1;
  honeypot.autocomplete = 'off';
  honeypot.className = 'contact-form__honeypot';
  honeypot.setAttribute('aria-hidden', 'true');
  form.appendChild(honeypot);

  const submitBtn = form.querySelector('button[type="submit"]');
  let timer;

  const updateUi = () => {
    const remain = getContactCooldownRemaining();
    if (remain > 0) {
      const mins = Math.ceil(remain / 60000);
      hint.textContent = `您已提交过留言，请 ${mins} 分钟后再试（15 分钟内限提交 1 次）`;
      hint.classList.add('is-warning');
      hint.classList.remove('hidden');
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    hint.textContent = '';
    hint.classList.add('hidden');
    hint.classList.remove('is-warning');
    if (submitBtn) submitBtn.disabled = false;
  };

  updateUi();
  timer = setInterval(updateUi, 10000);
  window.addEventListener('beforeunload', () => clearInterval(timer));
}

/** 标记留言提交成功后的冷却 */
export function markContactSubmitted() {
  localStorage.setItem(CONTACT_COOLDOWN_KEY, String(Date.now()));
}

/**
 * 初始化网站配置
 * @returns {Promise<boolean>} 网站是否可用（未停用时为 true）
 */
export async function initSiteConfig() {
  const settings = await loadSettings();

  if (settings.site?.enabled === false) {
    showMaintenance(settings.site);
    return false;
  }

  applySiteBranding(settings);
  applySeo(settings);
  applyAnalytics(settings);
  applyConditionalBlocks(settings);
  applyContactLayout(settings);
  applySocial(settings);
  applyNav(settings);
  applyPageContent(settings);
  return true;
}
