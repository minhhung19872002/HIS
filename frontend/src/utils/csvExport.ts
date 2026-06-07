/**
 * CSV export utility — dùng chung cho mọi page cần xuất danh sách ra CSV.
 * Pattern tương tự hàm downloadCsv trong Reports.tsx (cục bộ) nhưng export để tái dùng.
 *
 * Usage:
 *   import { downloadCsv, escapeCsvCell } from '../utils/csvExport';
 *   const header = 'Mã ca,Địa điểm,Ngày';
 *   const rows = items.map(r => [r.code, r.location, r.date].map(escapeCsvCell).join(','));
 *   downloadCsv('bao-cao-attp.csv', [header, ...rows]);
 */

export function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Tạo file CSV và trigger download trình duyệt.
 * @param filename  Tên file (bao gồm .csv)
 * @param lines     Mảng dòng — mỗi phần tử là 1 dòng CSV đã join bằng dấu phẩy
 */
export function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
