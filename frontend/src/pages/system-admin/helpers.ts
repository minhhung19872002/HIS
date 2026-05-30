// Helpers cho SystemAdmin v1 + sub-tabs — extract khi có ≥3 nơi dùng (theo `core-reusable-code`).
// Phiên 2026-05-30 K1: extract `getNestedData` (main + AccessMatrix + Compliance).

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

/** Antd Form validateFields() throws ValidateErrorEntity với shape này khi user input invalid. */
export type FormValidationError = {
  errorFields?: unknown[];
};

/** Helper guard cho Antd Form validateFields error — dùng trong try/catch của all save handler. */
export const isFormValidationError = (error: unknown): error is FormValidationError =>
  typeof error === 'object' && error !== null && 'errorFields' in error;

// Coercion helpers — extract khi LockedServicesTab cần (K1 phiên 6b), main vẫn dùng.
export type RawApiItem = Record<string, unknown>;

export const toRawItems = (value: unknown): RawApiItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RawApiItem => typeof item === 'object' && item !== null);
};

export const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

export const toNumberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;
