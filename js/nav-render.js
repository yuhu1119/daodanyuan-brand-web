/**
 * 半 CMS：主导航渲染
 */

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
 * @param {import('./site-settings.js').SiteNavItem} item
 * @returns {string}
 */
function renderNavItem(item) {
  if (!item.enabled) return '';

  if (item.type === 'dropdown' && item.children?.length) {
    const children = item.children
      .filter((child) => child.enabled !== false)
      .map((child) => {
        const attrs = child.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(child.href)}" class="nav__dropdown-item"${attrs}>${escapeHtml(child.label)}</a>`;
      })
      .join('');

    if (!children) return '';

    return `
      <div class="nav__dropdown">
        <a href="${escapeHtml(item.href)}" class="nav__link nav__link--trigger">${escapeHtml(item.label)} <span class="nav__caret" aria-hidden="true">▾</span></a>
        <div class="nav__dropdown-menu">${children}</div>
      </div>`;
  }

  return `<a href="${escapeHtml(item.href)}" class="nav__link">${escapeHtml(item.label)}</a>`;
}

/**
 * @param {import('./site-settings.js').SiteSettings} settings
 */
export function applyNav(settings) {
  const container = document.getElementById('site-nav-links');
  if (!container) return;

  const nav = (settings.nav || [])
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  container.innerHTML = nav.map(renderNavItem).join('');
}
