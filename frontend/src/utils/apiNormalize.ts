// API response shape helper.
//
// Backend HIS trả 2 shape không nhất quán (xem rule-compliance-audit nợ #9):
//   - Mảng thô: T[]
//   - Paged: { items: T[], totalCount: number, ... }
// FE phải xử lý cả 2. Helper này gom lại 1 chỗ thay vì cast `as any` rải khắp page.

export type MaybePaged<T> = T[] | { items?: T[] } | null | undefined;

/** Lấy mảng items từ response, hỗ trợ cả mảng thô và paged shape. */
export const unwrapList = <T,>(v: MaybePaged<T>): T[] =>
  Array.isArray(v) ? v : v?.items ?? [];

/** Variant chấp nhận `unknown` payload — dùng khi gọi qua `apiClient` không type. */
export const normalizeArrayResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'items' in payload) {
    const items = (payload as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  return [];
};

