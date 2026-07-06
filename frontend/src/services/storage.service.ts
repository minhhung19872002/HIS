/**
 * Storage service — typed localStorage wrapper, single home. #services-consolidation
 *
 * STORAGE_KEYS gom các key thực tế đang dùng trong app (grep từ call-site). `storage`
 * bọc try/catch + JSON-safety để tránh crash ở private-mode / quota / JSON hỏng.
 *
 * ADDITIVE: KHÔNG migrate 29 call-site localStorage.* hiện có — code mới sẽ dùng dần.
 */

export const STORAGE_KEYS = {
  /** JWT — lưu dạng chuỗi thô (dùng getRaw/setToken, KHÔNG JSON). */
  token: 'token',
  /** User đăng nhập — lưu dạng JSON. */
  user: 'user',
  /** 'v1' | 'v2' — layout đang chọn. */
  layoutMode: 'layoutMode',
  /** '1' để bật log debug (xem utils/logger.ts). */
  debug: 'debug',
  /** Bệnh nhân đang chọn trên ticker (JSON). */
  patient: 'his.patient',
  /** Chế độ sáng/tối chung (ThemeContext). */
  themeMode: 'his-theme-mode',
  /** Dark-mode riêng của RIS viewer. */
  risDarkMode: 'ris-dark-mode',
  /** Template vật tư của OPD (JSON). */
  opdSupplyTemplates: 'opd_supply_templates',
  /** Cấu hình backup (JSON). */
  backupConfig: 'his_backup_config',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const storage = {
  /** Đọc chuỗi thô (không parse JSON) — dùng cho token và các giá trị string. */
  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /** Đọc + JSON.parse an toàn. Trả null nếu thiếu / JSON hỏng. */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /** Ghi. Chuỗi lưu thô; còn lại JSON.stringify. Nuốt lỗi quota/private-mode. */
  set(key: string, val: unknown): void {
    try {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch {
      /* ignore quota / private-mode */
    }
  },

  /** Xoá key. */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
