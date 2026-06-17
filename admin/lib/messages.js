/** @type {Record<string, string>} */
export const CONTACT_TYPES = {
  product: '产品咨询',
  business: '商务合作',
  dealer: '经销商加盟',
  group: '企业团购',
  restaurant: '餐饮合作',
  media: '媒体采访',
  other: '其他',
};

/** @type {Record<string, string>} */
export const MESSAGE_STATUS_LABELS = {
  pending: '待处理',
  read: '已读',
  done: '已处理',
};

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidDateStr(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

/**
 * @param {string} iso
 * @returns {number}
 */
function parseCreatedAt(iso) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * @param {import('../types.js').ContactMessage[]} messages
 * @param {{ type?: string, status?: string, from?: string, to?: string }} query
 * @returns {import('../types.js').ContactMessage[]}
 */
export function filterMessages(messages, query = {}) {
  let list = messages;
  const { type, status, from, to } = query;

  if (type && type !== 'all' && CONTACT_TYPES[type]) {
    list = list.filter((m) => m.type === type);
  }
  if (status && status !== 'all' && MESSAGE_STATUS_LABELS[status]) {
    list = list.filter((m) => m.status === status);
  }

  const startMs = from && isValidDateStr(from) ? new Date(`${from}T00:00:00`).getTime() : null;
  const endMs = to && isValidDateStr(to) ? new Date(`${to}T23:59:59.999`).getTime() : null;

  if (startMs != null) {
    list = list.filter((m) => parseCreatedAt(m.createdAt) >= startMs);
  }
  if (endMs != null) {
    list = list.filter((m) => parseCreatedAt(m.createdAt) <= endMs);
  }

  return list;
}

/**
 * @param {string} value
 * @returns {string}
 */
function csvCell(value) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

/**
 * @param {string} iso
 * @returns {string}
 */
function formatExportDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/**
 * @param {import('../types.js').ContactMessage[]} messages
 * @returns {string}
 */
export function messagesToCsv(messages) {
  const header = ['提交时间', '姓名', '电话', '邮箱', '咨询类型', '状态', '留言内容'];
  const rows = messages.map((m) => [
    formatExportDateTime(m.createdAt),
    m.name,
    m.phone,
    m.email || '',
    CONTACT_TYPES[m.type] || m.type,
    MESSAGE_STATUS_LABELS[m.status] || m.status,
    m.message,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
