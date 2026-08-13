import type { RecentPrescriptionDto } from '../../opd/api/examination';

export type PrescriptionStatusKey = 'active' | 'dispensed' | 'returned' | 'expired' | 'cancelled';

export const prescriptionStatusKey = (status: number | string): PrescriptionStatusKey => {
  if (typeof status === 'number') {
    if (status === 2 || status === 6) return 'dispensed';
    if (status === 3) return 'returned';
    if (status === 4) return 'cancelled';
    return 'active';
  }
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('dispensed') || normalized === 'cấp') return 'dispensed';
  if (normalized.includes('return') || normalized.includes('hoàn trả')) return 'returned';
  if (normalized.includes('expired') || normalized === 'hết') return 'expired';
  if (normalized.includes('cancel') || normalized === 'hủy') return 'cancelled';
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
