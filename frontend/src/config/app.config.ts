/**
 * Application-level config — hospital identity, app identity, UX defaults.
 * All values read from Vite env vars (set per-deployment in Vercel / .env.local).
 * Consumers import named exports from here — không scatter VITE_* reads khắp codebase.
 */

// ── Hospital identity (#421) ────────────────────────────────────────────────
// Để TRỐNG khi VITE_HOSPITAL_* chưa đặt — form pháp lý in trống rồi điền tay
export const HOSPITAL_NAME    = (import.meta.env.VITE_HOSPITAL_NAME    as string | undefined) || '';
export const HOSPITAL_ADDRESS = (import.meta.env.VITE_HOSPITAL_ADDRESS as string | undefined) || '';
export const HOSPITAL_PHONE   = (import.meta.env.VITE_HOSPITAL_PHONE   as string | undefined) || '';

// ── Application identity ────────────────────────────────────────────────────
export const APP_NAME    = (import.meta.env.VITE_APP_NAME    as string | undefined) || 'Bluestar HIS';
export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || '1.0.0';

// ── Pagination defaults (dùng nhất quán trong mọi DataTable / List) ─────────
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50, 100];

// ── Date / time format strings (dayjs) ─────────────────────────────────────
export const DATE_FORMAT     = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT     = 'HH:mm';

// ── File upload limits ──────────────────────────────────────────────────────
export const MAX_UPLOAD_MB    = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
