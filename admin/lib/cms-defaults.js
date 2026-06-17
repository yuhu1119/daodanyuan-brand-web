/**
 * 半 CMS 默认导航与页面模块配置
 */

/** @type {import('../types.js').NavItem[]} */
export const DEFAULT_NAV = [
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

/** @type {Record<string, string>} */
export const PAGE_LABELS = {
  index: '首页',
  about: '关于我们',
  jiujiedan: '九解丹',
  technology: '创新技术',
  business: '商务合作',
};

/** @type {Record<string, Record<string, string>>} */
export const SECTION_LABELS = {
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

/** @type {Record<string, Record<string, string>>} */
export const FIELD_LABELS = {
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
  navLabel: '导航显示名',
};

/** @type {Record<string, { sections: Record<string, object> }>} */
export const DEFAULT_PAGE_CONTENT = {
  index: {
    sections: {
      intro: {
        enabled: true,
        order: 1,
        title: '企业简介',
        desc: '道丹元专注东方草本健康饮品，以科学验证与品质管控构建企业信誉',
        heading: '专注实业 · 坚守品质',
        body1: '道丹元坚持发展实体经济，深耕草本饮品先进制造。公司建有标准化生产基地与质量检测中心，构建「总部—区域—分公司」三级质量管控体系，旗下九解丹产品面向商务应酬、高端宴请与企业团购等场景。',
        body2: '品牌的基石，一半是质量，一半是诚信。我们始终严控质量，以合规、体面的方式让本草走进现代商务生活。',
        buttonText: '了解更多 →',
        buttonHref: 'about.html',
      },
      news: {
        enabled: true,
        order: 2,
        title: '最新资讯',
        moreText: '查看更多 →',
        moreHref: 'news.html',
      },
      tech: {
        enabled: true,
        order: 3,
        title: '技术与品控亮点',
        desc: '从配方研发到批次放行，全链路品质管控',
        buttonText: '探索创新技术 →',
        buttonHref: 'technology.html',
      },
      scenes: {
        enabled: true,
        order: 4,
        title: '多元渠道 · 共创增长',
        desc: '经销商加盟、企业团购、餐饮渠道，精准匹配您的商业场景',
      },
      products: {
        enabled: true,
        order: 5,
        title: '九解丹全系产品',
        desc: '经典版 · 商务版 · 礼遇版，覆盖日常、商务与赠礼场景',
        buttonText: '了解九解丹品牌',
        buttonHref: 'jiujiedan.html#products',
      },
    },
  },
  about: {
    sections: {
      banner: {
        enabled: true,
        order: 1,
        title: '关于我们',
        desc: '了解道丹元 · 传承东方草本智慧，以科技创新服务现代健康需求',
        bgImage: '/images/brand/hero-1.jpg',
      },
      subnav: { enabled: true, order: 2 },
      profile: {
        enabled: true,
        order: 3,
        title: '公司简介',
        navLabel: '公司简介',
        body1: '道丹元是一家专注于东方草本健康饮品研发、生产与推广的企业。公司坚持实业固本、品质为先，在巩固饮品制造能力的同时，积极向大健康与药食同源领域拓展。',
        body2: '旗下核心产品「九解丹」面向商务应酬、高端宴请与企业团购等场景。公司总部位于深圳，拥有标准化生产基地、研发中心与质量检测中心。',
      },
      team: {
        enabled: true,
        order: 4,
        title: '核心团队',
        navLabel: '管理团队',
        desc: '跨界融合草本研究、食品工程与商业运营经验',
      },
      culture: {
        enabled: true,
        order: 5,
        title: '使命 · 愿景 · 价值观',
        navLabel: '企业文化',
      },
      responsibility: {
        enabled: true,
        order: 6,
        title: '践行责任 · 回馈社会',
        navLabel: '社会责任',
      },
    },
  },
  jiujiedan: {
    sections: {
      hero: {
        enabled: true,
        order: 1,
        title: '一饮九解 自在逍遥',
        subtitle: '九解丹 · 草本植物饮',
        tagline: '师承古方 · 科学赋能 · 道法自然',
        btn1Text: '了解九大解法',
        btn1Href: '#nine-scenes',
        btn2Text: '商务合作咨询',
        btn2Href: 'business.html',
        bgImage: '/images/brand/hero-2.jpg',
      },
      subnav: { enabled: true, order: 2 },
      advantages: {
        enabled: true,
        order: 3,
        title: '核心优势',
        navLabel: '核心优势',
      },
      'nine-scenes': {
        enabled: true,
        order: 4,
        title: '九大解法 解锁自在生活',
        navLabel: '九大解法',
      },
      products: {
        enabled: true,
        order: 5,
        title: '九解丹全系产品',
        navLabel: '全系产品',
        desc: '经典版 · 商务版 · 礼遇版，覆盖日常、商务与赠礼场景',
      },
      philosophy: {
        enabled: true,
        order: 6,
        title: '品牌理念 · 品质保障',
        navLabel: '品牌理念',
      },
      cta: {
        enabled: true,
        order: 7,
        title: '一饮九解 自在逍遥',
        desc: '个人选购 · 批量采购 · 礼品定制 一站式服务',
        btn1Text: '立即咨询',
        btn1Href: 'contact.html',
        btn2Text: '批量采购',
        btn2Href: 'business.html#group',
      },
    },
  },
  technology: {
    sections: {
      banner: {
        enabled: true,
        order: 1,
        title: '创新技术',
        desc: '研发驱动 · 品质为本 · 构建信任壁垒',
        bgImage: '/images/brand/hero-1.jpg',
      },
      subnav: { enabled: true, order: 2 },
      rd: {
        enabled: true,
        order: 3,
        title: '科研团队 · 技术平台',
        navLabel: '研发实力',
      },
      formula: {
        enabled: true,
        order: 4,
        title: '1+1 > 2 的黄金配比',
        navLabel: '草本配方',
        desc: '古籍为源，科学验证，精准复配',
      },
      process: {
        enabled: true,
        order: 5,
        title: '纳米包埋 · 三步吸收',
        navLabel: '生产工艺',
        desc: '怎样实现口服也能高效吸收？',
      },
      testing: {
        enabled: true,
        order: 6,
        title: '全流程 · 可验证',
        navLabel: '检测体系',
      },
      quality: {
        enabled: true,
        order: 7,
        title: '体系化 · 常态化',
        navLabel: '质量管理',
      },
    },
  },
  business: {
    sections: {
      banner: {
        enabled: true,
        order: 1,
        title: '商务合作',
        desc: '携手道丹元，共创东方草本商务伴饮新生态',
        bgImage: '/images/brand/hero-1.jpg',
      },
      dealer: {
        enabled: true,
        order: 2,
        title: '覆盖全国的销售与服务网络',
        body1: '道丹元已建立完善的经销商体系与渠道支持政策，从培训赋能到物料供应，从区域保护到联合推广，助力合作伙伴快速开拓市场、持续盈利。',
        buttonText: '立即咨询合作',
        buttonHref: 'contact.html',
      },
      partners: {
        enabled: true,
        order: 3,
        title: '多元合作 · 灵活对接',
      },
      cta: {
        enabled: true,
        order: 4,
        title: '开启',
        em: '合作之旅',
        desc: '无论您是寻求区域代理、企业团购还是餐饮渠道合作，我们都期待与您携手。',
        buttonText: '立即咨询 →',
        buttonHref: 'contact.html',
      },
    },
  },
};

/**
 * @param {unknown} raw
 * @returns {import('../types.js').NavItem[]}
 */
export function normalizeNav(raw) {
  const source = Array.isArray(raw) && raw.length ? raw : DEFAULT_NAV;
  return source
    .map((item, index) => ({
      id: String(item.id || `nav-${index + 1}`).trim(),
      label: String(item.label || '').trim(),
      href: String(item.href || '#').trim(),
      enabled: item.enabled !== false,
      order: Number(item.order) || index + 1,
      type: item.type === 'dropdown' ? 'dropdown' : 'link',
      children: Array.isArray(item.children)
        ? item.children.map((child, childIndex) => ({
            id: String(child.id || `nav-child-${childIndex + 1}`).trim(),
            label: String(child.label || '').trim(),
            href: String(child.href || '#').trim(),
            enabled: child.enabled !== false,
            external: child.external === true,
          }))
        : [],
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * @param {unknown} raw
 * @returns {Record<string, { sections: Record<string, object> }>}
 */
export function normalizePageContent(raw) {
  const result = {};
  for (const [pageKey, defaults] of Object.entries(DEFAULT_PAGE_CONTENT)) {
    const pageRaw = raw?.[pageKey] || {};
    const sections = {};
    const defaultSections = defaults.sections || {};
    const rawSections = pageRaw.sections || {};
    const keys = new Set([...Object.keys(defaultSections), ...Object.keys(rawSections)]);

    for (const sectionId of keys) {
      const base = defaultSections[sectionId] || { enabled: true };
      const patch = rawSections[sectionId] || {};
      const baseOrder = Number(base.order);
      const patchOrder = Number(patch.order);
      sections[sectionId] = {
        ...base,
        ...patch,
        enabled: patch.enabled !== undefined ? patch.enabled !== false : base.enabled !== false,
        order: patchOrder > 0 ? patchOrder : baseOrder > 0 ? baseOrder : 99,
      };
    }

    result[pageKey] = { sections };
  }
  return result;
}
