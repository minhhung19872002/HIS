/**
 * Excel export utility — Sprint 7.
 * Dùng chung cho mọi table page: Reception, Billing, Pharmacy, RIS...
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn<T> {
  header: string;
  key: keyof T | string;
  /**
   * Custom formatter. Return value sẽ được ghi vào cell.
   * Dùng cho format ngày, currency, translate enum...
   */
  format?: (value: unknown, row: T) => string | number;
  width?: number;
}

/**
 * Export array rows thành file Excel và trigger download.
 *
 * @param data mảng row
 * @param columns định nghĩa cột (header + key + formatter)
 * @param fileName tên file — tự thêm .xlsx nếu thiếu
 * @param sheetName tên sheet (default: "Sheet1")
 *
 * Usage:
 * ```ts
 * exportToExcel(rooms, [
 *   { header: 'Tên phòng', key: 'roomName' },
 *   { header: 'Trạng thái', key: 'status', format: (v) => v === 1 ? 'Đang dùng' : 'Đã đóng' },
 *   { header: 'Ngày tạo', key: 'createdAt', format: (v) => dayjs(v as string).format('DD/MM/YYYY HH:mm') },
 * ], 'danh-sach-phong');
 * ```
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName: string = 'Sheet1',
) {
  const rows = data.map(row => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = (row as Record<string, unknown>)[col.key as string];
      obj[col.header] = col.format ? col.format(raw, row) : (raw ?? '');
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, safeName);
}

/**
 * Export nhiều sheet trong 1 file Excel.
 */
export function exportMultiSheetExcel(
  sheets: Array<{
    sheetName: string;
    data: Record<string, unknown>[];
    columns: ExcelColumn<Record<string, unknown>>[];
  }>,
  fileName: string,
) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const rows = s.data.map(row => {
      const obj: Record<string, unknown> = {};
      for (const col of s.columns) {
        const raw = row[col.key as string];
        obj[col.header] = col.format ? col.format(raw, row) : (raw ?? '');
      }
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = s.columns.map(c => ({ wch: c.width ?? 18 }));
    XLSX.utils.book_append_sheet(wb, ws, s.sheetName.substring(0, 31)); // Excel giới hạn 31 ký tự
  }
  const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, safeName);
}

/** Format VND cho cell */
export const formatVnd = (v: unknown): string => {
  const n = Number(v);
  return isNaN(n) ? '' : n.toLocaleString('vi-VN');
};

/** Format date */
export const formatDate = (v: unknown): string => {
  if (!v) return '';
  try {
    return new Date(v as string).toLocaleDateString('vi-VN');
  } catch { return ''; }
};

/** Format datetime */
export const formatDateTime = (v: unknown): string => {
  if (!v) return '';
  try {
    return new Date(v as string).toLocaleString('vi-VN');
  } catch { return ''; }
};
