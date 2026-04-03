import axiosClient from './client';

// ==================== NangCap21 - HIS Đám Mây 3 Cấp ====================

export interface DailyTrendItem {
  date: string;
  outpatients: number;
  inpatients: number;
  revenue: number;
  admissions: number;
  discharges: number;
}

export interface BranchDepartmentStat {
  departmentId: string;
  departmentName: string;
  outpatientCount: number;
  admissionCount: number;
  revenue: number;
}

export interface PatientTypeBreakdown {
  insurance: number;
  general: number;
  emergency: number;
  free: number;
  other: number;
}

export interface BranchSummary {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchLevel: string;
  outpatients: number;
  inpatients: number;
  revenue: number;
  subBranchCount: number;
}

export interface MultiFacilityDashboardDto {
  branchId?: string;
  branchName?: string;
  branchLevel?: string;
  reportDate: string;
  todayOutpatients: number;
  todayEmergency: number;
  todayAdmissions: number;
  todayDischarges: number;
  todayRevenue: number;
  currentInpatients: number;
  availableBeds: number;
  surgeries: number;
  weeklyTrends: DailyTrendItem[];
  departmentStats: BranchDepartmentStat[];
  patientTypes: PatientTypeBreakdown;
  subBranches: BranchSummary[];
}

export interface BranchReportItem {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchLevel: string;
  patientCount: number;
  visitCount: number;
  admissionCount: number;
  revenue: number;
  revenuePercentage: number;
  subBranchCount: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

export interface ConsolidatedReportDto {
  rootBranchId?: string;
  reportType: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  totalPatients: number;
  totalRevenue: number;
  totalVisits: number;
  totalAdmissions: number;
  branchItems: BranchReportItem[];
  chartData: ChartDataPoint[];
}

export interface DutyShiftItem {
  staffId: string;
  staffName: string;
  title?: string;
  departmentId: string;
  departmentName: string;
  dayOfMonth: number;
  shiftType: string;
  notes?: string;
}

export interface BranchStaffSummary {
  staffId: string;
  staffName: string;
  title?: string;
  departmentId: string;
  departmentName: string;
  morningShifts: number;
  afternoonShifts: number;
  nightShifts: number;
  totalShifts: number;
}

export interface BranchDutyRosterDto {
  branchId?: string;
  branchName?: string;
  year: number;
  month: number;
  shifts: DutyShiftItem[];
  staffSummary: BranchStaffSummary[];
  totalShifts: number;
  staffCount: number;
}

export interface BranchTreeDto {
  id: string;
  branchCode: string;
  branchName: string;
  address?: string;
  phoneNumber?: string;
  branchLevel: string;
  isHeadquarters: boolean;
  isActive: boolean;
  patientCount: number;
  staffCount: number;
  todayRevenue: number;
  children: BranchTreeDto[];
}

// ==================== API Functions ====================

export const getMultiFacilityDashboard = async (branchId?: string, date?: string): Promise<MultiFacilityDashboardDto> => {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  if (date) params.date = date;
  const { data } = await axiosClient.get<MultiFacilityDashboardDto>('/multi-facility/dashboard', { params });
  return data;
};

export const getBranchTree = async (branchId?: string): Promise<BranchTreeDto> => {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  const { data } = await axiosClient.get<BranchTreeDto>('/multi-facility/branch-tree', { params });
  return data;
};

export const getConsolidatedReport = async (
  rootBranchId?: string,
  reportType = 'patient',
  fromDate?: string,
  toDate?: string
): Promise<ConsolidatedReportDto> => {
  const params: Record<string, string> = {};
  if (rootBranchId) params.rootBranchId = rootBranchId;
  params.reportType = reportType;
  params.fromDate = fromDate ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  params.toDate = toDate ?? new Date().toISOString().split('T')[0];
  const { data } = await axiosClient.get<ConsolidatedReportDto>('/multi-facility/consolidated-report', { params });
  return data;
};

export const getBranchDutyRoster = async (
  branchId?: string,
  year?: number,
  month?: number
): Promise<BranchDutyRosterDto> => {
  const params: Record<string, string | number> = {};
  if (branchId) params.branchId = branchId;
  if (year) params.year = year;
  if (month) params.month = month;
  const { data } = await axiosClient.get<BranchDutyRosterDto>('/multi-facility/duty-roster', { params });
  return data;
};

export const getBranchesByLevel = async (): Promise<BranchTreeDto[]> => {
  const { data } = await axiosClient.get<BranchTreeDto[]>('/multi-facility/branches/by-level');
  return data;
};
