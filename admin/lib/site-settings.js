/**
 * 网站配置默认值与规范化
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = resolve(__dirname, '../../data/settings.json');

import { DEFAULT_NAV, normalizeNav, normalizePageContent } from './cms-defaults.js';

/** @type {import('../types.js').SiteSocialItem[]} */
const DEFAULT_SOCIAL = [
  {
    id: 'wechat',
    name: '微信公众号',
    account: '道丹元',
    url: '#',
    qrcode: '/images/social/wechat-qr.png',
    icon: '/images/social/wechat.png',
  },
  {
    id: 'weibo',
    name: '微博',
    account: '@道丹元官方',
    url: '#',
    qrcode: '/images/social/weibo-qr.png',
    icon: '/images/social/weibo.png',
  },
  {
    id: 'douyin',
    name: '抖音',
    account: '道丹元官方',
    url: '#',
    qrcode: '/images/social/douyin-qr.png',
    icon: '/images/social/douyin.png',
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    account: '九解丹',
    url: '#',
    qrcode: '/images/social/xiaohongshu-qr.png',
    icon: '/images/social/xiaohongshu.png',
  },
];

/** @returns {import('../types.js').SiteSettings} */
export function getDefaultSettings() {
  if (existsSync(DEFAULT_FILE)) {
    return JSON.parse(readFileSync(DEFAULT_FILE, 'utf-8'));
  }
  return {
    seo: { defaultTitle: '道丹元', defaultDescription: '', defaultKeywords: '', pages: {} },
    analytics: { trackPageviews: true, baiduSiteId: '', googleAnalyticsId: '', customHeadScript: '' },
    contact: {},
    footer: {},
    social: DEFAULT_SOCIAL,
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {import('../types.js').SiteSettings}
 */
export function normalizeSettings(raw) {
  const defaults = getDefaultSettings();
  const pages = { ...defaults.seo?.pages, ...(raw.seo?.pages || {}) };
  const normalizedPages = {};
  for (const [key, page] of Object.entries(pages)) {
    normalizedPages[key] = {
      title: String(page?.title || '').trim(),
      description: String(page?.description || '').trim(),
      keywords: String(page?.keywords || '').trim(),
    };
  }

  const social = Array.isArray(raw.social)
    ? raw.social.map((item, index) => ({
        id: String(item.id || `social-${index + 1}`).trim(),
        name: String(item.name || '').trim(),
        account: String(item.account || '').trim(),
        url: String(item.url || '#').trim(),
        qrcode: String(item.qrcode || '').trim(),
        icon: String(item.icon || '').trim() || String(item.name || '').slice(0, 1),
      }))
    : defaults.social || [];

  return {
    site: {
      enabled: raw.site?.enabled !== false,
      name: String(raw.site?.name ?? defaults.site?.name ?? '').trim(),
      logo: String(raw.site?.logo || '').trim(),
      logoIconText: String(raw.site?.logoIconText ?? defaults.site?.logoIconText ?? '').trim(),
      favicon: String(raw.site?.favicon || '').trim(),
      maintenanceTitle: String(raw.site?.maintenanceTitle ?? defaults.site?.maintenanceTitle ?? '').trim(),
      maintenanceMessage: String(raw.site?.maintenanceMessage ?? defaults.site?.maintenanceMessage ?? '').trim(),
    },
    seo: {
      defaultTitle: String(raw.seo?.defaultTitle || defaults.seo?.defaultTitle || '').trim(),
      defaultDescription: String(raw.seo?.defaultDescription || defaults.seo?.defaultDescription || '').trim(),
      defaultKeywords: String(raw.seo?.defaultKeywords || defaults.seo?.defaultKeywords || '').trim(),
      pages: normalizedPages,
    },
    analytics: {
      trackPageviews: raw.analytics?.trackPageviews !== false,
      baiduSiteId: String(raw.analytics?.baiduSiteId || '').trim(),
      googleAnalyticsId: String(raw.analytics?.googleAnalyticsId || '').trim(),
      customHeadScript: String(raw.analytics?.customHeadScript || '').trim(),
    },
    contact: {
      hotline: String(raw.contact?.hotline || '').trim(),
      businessHotline: String(raw.contact?.businessHotline || '').trim(),
      servicePhone: String(raw.contact?.servicePhone || '').trim(),
      businessEmail: String(raw.contact?.businessEmail || '').trim(),
      serviceEmail: String(raw.contact?.serviceEmail || '').trim(),
      address: String(raw.contact?.address || '').trim(),
      workHours: String(raw.contact?.workHours || '').trim(),
      mapCaption: String(raw.contact?.mapCaption || '').trim(),
    },
    footer: {
      brandName: String(raw.footer?.brandName || '').trim(),
      brandProduct: String(raw.footer?.brandProduct || '').trim(),
      brandDesc: String(raw.footer?.brandDesc || '').trim(),
      copyright: String(raw.footer?.copyright || '').trim(),
      icp: String(raw.footer?.icp || '').trim(),
      disclaimer: String(raw.footer?.disclaimer || '').trim(),
    },
    social,
    nav: normalizeNav(raw.nav ?? defaults.nav),
    pageContent: normalizePageContent(raw.pageContent ?? defaults.pageContent),
  };
}
