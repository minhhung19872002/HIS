/**
 * Type definitions cho HealthExchange v1 — extracted khỏi
 * pages/HealthExchange.tsx (K25 Batch 1).
 */
import type { Dayjs } from 'dayjs';

export type ReferralFormValues = {
  patientId: string;
  destinationFacilityCode: string;
  destinationDepartment?: string;
  diagnosis: string;
  diagnosisIcd?: string;
  reason: string;
  clinicalSummary?: string;
  treatmentHistory?: string;
  currentMedications?: string;
  allergies?: string;
  specialInstructions?: string;
  urgency: number;
};

export type ConsultationFormValues = {
  requestType?: string;
  patientId: string;
  consultingFacilityCode: string;
  specialty: string;
  chiefComplaint?: string;
  clinicalQuestion?: string;
  reason?: string;
  relevantHistory?: string;
  currentFindings?: string;
  urgency?: number;
  preferredDate?: Dayjs;
  preferredTime?: string;
};

export type XMLFormValues = {
  xmlType: string;
  periodFrom?: Dayjs;
  periodTo?: Dayjs;
  departmentId?: string;
  patientId?: string;
};
