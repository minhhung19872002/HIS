/**
 * Pure helpers cho Prescription v1 — extracted khỏi pages/Prescription.tsx
 * (K22 Batch 1).
 */

import type { MedicineDto } from '../../api/examination';
import type { DosageInstruction, Medicine } from './types';

/** Convert API MedicineDto → local Medicine view-model. */
export const convertMedicineDto = (dto: MedicineDto): Medicine => ({
  id: dto.id,
  code: dto.code,
  name: dto.name,
  activeIngredient: dto.activeIngredient || '',
  dosageForm: dto.unit || 'Viên',
  strength: '',
  unit: dto.unit || 'Viên',
  unitPrice: dto.unitPrice,
  stock: dto.availableQuantity,
  manufacturer: dto.manufacturer,
  insuranceCovered: dto.insurancePrice > 0,
});

/** Total dose = (morning + noon + evening + night) * duration. */
export const calculateTotalDose = (dosage: DosageInstruction, duration: number): number => {
  const dailyDose = dosage.morning + dosage.noon + dosage.evening + dosage.night;
  return dailyDose * duration;
};

/** Cost split: total · insurance-covered · patient-final. */
export const calculateCost = (
  quantity: number,
  unitPrice: number,
  insuranceCovered: boolean,
  insuranceRate: number = 0.8,
): { total: number; insurance: number; final: number } => {
  const total = quantity * unitPrice;
  const insurance = insuranceCovered ? total * insuranceRate : 0;
  const final = total - insurance;
  return { total, insurance, final };
};

/** Format dosage instruction → 'Sáng: 1, Trưa: 1 (Sau ăn)'. */
export const formatDosage = (dosage: DosageInstruction): string => {
  const parts: string[] = [];
  if (dosage.morning > 0) parts.push(`Sáng: ${dosage.morning}`);
  if (dosage.noon > 0) parts.push(`Trưa: ${dosage.noon}`);
  if (dosage.evening > 0) parts.push(`Chiều: ${dosage.evening}`);
  if (dosage.night > 0) parts.push(`Tối: ${dosage.night}`);

  let result = parts.join(', ');
  if (dosage.beforeMeal) result += ' (Trước ăn)';
  else if (dosage.afterMeal) result += ' (Sau ăn)';

  return result;
};
