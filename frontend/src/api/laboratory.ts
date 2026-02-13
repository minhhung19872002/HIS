import { apiClient } from './client';

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

// Get all lab requests
export const getLabRequests = async (params?: {
  status?: number;
  priority?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
}) => {
  const today = params?.fromDate || new Date().toISOString().split('T')[0];
  const response = await apiClient.get<any[]>('/LISComplete/orders/pending', {
    params: {
      date: today,
      keyword: params?.search,
      patientType: null,
      departmentId: null,
      analyzerId: null
    }
  });

  const data = response.data || [];
  return data.map((item: any) => ({
    id: item.id,
    requestCode: item.orderCode || item.requestCode,
    patientId: item.patientId,
    patientCode: item.patientCode,
    patientName: item.patientName,
    gender: item.gender === 'Nam' ? 1 : item.gender === 'Nu' ? 0 : 2,
    dateOfBirth: item.dateOfBirth,
    requestedTests: item.tests?.map((t: any) => t.testName) || [],
    tests: item.tests?.map((t: any) => ({
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
export const startProcessing = async (id: string, _data: ProcessSampleRequest) => {
  console.log('Starting processing for order:', id);
  return { success: true, message: 'Da chuyen sang trang thai xu ly' };
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
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
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
  printBarcodeLabel,
  printBarcode,
  printTestResultReport,
  getTestTemplates,
  getAnalyzers,
};
