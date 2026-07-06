/**
 * RIS API — Revenue reports, registers (ultrasound/radiology/functional),
 * consumption norm, statistics, export-to-excel, exam statistics, syncResultToDoH.
 */

import apiClient from '../../services/apiClient';

// #region Interfaces

export interface RadiologyRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  totalExams: number;
  byServiceType: RevenueByServiceTypeDto[];
  byDay: RevenueByDayDto[];
  byDoctor: RevenueByDoctorDto[];
}

export interface RevenueByServiceTypeDto {
  serviceType: string;
  serviceTypeName: string;
  examCount: number;
  revenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
}

export interface RevenueByDayDto {
  date: string;
  examCount: number;
  revenue: number;
}

export interface RevenueByDoctorDto {
  doctorId: string;
  doctorName: string;
  examCount: number;
  revenue: number;
}

export interface UltrasoundRegisterDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  items: UltrasoundRegisterItemDto[];
}

export interface UltrasoundRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  address?: string;
  examType: string;
  diagnosis?: string;
  conclusion?: string;
  doctorName?: string;
  note?: string;
}

export interface RadiologyRegisterDto {
  fromDate: string;
  toDate: string;
  serviceType?: string;
  totalExams: number;
  items: RadiologyRegisterItemDto[];
}

export interface RadiologyRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  address?: string;
  serviceName: string;
  bodyPart?: string;
  technique?: string;
  description?: string;
  conclusion?: string;
  technicianName?: string;
  doctorName?: string;
}

export interface FunctionalTestRegisterDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  items: FunctionalTestRegisterItemDto[];
}

export interface FunctionalTestRegisterItemDto {
  rowNumber: number;
  examDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  testType: string;
  description?: string;
  conclusion?: string;
  technicianName?: string;
  doctorName?: string;
}

export interface RadiologyStatisticsDto {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  totalExams: number;
  completedExams: number;
  pendingExams: number;
  averageTATMinutes: number;
  byServiceType: StatisticsByServiceTypeDto[];
  byDay: StatisticsByDayDto[];
  byModality: StatisticsByModalityDto[];
}

export interface StatisticsByServiceTypeDto {
  serviceType: string;
  serviceTypeName: string;
  examCount: number;
  completedCount: number;
  percentage: number;
}

export interface StatisticsByDayDto {
  date: string;
  examCount: number;
  completedCount: number;
}

export interface StatisticsByModalityDto {
  modalityId: string;
  modalityName: string;
  modalityType: string;
  examCount: number;
  utilizationPercent: number;
}

export interface ConsumptionNormReportDto {
  fromDate: string;
  toDate: string;
  byService: ConsumptionByServiceDto[];
}

export interface ConsumptionByServiceDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  examCount: number;
  items: ConsumptionItemDto[];
}

export interface ConsumptionItemDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  normQuantity: number;
  actualQuantity: number;
  variance: number;
  unit: string;
}

export interface SyncResultToDoHDto {
  resultId: string;
  syncStatus: string;
  syncTime?: string;
  errorMessage?: string;
  doHTransactionId?: string;
}

// Statistics interfaces
export interface ExamStatisticsByServiceTypeDto {
  fromDate: string;
  toDate: string;
  totalExams: number;
  serviceTypes: ServiceTypeStatDto[];
}

export interface ServiceTypeStatDto {
  serviceTypeId: string;
  serviceTypeName: string;
  examCount: number;
  completedCount: number;
  pendingCount: number;
  averageTATMinutes: number;
  revenue: number;
}

// #endregion

// #region 8.5 Reports APIs

export const getRevenueReport = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  serviceType?: string
) =>
  apiClient.get<RadiologyRevenueReportDto>('/RISComplete/reports/revenue', {
    params: { fromDate, toDate, departmentId, serviceType }
  });

export const getUltrasoundRegister = (fromDate: string, toDate: string) =>
  apiClient.get<UltrasoundRegisterDto>('/RISComplete/reports/ultrasound-register', {
    params: { fromDate, toDate }
  });

export const getRadiologyRegisterByType = (fromDate: string, toDate: string, serviceType: string) =>
  apiClient.get<RadiologyRegisterDto>('/RISComplete/reports/radiology-register/by-type', {
    params: { fromDate, toDate, serviceType }
  });

export const getRadiologyRegister = (fromDate: string, toDate: string) =>
  apiClient.get<RadiologyRegisterDto>('/RISComplete/reports/radiology-register', {
    params: { fromDate, toDate }
  });

export const getFunctionalTestRegister = (fromDate: string, toDate: string) =>
  apiClient.get<FunctionalTestRegisterDto>('/RISComplete/reports/functional-test-register', {
    params: { fromDate, toDate }
  });

export const getConsumptionNormReport = (fromDate: string, toDate: string, serviceId?: string) =>
  apiClient.get<ConsumptionNormReportDto>('/RISComplete/reports/consumption-norm', {
    params: { fromDate, toDate, serviceId }
  });

export const getRevenueByBaseCostReport = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<RadiologyRevenueReportDto>('/RISComplete/reports/revenue-by-base-cost', {
    params: { fromDate, toDate, departmentId }
  });

export const syncResultToDoH = (resultId: string) =>
  apiClient.post<SyncResultToDoHDto>(`/RISComplete/results/${resultId}/sync-doh`);

export const getStatistics = (fromDate: string, toDate: string, serviceType?: string) =>
  apiClient.get<RadiologyStatisticsDto>('/RISComplete/reports/statistics', {
    params: { fromDate, toDate, serviceType }
  });

export const exportReportToExcel = (reportType: string, fromDate: string, toDate: string) =>
  apiClient.get('/RISComplete/reports/export', {
    params: { reportType, fromDate, toDate },
    responseType: 'blob'
  });

// #endregion

// #region Statistics APIs

export const getExamStatisticsByServiceType = (fromDate: string, toDate: string) =>
  apiClient.get<ExamStatisticsByServiceTypeDto>('/RISComplete/statistics/by-service-type', {
    params: { fromDate, toDate }
  });

// #endregion
