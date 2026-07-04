// Shared formatters — gom cac ban sao 1-liner rai khap pages-v2.

/**
 * Format a number with vi-VN thousands separators.
 * Nullish/NaN -> '0' (giu nguyen hanh vi `(n || 0).toLocaleString('vi-VN')` cu).
 */
export const fmtNum = (n?: number | null): string => (n || 0).toLocaleString('vi-VN');

/**
 * Format a date value as vi-VN date (dd/MM/yyyy).
 * Mirror CHINH XAC `new Date(d).toLocaleDateString('vi-VN')` cu — KHONG them guard
 * (input xau -> "Invalid Date" y het truoc); guard nullish o call-site nhu cu.
 */
export const fmtDate = (d: string | number | Date): string =>
  new Date(d).toLocaleDateString('vi-VN');

/**
 * Format a date value as vi-VN date + time.
 * Mirror CHINH XAC `new Date(d).toLocaleString('vi-VN')` cu (khong options).
 */
export const fmtDateTime = (d: string | number | Date): string =>
  new Date(d).toLocaleString('vi-VN');

/**
 * Format a date value as vi-VN time HH:mm.
 * Mirror CHINH XAC `new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })`.
 */
export const fmtTime = (d: string | number | Date): string =>
  new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/**
 * Format a VND money amount: vi-VN number + ' ₫' suffix (dau cach truoc ky hieu).
 * Nullish/NaN -> '0 ₫'. Gom cac ban sao `fmtVND` cuc bo o pages-v2
 * (Billing/Insurance/Inpatient/Pharmacy) — output giu nguyen hanh vi cu.
 */
export const fmtVND = (n?: number | null): string => `${fmtNum(n)} ₫`;
