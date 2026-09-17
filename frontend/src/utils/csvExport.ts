/**
 * CSV export utility — dùng chung cho mọi page cần xuất danh sách ra CSV.
 * Pattern tương tự hàm downloadCsv trong Reports.tsx (cục bộ) nhưng export để tái dùng.
 *
 * Usage:
 *   import { downloadCsv, csvLine } from '../utils/csvExport';
 *   downloadCsv('bao-cao-attp.csv', [csvLine(['Mã ca', 'Địa điểm']), ...items.map((r) => csvLine([r.code, r.location]))]);
 *
 * QA-R10: MỌI file CSV phải đi qua escapeCsvCell — nó vừa bọc/nhân đôi dấu nháy (dấu phẩy, xuống dòng
 * trong ô không làm lệch cột) vừa vô hiệu hoá công thức: chuỗi bắt đầu bằng = + - @ tab CR (vd tên BN
 * "=HYPERLINK(...)") được thêm dấu ' để Excel hiển thị như chữ thay vì thực thi (CSV/formula injection).
 */

/** Chuỗi mà Excel/LibreOffice sẽ hiểu là công thức → thêm tiền tố '. Số thuần ("-5", "+84") giữ nguyên. */
export function neutralizeCsvFormula(str: string): string {
  if (!str || !/^[=+\-@\t\r\n]/.test(str)) return str;
  // Số có nhóm nghìn ("-1.500.000", "-1,500.50") và SĐT có khoảng trắng ("+84 912 345 678") cũng là dữ liệu.
  if (/^[+-]?\d[\d., ]*$/.test(str) && /\d$/.test(str)) return str;
  return `'${str}`;
}

export function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : typeof value === 'number' ? String(value) : neutralizeCsvFormula(String(value));
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/** Một dòng CSV từ mảng ô (đã escape + vô hiệu hoá công thức). */
export function csvLine(cells: readonly unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

/** Blob CSV UTF-8 có BOM (thiếu BOM Excel mở tiếng Việt bị lỗi font). */
export function csvBlob(lines: string[]): Blob {
  return new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Tạo file CSV và trigger download trình duyệt.
 * @param filename  Tên file (bao gồm .csv)
 * @param lines     Mảng dòng — mỗi phần tử là 1 dòng CSV đã escape (dùng csvLine)
 */
export function downloadCsv(filename: string, lines: string[]): void {
  const url = window.URL.createObjectURL(csvBlob(lines));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * CSV từ mảng object (các cột = key scalar của dòng đầu). Dùng cho các trang xuất "nguyên dạng" dữ liệu API.
 */
export function objectsToCsvLines(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' || rows[0][k] instanceof Date || rows[0][k] === null);
  return [csvLine(keys), ...rows.map((r) => csvLine(keys.map((k) => (r[k] instanceof Date ? (r[k] as Date).toISOString() : r[k]))))];
}
