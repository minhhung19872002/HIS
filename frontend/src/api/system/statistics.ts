/**
 * Module 16: Thống kê (Statistics & Dashboard)
 * DTOs + statisticsApi
 */

import { apiClient } from '../../services/apiClient';

// ============================================================================
// DTOs
// ============================================================================

export interface HospitalDashboardDto {
  date: string;
  // Real field names returned by GET /statistics/dashboard (preferred at runtime).
  // The *Count fields below are legacy aliases kept for backward-compat mapping.
  reportDate?: string;
  todayOutpatients?: number;
  todayAdmissions?: number;
  todayDischarges?: number;
  currentInpatients?: number;
  availableBeds?: number;
  todaySurgeries?: number;
  todayEmergencies?: number;
  todayRevenue?: number;
  trends?: Record<string, unknown>[];
  outpatientCount: number;
  outpatientChange: number;
  inpatientCount: number;
  inpatientChange: number;
  emergencyCount: number;
  emergencyChange: number;
  surgeryCount: number;
  surgeryChange: number;
  admissionCount: number;
  dischargeCount: number;
  bedOccupancyRate: number;
  averageStayDays: number;
  totalRevenue: number;
  revenueChange: number;
  outpatientByDepartment: DepartmentCountDto[];
  inpatientByDepartment: DepartmentCountDto[];
  revenueByDepartment: DepartmentRevenueDto[];
}

export interface DepartmentCountDto {
  departmentId: string;
  departmentName: string;
  count: number;
}

export interface DepartmentRevenueDto {
  departmentId: string;
  departmentName: string;
  revenue: number;
}

export interface DepartmentStatisticsDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  outpatientCount: number;
  inpatientCount: number;
  admissionCount: number;
  dischargeCount: number;
  transferInCount: number;
  transferOutCount: number;
  deathCount: number;
  surgeryCount: number;
  bedCount: number;
  occupiedBeds: number;
  occupancyRate: number;
  averageStayDays: number;
  totalRevenue: number;
}

export interface ExaminationStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId?: string;
  doctorName?: string;
  totalExaminations: number;
  newPatients: number;
  followUpPatients: number;
  insurancePatients: number;
  feePayingPatients: number;
  freePatients: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  elderlyCount: number;
}

export interface AdmissionStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  admissionSource?: string;
  totalAdmissions: number;
  emergencyAdmissions: number;
  electiveAdmissions: number;
  transferAdmissions: number;
  insuranceAdmissions: number;
  feePayingAdmissions: number;
  maleCount: number;
  femaleCount: number;
  childrenCount: number;
  elderlyCount: number;
}

export interface DischargeStatisticsDto {
  date?: string;
  departmentId?: string;
  departmentName?: string;
  totalDischarges: number;
  recoveredCount: number;
  improvedCount: number;
  unchangedCount: number;
  worsenedCount: number;
  deathCount: number;
  transferCount: number;
  selfDischargeCount: number;
  averageStayDays: number;
}

export interface MortalityStatisticsDto {
  departmentId?: string;
  departmentName?: string;
  totalDeaths: number;
  deathWithin24Hours: number;
  deathAfter24Hours: number;
  surgicalDeaths: number;
  nonSurgicalDeaths: number;
  mortalityRate: number;
  causeOfDeathBreakdown: CauseOfDeathDto[];
}

export interface CauseOfDeathDto {
  icdCode: string;
  icdName: string;
  count: number;
  percentage: number;
}

export interface DiseaseStatisticsDto {
  icdCode: string;
  icdName: string;
  chapterCode?: string;
  chapterName?: string;
  totalCases: number;
  outpatientCases: number;
  inpatientCases: number;
  maleCount: number;
  femaleCount: number;
  deathCount: number;
  averageStayDays?: number;
}

export interface DepartmentActivityReportDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  outpatientVisits: number;
  inpatientAdmissions: number;
  surgeries: number;
  labTests: number;
  imagingExams: number;
  procedures: number;
  consultations: number;
  totalRevenue: number;
  personnelCount: number;
  productivityPerPerson: number;
}

export interface BedOccupancyReportDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  patientDays: number;
  bedDays: number;
  averageStayDays: number;
  turnoverRate: number;
}

export interface BYTReportDto {
  reportPeriod: string;
  hospitalName: string;
  hospitalCode: string;
  a1Data: A1ReportDataDto;
  a2Data: A2ReportDataDto;
  a3Data: A3ReportDataDto;
}

export interface A1ReportDataDto {
  totalOutpatients: number;
  totalInpatients: number;
  totalBeds: number;
  averageOccupancy: number;
}

export interface A2ReportDataDto {
  diseaseStatistics: DiseaseStatisticsDto[];
}

export interface A3ReportDataDto {
  surgeryStatistics: SurgeryStatisticsDto[];
}

export interface SurgeryStatisticsDto {
  surgeryType: string;
  totalCount: number;
  successCount: number;
  complicationCount: number;
}

export interface HospitalKPIDto {
  kpiId: string;
  kpiName: string;
  kpiCategory: string;
  targetValue: number;
  actualValue: number;
  achievement: number;
  unit: string;
  trend: string;
  status: string;
}

export interface StatisticsReportRequest {
  reportType: string;
  fromDate: string;
  toDate: string;
  departmentId?: string;
  groupBy?: string;
  outputFormat?: string;
}

// ============================================================================
// API Object
// ============================================================================

export const statisticsApi = {
  // Dashboard
  getHospitalDashboard: (date?: string) =>
    apiClient.get<HospitalDashboardDto>('/statistics/dashboard', { params: { date } }),
  getDepartmentStatistics: (fromDate: string, toDate: string) =>
    apiClient.get<DepartmentStatisticsDto[]>('/statistics/departments', { params: { fromDate, toDate } }),

  // Báo cáo khám bệnh
  getExaminationStatistics: (fromDate: string, toDate: string, departmentId?: string, doctorId?: string) =>
    apiClient.get<ExaminationStatisticsDto[]>('/statistics/examination', { params: { fromDate, toDate, departmentId, doctorId } }),

  // Báo cáo nhập viện
  getAdmissionStatistics: (fromDate: string, toDate: string, departmentId?: string, admissionSource?: string) =>
    apiClient.get<AdmissionStatisticsDto[]>('/statistics/admission', { params: { fromDate, toDate, departmentId, admissionSource } }),

  // Báo cáo xuất viện
  getDischargeStatistics: (fromDate: string, toDate: string, departmentId?: string, dischargeType?: string) =>
    apiClient.get<DischargeStatisticsDto[]>('/statistics/discharge', { params: { fromDate, toDate, departmentId, dischargeType } }),

  // Báo cáo tử vong
  getMortalityStatistics: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<MortalityStatisticsDto[]>('/statistics/mortality', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo bệnh theo ICD-10
  getDiseaseStatistics: (fromDate: string, toDate: string, icdChapter?: string, departmentId?: string) =>
    apiClient.get<DiseaseStatisticsDto[]>('/statistics/disease', { params: { fromDate, toDate, icdChapter, departmentId } }),

  // Báo cáo hoạt động khoa
  getDepartmentActivityReport: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<DepartmentActivityReportDto[]>('/statistics/department-activity', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo công suất giường
  getBedOccupancyReport: (fromDate: string, toDate: string, departmentId?: string) =>
    apiClient.get<BedOccupancyReportDto[]>('/statistics/bed-occupancy', { params: { fromDate, toDate, departmentId } }),

  // Báo cáo BYT
  getBYTReport: (fromDate: string, toDate: string) =>
    apiClient.get<BYTReportDto>('/statistics/byt-report', { params: { fromDate, toDate } }),

  // KPI
  getHospitalKPIs: (fromDate: string, toDate: string) =>
    apiClient.get<HospitalKPIDto[]>('/statistics/kpi', { params: { fromDate, toDate } }),

  // In và xuất báo cáo
  printStatisticsReport: (request: StatisticsReportRequest) =>
    apiClient.post<Blob>('/statistics/reports/print', request, { responseType: 'blob' }),
  exportStatisticsReport: (request: StatisticsReportRequest) =>
    apiClient.post<Blob>('/statistics/reports/export', request, { responseType: 'blob' }),
};
