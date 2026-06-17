/**
 * 新闻详情页脚本
 */
import { getNewsById } from './news-data.js';
import { renderNewsBlock } from './news-render.js';
import { initSiteConfig, applyOpenGraph } from './site-config.js';

/** 初始化新闻详情 */
function initNewsDetail() {
  const root = document.querySelector('.news-article');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const article = id ? getNewsById(id) : null;

  const titleEl = document.getElementById('news-title');
  const dateEl = document.getElementById('news-date');
  const contentEl = document.getElementById('news-content');
  const coverEl = document.getElementById('news-cover');

  if (!article) {
    document.title = '文章未找到 - 道丹元';
    if (titleEl) titleEl.textContent = '未找到该新闻';
    if (contentEl) {
      contentEl.innerHTML = '<p class="news-article__empty">您访问的新闻不存在或已下线，请返回列表查看其他内容。</p>';
    }
    return;
  }

  if (article.link) {
    window.location.replace(article.link);
    return;
  }

  document.title = `${article.title} - 道丹元`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', article.excerpt);
  applyOpenGraph({
    title: document.title,
    description: article.excerpt,
    image: article.cover ? new URL(article.cover, window.location.origin).href : undefined,
    type: 'article',
  });

  if (titleEl) titleEl.textContent = article.title;
  if (dateEl) {
    dateEl.textContent = article.date;
    dateEl.setAttribute('datetime', article.date);
  }
  if (coverEl) {
    coverEl.innerHTML = `<img src="${article.cover}" alt="${article.title}">`;
  }
  if (contentEl) {
    contentEl.innerHTML = article.blocks.map(renderNewsBlock).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSiteConfig().then((active) => {
    if (active) initNewsDetail();
  });
});
