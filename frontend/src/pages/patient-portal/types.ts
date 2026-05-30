/**
 * Type definitions cho PatientPortal v1 — extracted khỏi
 * pages/PatientPortal.tsx (K28 Batch 1).
 */

export type AppointmentFormValues = {
  type: string;
  departmentId: string;
  specialtyId?: string;
  doctorId?: string;
  date?: string | Date;
  time?: string;
  notes?: string;
};

export type FeedbackFormValues = {
  departmentId?: string;
  department?: string;
  comment: string;
  rating: number;
  visitId?: string;
};
