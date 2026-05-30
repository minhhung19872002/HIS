/**
 * Constants cho MedicalRecordArchive v1 — extracted khỏi
 * pages/MedicalRecordArchive.tsx (K24 Batch 1).
 */

export const HANDOVER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ bàn giao', color: 'default' },
  1: { label: 'Đã gửi', color: 'processing' },
  2: { label: 'Đã nhận', color: 'warning' },
  3: { label: 'Đã duyệt', color: 'success' },
};

export const GENDER_MAP: Record<number, string> = { 0: 'Nam', 1: 'Nữ', 2: 'Khác' };
