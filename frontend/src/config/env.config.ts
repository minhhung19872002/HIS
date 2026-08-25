/**
 * Env config — truy cập biến môi trường Vite tập trung. #config-consolidation
 *
 * Lưu ý phạm vi: config CHỈ dùng ở 1 nơi (adapter-local) KHÔNG gom về đây —
 * ví dụ VGCA SDK (`VITE_VGCA_*`) cố ý giữ trong `utils/vgcaSign.ts`. Ở đây chỉ đặt
 * env dùng chung nhiều nơi. `VITE_API_URL`/`VITE_REALTIME_URL` nằm ở `api.config.ts`.
 */

/** true khi chạy dev server (Vite). */
export const isDev = import.meta.env.DEV;

/** true khi build production. */
export const isProd = import.meta.env.PROD;

/**
 * URL Orthanc PACS mà TRÌNH DUYỆT gọi thẳng (Orthanc Explorer, OHIF, tải archive ZIP).
 * Dùng ở DicomViewer + PublicStudyViewer.
 *
 * Fallback `localhost:8042` CHỈ áp dụng khi chạy dev server. Ở bản build production
 * mà không truyền `VITE_ORTHANC_URL` thì giá trị là chuỗi RỖNG, không phải localhost:
 * trang prod chạy HTTPS nên mọi link `http://localhost:8042` vừa trỏ nhầm sang máy
 * người dùng vừa bị chặn mixed-content. Rỗng = "chưa cấu hình" → UI tự khoá các nút
 * mở Orthanc trực tiếp thay vì tạo link chết. Ảnh trong viewer KHÔNG phụ thuộc biến
 * này (đi qua proxy backend `/api/RISComplete/pacs/instances/{id}/file`).
 */
export const ORTHANC_URL = import.meta.env.VITE_ORTHANC_URL
  || (import.meta.env.DEV ? 'http://localhost:8042' : '');
