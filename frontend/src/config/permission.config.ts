/**
 * Permission / security config — FE access gating, digital-signature SDK coords.
 * Nguồn duy nhất cho các giá trị env liên quan đến bảo mật FE.
 */

// ── FE access gating (#378/#404/#405) ──────────────────────────────────────
// MASTER SWITCH: mặc định TẮT (menu hiện đầy đủ); bật bằng VITE_ACCESS_GATING=true.
// An ninh thật ở BE [RequirePermission] — đây chỉ là UX gating.
export const ACCESS_GATING_ENABLED =
  (import.meta.env.VITE_ACCESS_GATING as string | undefined) === 'true';

// ── VGCA digital-signature SDK (Ban Cơ yếu Chính phủ) ──────────────────────
// Đặt file SDK vào frontend/public/vgca/ để URL mặc định hoạt động.
export const VGCA_SDK_URL  = (import.meta.env.VITE_VGCA_SDK_URL  as string | undefined) || '/vgca/SignServiceJS.js';
export const VGCA_SIGN_FN  = (import.meta.env.VITE_VGCA_SIGN_FN  as string | undefined) || '';
