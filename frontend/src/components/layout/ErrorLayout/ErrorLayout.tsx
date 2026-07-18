/**
 * ErrorLayout (#431) — nền tảng: trang lỗi 403/404/500/503/maintenance.
 * Error page CHÍNH LÀ nội dung → dùng lại `HttpError` (#428), KHÔNG tạo trùng. Đây chỉ là alias theo
 * đúng danh mục layout (§1 spec) để router/route-config gọi tên nhất quán.
 */
export { HttpError as ErrorLayout } from '../../shared/HttpError';
export { HttpError as default } from '../../shared/HttpError';
