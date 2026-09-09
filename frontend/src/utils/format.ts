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

/**
 * Doc mot moc thoi gian do backend tra ve, hieu dung la gio UTC.
 *
 * ASP.NET tra `DateTime` doc tu SQL Server voi `Kind = Unspecified`, nen chuoi JSON ra dang
 * "2026-09-09T16:11:53" — KHONG co chu "Z" va khong co offset. Trinh duyet gap chuoi khong co
 * dau hieu mui gio thi coi do la gio DIA PHUONG, nen mot ban ghi tao luc 23:11 gio Viet Nam se
 * hien thanh 16:11: cham 7 tieng.
 *
 * Sai lech nay chi lo ra o nhung cho hien GIO. Cot "Tao luc" cua man quan ly dat lich la mot: nhan
 * vien nhin vao de biet lich vua dat cach day bao lau.
 *
 * Chuoi da co "Z" hoac da co offset ("+07:00") thi giu nguyen, khong dan them gi.
 */
export const utcToLocal = (value: string | number | Date): Date => {
  if (typeof value !== 'string') return new Date(value);
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value.trim());
  return new Date(hasZone ? value : `${value}Z`);
};
