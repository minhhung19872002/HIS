/**
 * Type definitions cho OPD module — extracted khỏi pages/OPD.tsx (K13 Batch 1).
 * Pure types, KHÔNG có logic.
 */

import type {
  RoomPatientListDto,
  ExaminationDto,
  ServiceDto,
} from '../../modules/opd/api/examination';
import type { StockDto } from '../../modules/pharmacy/api/warehouse';

export type QueuePatient = RoomPatientListDto;

export type Examination = ExaminationDto & {
  patientId: string;
  queueNumber: number;
  departmentId?: string;
  departmentName?: string;
};

export interface Diagnosis {
  icdCode: string;
  icdName: string;
  diagnosisType: number;
}

export interface TreatmentOrder {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  orderType: number;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  instructions?: string;
  paymentSource: number;
  insuranceRatio: number;
  status: number;
  isSaved?: boolean;
}

export type Service = ServiceDto;

export interface ICDOption {
  value: string;
  label: string;
  code: string;
  name: string;
}

export interface ServiceOption {
  value: string;
  label: string;
  data: Service;
}

export type QueueListDetails = {
  dateOfBirth?: string;
  visitReason?: string;
};

export type SupplyOrderResponseItem = {
  serviceId?: string;
  itemId?: string;
  serviceCode?: string;
  itemCode?: string;
  serviceName?: string;
  itemName?: string;
  unit?: string;
  quantity?: number;
  stockQuantity?: number;
};

export type SupplyAutoCompleteOption = {
  value: string;
  label: string;
  data?: StockDto;
};
