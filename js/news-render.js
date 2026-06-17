/**
 * 新闻列表与内容渲染
 */
import { NEWS_ARTICLES } from './news-data.js';
import { paginateItems, mountPagination } from './pagination.js';

/** @type {number} */
const NEWS_PAGE_SIZE = 9;

/** @type {string} */
let activeCategory = 'all';

/** @type {number} */
let currentPage = 1;

/**
 * @param {import('./news-data.js').NewsArticle} article
 * @returns {string}
 */
function getArticleHref(article) {
  if (article.link) return article.link;
  return `news-detail.html?id=${article.id}`;
}

/**
 * @param {import('./news-data.js').NewsArticle} article
 * @returns {string}
 */
function getLinkAttrs(article) {
  if (!article.link) return '';
  const target = article.linkTarget || '_blank';
  if (target === '_blank') return ' target="_blank" rel="noopener noreferrer"';
  return '';
}

/**
 * @param {import('./news-data.js').NewsArticle} article
 * @returns {string}
 */
function renderNewsCard(article) {
  const moreLabel = article.link ? '查看详情 →' : '阅读全文 →';
  return `
    <a href="${getArticleHref(article)}" class="news-card fade-in visible" data-category="${article.category}"${getLinkAttrs(article)}>
      <div class="news-card__image">
        <img src="${article.cover}" alt="${article.title}" loading="lazy">
      </div>
      <div class="news-card__body">
        <time class="news-card__date" datetime="${article.date}">${article.date}</time>
        <h3 class="news-card__title">${article.title}</h3>
        <p class="news-card__excerpt">${article.excerpt}</p>
        <span class="news-card__more">${moreLabel}</span>
      </div>
    </a>
  `;
}

/**
 * @returns {import('./news-data.js').NewsArticle[]}
 */
function getFilteredArticles() {
  if (activeCategory === 'all') return NEWS_ARTICLES;
  return NEWS_ARTICLES.filter((article) => article.category === activeCategory);
}

/**
 * 渲染当前页新闻列表
 */
function renderNewsListPage() {
  const grid = document.querySelector('#news-grid');
  const paginationMount = document.querySelector('#news-pagination');
  if (!grid) return;

  const filtered = getFilteredArticles();
  const { items, page, totalPages, total } = paginateItems(filtered, currentPage, NEWS_PAGE_SIZE);
  currentPage = page;

  if (!total) {
    grid.innerHTML = '<p class="news-empty">暂无相关新闻</p>';
    if (paginationMount) {
      paginationMount.innerHTML = '';
      paginationMount.classList.add('hidden');
    }
    return;
  }

  grid.innerHTML = items.map(renderNewsCard).join('');

  mountPagination({
    container: paginationMount,
    page,
    totalPages,
    total,
    pageSize: NEWS_PAGE_SIZE,
    onPageChange: (nextPage) => {
      currentPage = nextPage;
      renderNewsListPage();
      document.querySelector('#news-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });
}

/**
 * 渲染新闻列表页（含分类与分页）
 */
export function initNewsList() {
  const grid = document.querySelector('#news-grid');
  if (!grid) return;

  activeCategory = 'all';
  currentPage = 1;
  renderNewsListPage();
}

/**
 * 切换新闻分类并重置分页
 * @param {string} category
 */
export function setNewsCategory(category) {
  activeCategory = category;
  currentPage = 1;
  renderNewsListPage();
}

/**
 * 渲染首页新闻精选
 */
export function initNewsPreview() {
  const grid = document.querySelector('#news-preview-grid');
  if (!grid) return;

  grid.innerHTML = NEWS_ARTICLES.slice(0, 3).map(renderNewsCard).join('');
}

/**
 * 渲染详情页内容块
 * @param {import('./news-data.js').NewsBlock} block
 * @returns {string}
 */
export function renderNewsBlock(block) {
  if (block.type === 'text') {
    return `<div class="news-article__text">${block.html}</div>`;
  }

  if (block.type === 'image') {
    const caption = block.caption
      ? `<figcaption class="news-article__caption">${block.caption}</figcaption>`
      : '';
    return `
      <figure class="news-article__figure">
        <img src="${block.src}" alt="${block.alt || ''}" loading="lazy">
        ${caption}
      </figure>
    `;
  }

  if (block.type === 'video') {
    const caption = block.caption
      ? `<figcaption class="news-article__caption">${block.caption}</figcaption>`
      : '';
    return `
      <figure class="news-article__figure news-article__figure--video">
        <video class="news-article__video" controls playsinline preload="metadata"${block.poster ? ` poster="${block.poster}"` : ''}>
          <source src="${block.src}" type="video/mp4">
          您的浏览器不支持视频播放。
        </video>
        ${caption}
      </figure>
    `;
  }

  return '';
}
