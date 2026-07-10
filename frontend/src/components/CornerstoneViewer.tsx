/**
 * TRANSITIONAL SHIM (his-fe-convention §4a) — file đã dời về modules/radiology/components/CornerstoneViewer.
 * Giữ lại CHỈ để các importer v1 (pages/DicomViewer, pages/Radiology, MainLayout) không phải đổi — v1 đang retire (#204).
 * Code MỚI import từ modules/radiology/components/CornerstoneViewer. Xóa shim khi v1 gỡ bỏ.
 */
export { default } from '../modules/radiology/components/CornerstoneViewer';
export * from '../modules/radiology/components/CornerstoneViewer';
