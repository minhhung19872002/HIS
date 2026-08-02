/**
 * Logger service — home THẬT của log tập trung (relocate từ utils/logger.ts, #services-consolidation).
 *
 * Dùng thay `console.log/info/debug` (dev-only, tự tắt khi build production).
 * `warn`/`error` LUÔN giữ (kể cả prod) vì là cảnh báo/lỗi thật cần quan sát —
 * khớp rule eslint `no-console: { allow: ['warn', 'error'] }`.
 *
 * Bật/tắt debug qua localStorage: `localStorage.setItem('debug', '1')`.
 */

import { isDev } from '../config/env.config';

function debugEnabled(): boolean {
  if (isDev) return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('debug') === '1';
  } catch {
    return false;
  }
}

export const logger = {
  /** Log chẩn đoán — chỉ hiện ở dev hoặc khi bật localStorage.debug=1. */
  debug(...args: unknown[]): void {
    if (debugEnabled()) console.warn('[debug]', ...args);
  },
  /** Thông tin — chỉ hiện ở dev. */
  info(...args: unknown[]): void {
    if (debugEnabled()) console.warn('[info]', ...args);
  },
  /** Cảnh báo — luôn hiện (kênh chuẩn cho lỗi API expected). */
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  /** Lỗi — luôn hiện. */
  error(...args: unknown[]): void {
    console.error(...args);
  },
};

export default logger;
