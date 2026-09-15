import apiClient from '../../../services/apiClient';

/** One prescribed line for the dose check. Doses are in the unit the pharmacist configured on the range. */
export interface DoseCheckItemDto {
  medicineId: string;
  singleDose?: number;
  dailyDose?: number;
  morningDose?: number;
  noonDose?: number;
  eveningDose?: number;
  nightDose?: number;
  routeCode?: string;
}

export interface DoseCheckRequestDto {
  items: DoseCheckItemDto[];
  /** Patient → BE resolves age + latest recorded weight (OPD/IPD vital signs). */
  patientId?: string;
  /** Inpatient callers that only know the admission. */
  admissionId?: string;
  patientAge?: number;
  weightKg?: number;
  isRenalImpaired?: boolean;
}

/** Severity: 1 = reminder / not checked (e.g. no weight), 2 = outside range, 3 = QUÁ LIỀU NẶNG. */
export interface DoseWarningDto {
  medicineId: string;
  medicineName: string;
  warningType: string;
  severity: number;
  message: string;
  recommendation: string;
}

export const SEVERE_DOSE = 3;

/** POST /medicine-dose-range/check — advisory warnings (empty when no thresholds are configured). */
export async function checkDoses(req: DoseCheckRequestDto): Promise<DoseWarningDto[]> {
  const items = req.items.filter((i) => !!i.medicineId);
  if (items.length === 0) return [];
  const { data } = await apiClient.post<DoseWarningDto[]>('/medicine-dose-range/check', { ...req, items });
  return Array.isArray(data) ? data : [];
}

/**
 * Override reason actually stored with the prescription (BE appends it to the prescription notes):
 * names the drugs whose dose was severe so the audit trail says WHAT was overridden.
 */
export function withDoseOverrideNote(reason: string, warnings: DoseWarningDto[]): string {
  const trimmed = reason.trim();
  const severe = [...new Set(warnings.filter((w) => w.severity >= SEVERE_DOSE).map((w) => w.medicineName || w.medicineId))];
  if (!trimmed || severe.length === 0) return trimmed;
  return `${trimmed} (quá liều nặng: ${severe.join(', ')})`;
}
