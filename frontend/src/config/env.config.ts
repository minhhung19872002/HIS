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

/** URL Orthanc PACS (fallback localhost:8042 khi dev). Dùng ở DicomViewer + PublicStudyViewer. */
export const ORTHANC_URL = import.meta.env.VITE_ORTHANC_URL || 'http://localhost:8042';
