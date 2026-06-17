/**
 * 本地时区当天日期 YYYY-MM-DD
 * @returns {string}
 */
export function todayDateLocal() {
  return new Date().toLocaleDateString('sv-SE');
}
