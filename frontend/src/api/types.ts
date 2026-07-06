// Standard API envelope cho endpoint MỚI từ T4 onwards (xem
// docs/workspace-docs/plans/plan-T4-api-envelope.md).
// Legacy endpoint giữ shape cũ — FE vẫn dùng unwrapList/normalizeArrayResponse cho legacy
// (xem utils/apiNormalize.ts), migrate dần khi BE đụng vào endpoint.
//
// Khớp 1-1 với BE `HIS.Application/DTOs/Common/ApiResponse.cs`.

export type { ApiResponse } from '../types/api';
export { unwrapApiResponse, unwrapApiMeta } from '../types/api';
export type { PageMeta } from '../types/pagination';
