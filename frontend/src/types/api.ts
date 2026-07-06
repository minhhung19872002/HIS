// Standard API envelope cho endpoint MỚI từ T4 onwards (xem
// docs/workspace-docs/plans/plan-T4-api-envelope.md).
// Legacy endpoint giữ shape cũ — FE vẫn dùng unwrapList/normalizeArrayResponse cho legacy
// (xem utils/apiNormalize.ts), migrate dần khi BE đụng vào endpoint.
//
// Khớp 1-1 với BE `HIS.Application/DTOs/Common/ApiResponse.cs`.

import type { PageMeta } from './pagination';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  /** Chỉ set cho paged endpoint. Null cho non-paged. */
  meta?: PageMeta;
}

/** Helper unwrap data từ envelope. Trả undefined nếu envelope báo fail. */
export const unwrapApiResponse = <T,>(r: ApiResponse<T>): T | undefined =>
  r.success ? r.data : undefined;

/** Helper unwrap meta cho paged endpoint. */
export const unwrapApiMeta = <T,>(r: ApiResponse<T>): PageMeta | undefined => r.meta;
