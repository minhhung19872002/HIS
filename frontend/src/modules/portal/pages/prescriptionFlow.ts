import type { RecentPrescriptionDto } from '../../opd/api/examination';

export type PrescriptionStatusKey = 'pending' | 'active' | 'dispensed' | 'returned' | 'expired' | 'cancelled';

/** Backend PrescriptionStatus: 0-Chờ duyệt · 1-Đã duyệt · 2-Đã cấp phát · 3-Hoàn trả ·
 *  4-Hủy · 6-Cấp một phần.
 *  Trạng thái 0 trước đây bị gộp chung với 1 vào 'active' → đơn vừa "Lưu nháp" nằm lẫn
 *  trong tab "Đang hiệu lực" cùng đơn đã duyệt, bác sĩ không tìm ra đơn nháp của mình.
 *  Tách riêng 'pending' vì đây là trạng thái DUY NHẤT còn sửa/xoá được. */
export const prescriptionStatusKey = (status: number | string): PrescriptionStatusKey => {
  if (typeof status === 'number') {
    if (status === 0) return 'pending';
    if (status === 2 || status === 6) return 'dispensed';
    if (status === 3) return 'returned';
    if (status === 4) return 'cancelled';
    return 'active';
  }
  // So khớp bằng `includes`, KHÔNG bằng `===`: backend trả tên đầy đủ ("Đã cấp phát",
  // "Đã hủy", "Chờ duyệt"), so bằng dấu `===` với 'cấp' / 'hết' / 'hủy' thì không bao giờ
  // khớp và mọi trạng thái đều rơi về 'active'.
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('dispensed') || normalized.includes('cấp phát')) return 'dispensed';
  if (normalized.includes('return') || normalized.includes('hoàn trả')) return 'returned';
  if (normalized.includes('expired') || normalized.includes('hết hạn')) return 'expired';
  if (normalized.includes('cancel') || normalized.includes('hủy')) return 'cancelled';
  if (normalized.includes('pending') || normalized.includes('chờ duyệt')) return 'pending';
  return 'active';
};

export const prescriptionEditorLink = (
  prescription: Pick<RecentPrescriptionDto, 'id' | 'examinationId' | 'patientId'>,
): string => {
  const params = new URLSearchParams({ prescriptionId: prescription.id });
  if (prescription.examinationId) params.set('examId', prescription.examinationId);
  else if (prescription.patientId) params.set('patientId', prescription.patientId);
  return `/v2/prescription/edit?${params.toString()}`;
};
