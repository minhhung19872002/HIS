// Shared formatters — gom cac ban sao 1-liner rai khap pages-v2.

/**
 * Format a number with vi-VN thousands separators.
 * Nullish/NaN -> '0' (giu nguyen hanh vi `(n || 0).toLocaleString('vi-VN')` cu).
 */
export const fmtNum = (n?: number | null): string => (n || 0).toLocaleString('vi-VN');
