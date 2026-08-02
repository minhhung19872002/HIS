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
// Dùng: Logo.tsx fallback khi HOSPITAL_NAME chưa đặt (env VITE_APP_NAME per deployment).
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || 'Bluestar HIS';

// ── Pagination defaults ─────────────────────────────────────────────────────
// Dùng: SimpleV2Page default pageSize trong _v2kit.tsx.
export const PAGE_SIZE_DEFAULT = 20;

// ── File upload limits ──────────────────────────────────────────────────────
// Dùng: EmrEditor.tsx upload attachment guard.
export const MAX_UPLOAD_MB    = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
