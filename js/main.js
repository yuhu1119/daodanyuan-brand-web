/**
 * 道丹元官网 - 公共交互脚本
 */
import { initNewsList, initNewsPreview, setNewsCategory } from './news-render.js';
import { initHeroBanner } from './banner-render.js';
import { initSiteConfig, initContactCooldown, markContactSubmitted } from './site-config.js';

/** 初始化页面通用功能 */
async function initSite() {
  const active = await initSiteConfig();
  if (!active) return;

  initHeader();
  initMobileNav();
  initNavDropdown();
  initNewsList();
  initNewsPreview();
  initScrollAnimations();
  initNewsTabs();
  initContactForm();
  initContactCooldown();
  initHeroBanner();
  initFaq();
  initPageSubnav();
  highlightActiveNav();
}

/**
 * 头部滚动效果
 */
function initHeader() {
  const header = document.querySelector('.site-top');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * 移动端导航菜单
 */
function initMobileNav() {
  const menuBtn = document.querySelector('.header__menu-btn');
  const nav = document.querySelector('.nav');
  const overlay = document.querySelector('.nav-overlay');
  if (!menuBtn || !nav) return;

  /**
   * @param {boolean} open
   */
  const setMenuOpen = (open) => {
    menuBtn.classList.toggle('active', open);
    nav.classList.toggle('open', open);
    overlay?.classList.toggle('is-visible', open);
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    overlay?.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  menuBtn.addEventListener('click', () => {
    setMenuOpen(!nav.classList.contains('open'));
  });

  overlay?.addEventListener('click', () => setMenuOpen(false));

  document.querySelector('.nav__close-btn')?.addEventListener('click', () => setMenuOpen(false));

  nav.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      if (link.classList.contains('nav__link--trigger') && window.innerWidth <= 991) {
        return;
      }
      setMenuOpen(false);
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 991 && nav.classList.contains('open')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setMenuOpen(false);
    }
  });
}

/**
 * 导航下拉菜单（移动端展开）
 */
function initNavDropdown() {
  document.querySelectorAll('.nav__dropdown').forEach((dropdown) => {
    const trigger = dropdown.querySelector('.nav__link--trigger');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      if (window.innerWidth > 991) return;

      if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        return;
      }

      e.preventDefault();
      document.querySelectorAll('.nav__dropdown.open').forEach((item) => {
        if (item !== dropdown) item.classList.remove('open');
      });
      dropdown.classList.add('open');
    });

    dropdown.querySelectorAll('.nav__dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const nav = document.querySelector('.nav');
        const menuBtn = document.querySelector('.header__menu-btn');
        const overlay = document.querySelector('.nav-overlay');
        nav?.classList.remove('open');
        menuBtn?.classList.remove('active');
        overlay?.classList.remove('is-visible');
        document.body.classList.remove('nav-open');
        menuBtn?.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('open');
      });
    });
  });
}

/**
 * 滚动渐入动画
 */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/**
 * 新闻页标签切换（联动分页）
 */
function initNewsTabs() {
  const tabs = document.querySelectorAll('.news-tab');
  const grid = document.querySelector('#news-grid');
  if (!tabs.length || !grid) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      setNewsCategory(tab.dataset.category || 'all');
    });
  });
}

/**
 * 显示页面提示
 * @param {string} message
 * @param {'info' | 'error'} [type]
 */
function showToast(message, type = 'info') {
  let toast = document.querySelector('.site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'site-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('is-error', type === 'error');
  toast.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
}

/**
 * 联系表单提交
 */
function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    const fd = new FormData(form);

    if (fd.get('website')) return;

    btn.disabled = true;
    btn.textContent = '提交中…';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          phone: fd.get('phone'),
          email: fd.get('email'),
          type: fd.get('type'),
          message: fd.get('message'),
          website: fd.get('website'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          markContactSubmitted();
          initContactCooldown();
          const mins = data.retryAfter ? Math.ceil(data.retryAfter / 60) : 15;
          throw new Error(data.error || `15 分钟内只能提交一次，请 ${mins} 分钟后再试`);
        }
        throw new Error(data.error || '提交失败，请稍后重试');
      }

      markContactSubmitted();
      initContactCooldown();
      btn.textContent = '提交成功，我们会尽快联系您';
      form.reset();
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    } catch (err) {
      btn.textContent = originalText;
      btn.disabled = false;
      showToast(err.message || '提交失败，请稍后重试', 'error');
    }
  });
}

/**
 * 常见问题手风琴
 */
function initFaq() {
  document.querySelectorAll('.faq-item').forEach((item, index) => {
    const btn = item.querySelector('.faq-item__question');
    const answer = item.querySelector('.faq-item__answer');
    if (!btn) return;

    const answerId = answer?.id || `faq-answer-${index}`;
    if (answer && !answer.id) answer.id = answerId;
    btn.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
    btn.setAttribute('aria-controls', answerId);

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((el) => {
        el.classList.remove('open');
        el.querySelector('.faq-item__question')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/**
 * 子页面锚点导航高亮
 */
function initPageSubnav() {
  const subnav = document.querySelector('.page-subnav');
  if (!subnav) return;

  const bindSubnav = () => {
    const links = subnav.querySelectorAll('.page-subnav__link');
    const sections = Array.from(links)
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    const onScroll = () => {
      const scrollY = window.scrollY + 140;
      let active = sections[0];

      sections.forEach((section) => {
        if (section.offsetTop <= scrollY) active = section;
      });

      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${active.id}`);
      });
    };

    window.removeEventListener('scroll', subnav._scrollHandler || (() => {}));
    subnav._scrollHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  bindSubnav();
  document.addEventListener('page-subnav-updated', bindSubnav);
}

/**
 * 高亮当前页面导航项
 */
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const jiujiedanPages = [
    'jiujiedan.html',
    'jiujiedan-classic.html',
    'jiujiedan-business.html',
    'jiujiedan-gift.html',
  ];

  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href');
    const isJiujiedanSection = href === 'jiujiedan.html' && jiujiedanPages.includes(currentPage);
    if (href === currentPage || (currentPage === '' && href === 'index.html') || isJiujiedanSection) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.nav__dropdown-item').forEach((item) => {
    const href = item.getAttribute('href');
    if (href === currentPage) {
      item.classList.add('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSite().catch(() => {});
});
