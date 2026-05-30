/**
 * Type definitions cho Surgery v1 — extracted khỏi pages/Surgery.tsx
 * (K23 Batch 1).
 */

export interface SurgeryRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  age?: number;
  requestDate: string;
  surgeryType: string;
  plannedProcedure?: string;
  requestingDoctorName: string;
  priority: number; // 1: Normal, 2: Urgent, 3: Emergency
  status: number; // 0: Pending, 1: Scheduled, 2: InProgress, 3: Completed, 4: Cancelled
  preOpDiagnosis?: string;
  estimatedDuration?: number;
  anesthesiaType?: number;
}

export interface SurgerySchedule {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  surgeryType: string;
  plannedProcedure?: string;
  operatingRoomName: string;
  scheduledDateTime: string;
  estimatedDuration?: number;
  surgeonName: string;
  anesthesiologistName?: string;
  status: number; // 0: Scheduled, 1: Confirmed, 2: Preparing, 3: InProgress, 4: Completed, 5: Cancelled
}

export interface OperatingRoom {
  id: string;
  roomCode: string;
  roomName: string;
  roomType: number; // 1: Major, 2: Minor, 3: Emergency, 4: Specialty
  status: number; // 1: Available, 2: InUse, 3: Maintenance, 4: Inactive
  location?: string;
  todaySchedules?: SurgerySchedule[];
}
