/**
 * 前台分页工具
 */

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
 * @param {number} pageSize
 * @returns {PaginateResult}
 */
export function paginateItems(items, page, pageSize) {
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
 * 生成分页页码序列（含省略）
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
 * @typedef {Object} PaginationMountOptions
 * @property {HTMLElement | null} container
 * @property {number} page
 * @property {number} totalPages
 * @property {number} total
 * @property {number} pageSize
 * @property {(page: number) => void} onPageChange
 * @property {string} [ariaLabel]
 */

/**
 * 渲染分页控件
 * @param {PaginationMountOptions} options
 */
export function mountPagination(options) {
  const {
    container,
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
    ariaLabel = '分页导航',
  } = options;

  if (!container) return;

  if (total <= pageSize) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  const numbers = buildPageNumbers(page, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  container.innerHTML = `
    <nav class="pagination" aria-label="${ariaLabel}">
      <p class="pagination__info">共 ${total} 条，显示 ${start}–${end}</p>
      <div class="pagination__pages">
        <button type="button" class="pagination__btn" data-page="prev" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        ${numbers
          .map((num) => {
            if (num === 'ellipsis') {
              return '<span class="pagination__ellipsis" aria-hidden="true">…</span>';
            }
            return `<button type="button" class="pagination__num${num === page ? ' active' : ''}" data-page="${num}" aria-current="${num === page ? 'page' : 'false'}">${num}</button>`;
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
