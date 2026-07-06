/**
 * File service — download/export helpers + re-export util. #services-consolidation
 *
 * `downloadBlob` / `downloadUrl` gom 1 lần boilerplate createObjectURL + anchor.click
 * (+ revoke cho blob). Ngoài ra RE-EXPORT các util export đã có (csv/excel/print).
 *
 * ADDITIVE: KHÔNG migrate ~80 download call-site hiện có.
 */

/** Tạo 1 anchor ẩn trỏ tới href rồi click để trigger download. */
function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

/** Download 1 Blob với tên file cho trước (tự createObjectURL + revoke sau khi click). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename);
  } finally {
    window.URL.revokeObjectURL(url);
  }
}

/** Download từ 1 URL sẵn có (KHÔNG revoke — URL không do ta tạo). */
export function downloadUrl(url: string, filename: string): void {
  triggerDownload(url, filename);
}

// Re-export các util export đã có để services/ là điểm vào thống nhất.
export { downloadCsv, escapeCsvCell } from '../utils/csvExport';
export {
  exportToExcel,
  exportMultiSheetExcel,
  formatVnd,
  formatDate,
  formatDateTime,
} from '../utils/excelExport';
export type { ExcelColumn } from '../utils/excelExport';
export { openPrintWindow } from '../utils/printWindow';
export type { PrintTrigger, PrintWindowOptions } from '../utils/printWindow';
