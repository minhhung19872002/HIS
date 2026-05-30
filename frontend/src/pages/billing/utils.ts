/**
 * Helper functions cho Billing v1 — pure functions, KHÔNG side-effect.
 * Extracted khỏi pages/Billing.tsx (K16 Batch 1).
 */

/**
 * Parse currency-formatted string (vd "100,000" → 100000).
 * Antd InputNumber `parser` prop signature. Trống → 0.
 */
export const parseCurrencyInput = (value: string | number | undefined): number => {
  const normalized = String(value ?? '').replace(/\$\s?|(,*)/g, '');
  return Number(normalized || 0);
};
