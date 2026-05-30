/**
 * EMR v1 constants — extracted khỏi pages/EMR.tsx (K20 Batch 1).
 */

/** Examination status (0..4) → Antd Tag color. */
export const statusColors: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'warning',
  3: 'orange',
  4: 'success',
};

/** Examination status (0..4) → display name. */
export const statusNames: Record<number, string> = {
  0: 'Chờ khám',
  1: 'Đang khám',
  2: 'Chờ CLS',
  3: 'Chờ kết luận',
  4: 'Hoàn thành',
};
