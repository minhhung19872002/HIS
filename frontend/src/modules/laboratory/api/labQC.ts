import { apiClient } from '../../../services/apiClient';

export interface QCLot {
  id: string;
  lotNumber: string;
  testCode: string;
  testName: string;
  level: number; // 1=Low, 2=Normal, 3=High
  manufacturer: string;
  expiryDate: string;
  targetMean: number;
  targetSD: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface QCResult {
  id: string;
  lotId: string;
  lotNumber: string;
  testCode: string;
  testName: string;
  level: number;
  value: number;
  mean: number;
  sd: number;
  zScore: number;
  westgardRule?: string;
  isViolation: boolean;
  analyzerId?: string;
  analyzerName?: string;
  runDate: string;
  operatorName: string;
  notes?: string;
}

export interface LeveyJenningsData {
  testCode: string;
  testName: string;
  level: number;
  mean: number;
  sd: number;
  unit: string;
  points: { date: string; value: number; zScore: number; violation?: string }[];
}

export interface QCReport {
  testCode: string;
  testName: string;
  totalRuns: number;
  violations: number;
  violationRate: number;
  lastRunDate: string;
  status: string;
}

export const getQCLots = async (params?: { testCode?: string; isActive?: boolean }) => {
  const resp = await apiClient.get('/LISComplete/qc/lots', { params });
  return resp.data;
};

export const createQCLot = async (data: Partial<QCLot>) => {
  const resp = await apiClient.post('/LISComplete/qc/lots', data);
  return resp.data;
};

export const updateQCLot = async (id: string, data: Partial<QCLot>) => {
  const resp = await apiClient.put(`/LISComplete/qc/lots/${id}`, data);
  return resp.data;
};

export const deleteQCLot = async (id: string) => {
  const resp = await apiClient.delete(`/LISComplete/qc/lots/${id}`);
  return resp.data;
};

export const runQC = async (data: { lotId: string; value: number; analyzerId?: string; notes?: string }) => {
  const resp = await apiClient.post('/LISComplete/qc/run', data);
  return resp.data;
};

export const getQCResults = async (params?: { lotId?: string; testCode?: string; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/qc/results', { params });
  return resp.data;
};

export const getLeveyJenningsData = async (params: { testCode: string; level: number; fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/qc/levey-jennings', { params });
  return resp.data;
};

export const getQCReport = async (params?: { fromDate?: string; toDate?: string }) => {
  const resp = await apiClient.get('/LISComplete/reports/qc', { params });
  return resp.data;
};

// ─── NangCap26 LIS #29: Ngoại kiểm (EQA) — khác nội kiểm (IQC) ở trên ───────

export interface LabEqaTestDto {
  id: string;
  code: string;
  name: string;
  serviceId?: string;
  serviceName?: string;
  providerName?: string;
  cycle?: string;
  unit?: string;
  notes?: string;
  isActive: boolean;
}

export interface LabEqaResultDto {
  id: string;
  batchId: string;
  eqaTestId: string;
  eqaTestName?: string;
  sampleCode?: string;
  resultValue?: number;
  resultText?: string;
  runAt?: string;
  runBy?: string;
  targetValue?: number;
  zScore?: number;
  evaluation?: string;
  correctiveAction?: string;
  notes?: string;
}

export interface LabEqaBatchDto {
  id: string;
  batchCode: string;
  providerName?: string;
  period?: string;
  receivedDate: string;
  dueDate?: string;
  handoverBy?: string;
  receivedBy?: string;
  receivedByName?: string;
  /** Received | Running | Reported | Closed */
  status: string;
  statusName: string;
  notes?: string;
  resultCount: number;
  results: LabEqaResultDto[];
}

export const getEqaTests = (activeOnly = true) =>
  apiClient.get<LabEqaTestDto[]>('/LISComplete/eqa/tests', { params: { activeOnly } });

export const saveEqaTest = (dto: Partial<LabEqaTestDto>) =>
  apiClient.post<LabEqaTestDto>('/LISComplete/eqa/tests', dto);

export const deleteEqaTest = (id: string) =>
  apiClient.delete(`/LISComplete/eqa/tests/${id}`);

export const getEqaBatches = (params?: { status?: string; fromDate?: string; toDate?: string }) =>
  apiClient.get<LabEqaBatchDto[]>('/LISComplete/eqa/batches', { params });

export const getEqaBatch = (id: string) =>
  apiClient.get<LabEqaBatchDto>(`/LISComplete/eqa/batches/${id}`);

/** Tiếp nhận bàn giao mẫu ngoại kiểm (tạo mới) hoặc sửa thông tin đợt. */
export const saveEqaBatch = (dto: Record<string, unknown>) =>
  apiClient.post<LabEqaBatchDto>('/LISComplete/eqa/batches', dto);

/** Chuyển trạng thái đợt: Received → Running → Reported → Closed. */
export const setEqaBatchStatus = (id: string, status: string) =>
  apiClient.post<LabEqaBatchDto>(`/LISComplete/eqa/batches/${id}/status`, { status });

/** Đăng ký chạy mẫu / nhập kết quả ngoại kiểm. */
export const saveEqaResult = (dto: Record<string, unknown>) =>
  apiClient.post<LabEqaResultDto>('/LISComplete/eqa/results', dto);

export const deleteEqaResult = (id: string) =>
  apiClient.delete(`/LISComplete/eqa/results/${id}`);

// ─── NangCap26 LIS #15: Đơn vị gửi mẫu ─────────────────────────────────────

export interface LabSendingUnitDto {
  id: string;
  code: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  contactPerson?: string;
  email?: string;
  facilityCode?: string;
  notes?: string;
  isActive: boolean;
}

export const getSendingUnits = (activeOnly = true) =>
  apiClient.get<LabSendingUnitDto[]>('/LISComplete/sending-units', { params: { activeOnly } });

export const saveSendingUnit = (dto: Partial<LabSendingUnitDto>) =>
  apiClient.post<LabSendingUnitDto>('/LISComplete/sending-units', dto);

export const deleteSendingUnit = (id: string) =>
  apiClient.delete(`/LISComplete/sending-units/${id}`);

/** Import từ Excel: client parse file → gửi mảng dòng. */
export const importSendingUnits = (rows: Partial<LabSendingUnitDto>[]) =>
  apiClient.post<{ imported: number }>('/LISComplete/sending-units/import', rows);
