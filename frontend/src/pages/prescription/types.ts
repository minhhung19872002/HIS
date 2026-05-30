/**
 * Type definitions cho Prescription v1 — extracted khỏi pages/Prescription.tsx
 * (K22 Batch 1). Pure types.
 */

export interface RecentPrescriptionDto {
  id: string;
  prescriptionCode?: string;
  prescriptionDate: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  diagnosis?: string;
  doctorName?: string;
  departmentName?: string;
  status: string;
}

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  gender: number;
  phoneNumber?: string;
  address?: string;
  allergies?: string[];
  currentMedications?: string[];
  insuranceNumber?: string;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  unit: string;
  unitPrice: number;
  stock: number;
  manufacturer?: string;
  insuranceCovered: boolean;
}

export interface DosageInstruction {
  morning: number;
  noon: number;
  evening: number;
  night: number;
  beforeMeal: boolean;
  afterMeal: boolean;
}

export interface PrescriptionItem {
  id: string;
  medicine: Medicine;
  dosageForm: string;
  strength: string;
  quantity: number;
  dosage: DosageInstruction;
  duration: number;
  route: string;
  notes?: string;
  totalDose: number;
  totalCost: number;
  insuranceCoverage: number;
}

export interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

export interface DrugInteractionApiDto {
  drug1Name: string;
  drug2Name: string;
  severity?: number;
  severityName?: string;
  description?: string;
  recommendation?: string;
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  items: Omit<PrescriptionItem, 'id'>[];
}

export interface Prescription {
  id?: string;
  patientId: string;
  examinationId?: string;
  prescriptionDate: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  interactions: DrugInteraction[];
  totalCost: number;
  insuranceCoverage: number;
  finalCost: number;
  notes?: string;
  status: 'draft' | 'completed' | 'sent';
  overrideReason?: string;
}
