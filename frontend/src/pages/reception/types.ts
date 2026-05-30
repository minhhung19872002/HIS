/**
 * Type definitions cho Reception v1 — extracted khỏi pages/Reception.tsx
 * (K19 Batch 1). Pure types.
 */

export interface ReceptionRecord {
  id: string;
  queueNumber: number;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  phoneNumber?: string;
  identityNumber?: string;
  patientType: number;
  insuranceNumber?: string;
  departmentName?: string;
  roomName?: string;
  roomId?: string;
  status: number;
  admissionDate: string;
  address?: string;
  priority?: number;
}

export interface RoomStatistics {
  roomId: string;
  roomName: string;
  departmentName: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  currentNumber?: number;
  doctorName?: string;
}

export interface InsuranceVerification {
  insuranceNumber: string;
  isValid: boolean;
  patientName?: string;
  dateOfBirth?: string;
  gender?: number;
  address?: string;
  facilityCode?: string;
  facilityName?: string;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  isRightRoute: boolean;
  rightRoute?: number;
  rightRouteName?: string;
  paymentRate?: number;
  warnings?: string[];
  isBlacklisted?: boolean;
  blacklistReason?: string;
  validationMessage?: string;
}

export type ApiLikeError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};
