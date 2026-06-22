import { apiClient } from './client';
import { openPrintWindow } from '../utils/printWindow';

/** R1: 1 chỉ số con của kết quả XN (từ ServiceRequestDetailParameters). */
export interface LabResultParameter {
  parameterCode: string;
  parameterName: string;
  value?: string | null;
  numericValue?: number | null;
  unit?: string | null;
  refMin?: number | null;
  refMax?: number | null;
  refRange?: string | null;
  /** N | H | L | HH | LL */
  flag?: string | null;
  sequence: number;
}

export interface LabTestItem {
  id: string;
  testCode: string;
  testName: string;
  testGroup?: string;
  result?: string | null;
  unit?: string;
  referenceRange?: string;
  normalMin?: number;
  normalMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  resultStatus?: number | null;
  status: number;
  /** R1: per-parameter breakdown. Null/empty → fallback to result string. */
  parameters?: LabResultParameter[] | null;
}

export interface LabRequest {
  id: string;
  requestCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  requestedTests: string[];
  tests?: LabTestItem[];
  priority: number;
  requestDate: string;
  status: number;
  departmentName?: string;
  doctorName?: string;
  sampleBarcode?: string;
  sampleType?: string;
  collectionTime?: string;
  collectorName?: string;
  analyzer?: string;
  processingStartTime?: string;
  processingEndTime?: string;
  clinicalInfo?: string;
  notes?: string;
}

export interface TestParameter {
  id: string;
  name: string;
  value: string | number | null;
  unit: string;
  referenceRange: string;
  normalMin?: number;
  normalMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  status: 'normal' | 'high' | 'low' | 'critical' | null;
  previousValue?: string | number;
  inputType: 'number' | 'text';
}

export interface TestResult {
  id: string;
  requestId: string;
  requestCode: string;
  patientName: string;
  patientCode: string;
  testName: string;
  parameters: TestParameter[];
  status: number;
  enteredBy?: string;
  enteredTime?: string;
  approvedBy?: string;
  approvedTime?: string;
  notes?: string;
}

export interface CollectSampleRequest {
  sampleType: string;
  collectionTime: string;
  collectorName: string;
  notes?: string;
  /** UUID người lấy mẫu (từ labRoles.defaultKtvId). Optional — nếu có sẽ lưu vào CollectedByUserId. */
  collectorUserId?: string;
}

export interface ProcessSampleRequest {
  analyzer?: string;
  startTime: string;
}

export interface SaveResultRequest {
  parameters: TestParameter[];
  notes?: string;
}

export interface ApproveResultRequest {
  approvedBy?: string;
  approvedTime?: string;
  notes?: string;
}

interface RawLabTestItem {
  id: string;
  testCode: string;
  testName: string;
  testGroup?: string;
  result?: string | null;
  unit?: string;
  referenceRange?: string;
  normalMin?: number;
  normalMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  resultStatus?: number | null;
  status?: number;
}

interface RawLabRequest {
  id: string;
  orderCode?: string;
  requestCode?: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender?: string;
  dateOfBirth?: string;
  tests?: RawLabTestItem[];
  isEmergency?: boolean;
  isPriority?: boolean;
  orderedAt: string;
  status?: number;
  orderDepartmentName?: string;
  orderDoctorName?: string;
  sampleBarcode?: string;
  sampleType?: string;
  collectedAt?: string;
  collectorName?: string;
  analyzer?: string;
  processingStartTime?: string;
  completedAt?: string;
}

// Get all lab requests
export const getLabRequests = async (params?: {
  status?: number;
  priority?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
}) => {
  const today = params?.fromDate || new Date().toISOString().split('T')[0];
  const response = await apiClient.get<RawLabRequest[]>('/LISComplete/orders/pending', {
    params: {
      date: today,
      keyword: params?.search,
      patientType: null,
      departmentId: null,
      analyzerId: null
    }
  });

  const data = response.data || [];
  return data.map((item) => ({
    id: item.id,
    requestCode: item.orderCode || item.requestCode,
    patientId: item.patientId,
    patientCode: item.patientCode,
    patientName: item.patientName,
    gender: item.gender === 'Nam' ? 1 : item.gender === 'Nu' ? 0 : 2,
    dateOfBirth: item.dateOfBirth,
    requestedTests: item.tests?.map((t) => t.testName) || [],
    tests: item.tests?.map((t) => ({
      id: t.id,
      testCode: t.testCode,
      testName: t.testName,
      testGroup: t.testGroup,
      result: t.result,
      unit: t.unit,
      referenceRange: t.referenceRange,
      normalMin: t.normalMin,
      normalMax: t.normalMax,
      criticalLow: t.criticalLow,
      criticalHigh: t.criticalHigh,
      resultStatus: t.resultStatus,
      status: t.status || 0
    })) || [],
    priority: item.isEmergency ? 2 : item.isPriority ? 1 : 0,
    requestDate: item.orderedAt,
    status: item.status || 0,
    departmentName: item.orderDepartmentName,
    doctorName: item.orderDoctorName,
    sampleBarcode: item.sampleBarcode,
    sampleType: item.sampleType,
    collectionTime: item.collectedAt,
    collectorName: item.collectorName,
    analyzer: item.analyzer,
    processingStartTime: item.processingStartTime,
    processingEndTime: item.completedAt,
  })) as LabRequest[];
};

export const getLabRequestById = async (id: string) => {
  const response = await apiClient.get<LabRequest>('/LISComplete/orders/' + id);
  return response.data;
};

export const collectSample = async (id: string, data: CollectSampleRequest) => {
  const response = await apiClient.post<LabRequest>('/LISComplete/sample-collection/collect', {
    orderId: id,
    ...data
  });
  return response.data;
};

// Start processing - only update local state (no API call needed)
export const startProcessing = async (_id: string, _data: ProcessSampleRequest) => {
  void _id;
  void _data;
  return { success: true, message: 'Đã chuyển sang trạng thái xử lý' };
};

// Complete processing (approve)
export const completeProcessing = async (id: string) => {
  const response = await apiClient.post<LabRequest>('/LISComplete/orders/approve', {
    orderId: id,
    itemIds: [],
    note: '',
    conclusion: ''
  });
  return response.data;
};

export const getTestResults = async (params?: {
  status?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
}) => {
  const today = params?.fromDate || new Date().toISOString().split('T')[0];
  const response = await apiClient.get<TestResult[]>('/LISComplete/orders/pending', {
    params: { date: today, keyword: params?.search }
  });
  return response.data;
};

export const getTestResultById = async (id: string) => {
  const response = await apiClient.get<TestResult>('/LISComplete/orders/' + id);
  return response.data;
};

export const saveTestResults = async (requestId: string, data: SaveResultRequest) => {
  const response = await apiClient.post<TestResult>('/LISComplete/orders/enter-result', {
    labOrderId: requestId,
    results: data.parameters?.map(p => ({
      labTestItemId: p.id,
      result: String(p.value ?? ''),
      notes: ''
    })) || []
  });
  return response.data;
};

// Approve test results
export const approveTestResults = async (id: string, data: ApproveResultRequest) => {
  const response = await apiClient.post<TestResult>('/LISComplete/orders/approve', {
    orderId: id,
    itemIds: [],
    note: data.notes || '',
    conclusion: ''
  });
  return response.data;
};

// Duyệt 2 bước: KTV duyệt sơ bộ (status 3 → 4)
export const preliminaryApprove = async (orderId: string, technicianNote = '') => {
  const response = await apiClient.post(`/LISComplete/orders/${orderId}/preliminary-approve`, { technicianNote });
  return response.data;
};

// Duyệt 2 bước: BS duyệt chính thức (status 4 → 5)
export const finalApprove = async (orderId: string, doctorNote = '') => {
  const response = await apiClient.post(`/LISComplete/orders/${orderId}/final-approve`, { doctorNote });
  return response.data;
};

// Hủy duyệt (status 4/5 → 3)
export const cancelApproval = async (orderId: string, reason: string) => {
  const response = await apiClient.post(`/LISComplete/orders/${orderId}/cancel-approval`, { reason });
  return response.data;
};

// ── Hủy chuỗi ngược workflow XN (M3.14 — LabCancelChainController) ──
// Thao tác theo TỪNG LabRequestItem; backend validate bước trước phải hủy trước.
export interface CancelChainResponse {
  success: boolean;
  newStatus: number;
  newStatusLabel: string;
  message: string;
}

// Step 1: Hủy duyệt kết quả (item 4 → 3)
// FLOW-3 #14a: gửi serviceRequestDetailId (model 1) thay labRequestItemId (model 2 chết).
export const cancelChainApproval = async (serviceRequestDetailId: string, reason: string) => {
  const response = await apiClient.post<CancelChainResponse>('/laboratory/cancel-chain/cancel-approval', { serviceRequestDetailId, reason });
  return response.data;
};

// Step 2: Hủy kết quả (Có KQ → Đang thực hiện)
export const cancelChainResult = async (serviceRequestDetailId: string, reason: string) => {
  const response = await apiClient.post<CancelChainResponse>('/laboratory/cancel-chain/cancel-result', { serviceRequestDetailId, reason });
  return response.data;
};

// Step 3: Hủy lấy mẫu (→ Chờ lấy mẫu)
export const cancelChainCollection = async (serviceRequestDetailId: string, reason: string) => {
  const response = await apiClient.post<CancelChainResponse>('/laboratory/cancel-chain/cancel-collection', { serviceRequestDetailId, reason });
  return response.data;
};

// Print barcode label - get from API
export const printBarcodeLabel = async (orderId: string) => {
  const response = await apiClient.get('/LISComplete/sample-collection/' + orderId + '/barcode', {
    responseType: 'blob',
  });
  return response.data;
};

// Print barcode - open print window
export const printBarcode = async (orderId: string, sampleBarcode?: string) => {
  const code = sampleBarcode || orderId;
  const printContent = '<html><head><title>Nhan Barcode</title>' +
    '<style>' +
    'body { font-family: Arial; text-align: center; padding: 20px; }' +
    '.barcode { font-size: 32px; font-weight: bold; margin: 20px 0; letter-spacing: 5px; }' +
    '.code { font-size: 16px; }' +
    '</style></head>' +
    '<body>' +
    '<div class="barcode">||||| ' + code + ' |||||</div>' +
    '<div class="code">' + code + '</div>' +
    '</body></html>';
  openPrintWindow(printContent, { print: 'onload' });
};

export const printTestResultReport = async (resultId: string) => {
  const response = await apiClient.get('/LISComplete/orders/' + resultId + '/print', {
    responseType: 'blob',
  });
  return response.data;
};

export const getTestTemplates = async () => {
  const response = await apiClient.get('/LISComplete/catalog/tests');
  return response.data;
};

export const getAnalyzers = async () => {
  const response = await apiClient.get('/LISComplete/analyzers');
  return response.data;
};

// ── G-01: Trả KQ XN tại giường (nội trú) ──────────────────────────────────

export interface BedLabTestItem {
  id: string;
  labOrderId: string;
  testCode: string;
  testName: string;
  sampleTypeName?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: number; // 0=BT, 1=Thấp, 2=Cao, 3=Nguy hiểm thấp, 4=Nguy hiểm cao
  status: number; // 0=Chờ, 1=Có mẫu, 2=Đang XN, 3=Có KQ, 4=Đã duyệt
  statusName: string;
  notes?: string;
}

export interface BedLabOrder {
  id: string;
  orderCode: string;
  orderDoctorName: string;
  diagnosis?: string;
  icdCode?: string;
  status: number; // 0=Chờ lấy mẫu, 3=Chờ duyệt, 4=Đã duyệt sơ bộ, 5=Hoàn thành
  statusName: string;
  orderedAt: string;
  approvedAt?: string;
  tests: BedLabTestItem[];
}

/** Lấy danh sách phiếu XN theo lượt nội trú (admissionId) */
export const getLabOrdersByAdmission = async (admissionId: string): Promise<BedLabOrder[]> => {
  const response = await apiClient.get<BedLabOrder[]>(`/LISComplete/orders/by-admission/${admissionId}`);
  return response.data || [];
};

export default {
  getLabRequests,
  getLabRequestById,
  collectSample,
  startProcessing,
  completeProcessing,
  getTestResults,
  getTestResultById,
  saveTestResults,
  approveTestResults,
  preliminaryApprove,
  finalApprove,
  cancelApproval,
  printBarcodeLabel,
  printBarcode,
  printTestResultReport,
  getTestTemplates,
  getAnalyzers,
};
