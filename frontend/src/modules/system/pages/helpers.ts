// Helpers cho các panel SystemAdmin v2 (port từ pages/system-admin/helpers.ts — v1 đang phase-out,
// v2 không import chéo từ pages/ nên copy phần cần dùng).

/**
 * Lấy data từ shape response phổ biến của HIS BE:
 * - Trực tiếp giá trị thật → trả luôn
 * - { data: T } wrapper → unwrap 1 lớp
 * - null/undefined → fallback
 */
export const getNestedData = <T,>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'object' && value !== null && 'data' in value) {
    return ((value as { data: T }).data ?? fallback) as T;
  }
  return value as T;
};

export type RawApiItem = Record<string, unknown>;

export const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

export const toNumberValue = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};
