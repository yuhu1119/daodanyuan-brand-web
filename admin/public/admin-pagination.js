/**
 * 后台分页工具
 */

/** @type {number} */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * @typedef {Object} PaginateResult
 * @property {unknown[]} items
 * @property {number} page
 * @property {number} totalPages
 * @property {number} total
 */

/**
 * @param {unknown[]} items
 * @param {number} page
 * @param {number} [pageSize]
 * @returns {PaginateResult}
 */
export function paginateSlice(items, page, pageSize = DEFAULT_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}

/**
 * @param {number} current
 * @param {number} totalPages
 * @returns {Array<number | 'ellipsis'>}
 */
export function buildPageNumbers(current, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  /** @type {Array<number | 'ellipsis'>} */
  const result = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  });

  return result;
}

/**
 * @typedef {Object} RenderPaginationOptions
 * @property {HTMLElement | null} container
 * @property {number} page
 * @property {number} totalPages
 * @property {number} total
 * @property {number} pageSize
 * @property {(page: number) => void} onPageChange
 * @property {string} [unit]
 */

/**
 * 渲染后台分页条
 * @param {RenderPaginationOptions} options
 */
export function renderPaginationBar(options) {
  const {
    container,
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
    unit = '条',
  } = options;

  if (!container) return;

  if (total <= pageSize) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const numbers = buildPageNumbers(page, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  container.innerHTML = `
    <nav class="pagination" aria-label="列表分页">
      <span class="pagination__info">共 ${total} ${unit}，第 ${page}/${totalPages} 页（${start}–${end}）</span>
      <div class="pagination__pages">
        <button type="button" class="pagination__btn" data-page="prev" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        ${numbers
          .map((num) => {
            if (num === 'ellipsis') {
              return '<span class="pagination__ellipsis">…</span>';
            }
            return `<button type="button" class="pagination__num${num === page ? ' active' : ''}" data-page="${num}">${num}</button>`;
          })
          .join('')}
        <button type="button" class="pagination__btn" data-page="next" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
    </nav>
  `;

  container.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute('data-page');
      if (!value || btn.disabled) return;
      if (value === 'prev') onPageChange(page - 1);
      else if (value === 'next') onPageChange(page + 1);
      else onPageChange(Number(value));
    });
  });
}

/**
 * 对已有 DOM 列表项做分页显隐（保留表单值）
 * @param {string} itemSelector
 * @param {number} page
 * @param {number} pageSize
 * @returns {{ page: number, totalPages: number, total: number }}
 */
export function applyDomListPagination(itemSelector, page, pageSize) {
  const items = [...document.querySelectorAll(itemSelector)];
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  items.forEach((el, index) => {
    const itemPage = Math.floor(index / pageSize) + 1;
    el.classList.toggle('hidden', itemPage !== safePage);
  });

  return { page: safePage, totalPages, total };
}

/**
 * @typedef {Object} DomPaginatorOptions
 * @property {HTMLElement | null} container
 * @property {string} itemSelector
 * @property {number} pageSize
 * @property {string} [unit]
 */

/**
 * 创建 DOM 列表分页控制器（用于 CMS 表单类列表）
 * @param {DomPaginatorOptions} options
 */
export function createDomPaginator(options) {
  const { container, itemSelector, pageSize, unit = '项' } = options;
  let page = 1;

  /**
   * @param {boolean} [reset]
   */
  function refresh(reset = false) {
    if (reset) page = 1;
    const result = applyDomListPagination(itemSelector, page, pageSize);
    page = result.page;
    renderPaginationBar({
      container,
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      pageSize,
      unit,
      onPageChange: (next) => {
        page = next;
        refresh();
      },
    });
  }

  return {
    refresh,
    reset: () => refresh(true),
  };
}
