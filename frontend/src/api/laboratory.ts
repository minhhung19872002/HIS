import { apiClient } from './client';

export interface LabRequest {
  id: string;
  requestCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  requestedTests: string[];
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
  approvedBy: string;
  approvedTime: string;
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
  const response = await apiClient.get<LabRequest[]>('/laboratory/requests', { params });
  return response.data;
};

// Get lab request by ID
export const getLabRequestById = async (id: string) => {
  const response = await apiClient.get<LabRequest>(`/laboratory/requests/${id}`);
  return response.data;
};

// Collect sample
export const collectSample = async (id: string, data: CollectSampleRequest) => {
  const response = await apiClient.put<LabRequest>(`/laboratory/requests/${id}/collect`, data);
  return response.data;
};

// Start processing sample
export const startProcessing = async (id: string, data: ProcessSampleRequest) => {
  const response = await apiClient.put<LabRequest>(`/laboratory/requests/${id}/process`, data);
  return response.data;
};

// Complete processing sample
export const completeProcessing = async (id: string) => {
  const response = await apiClient.put<LabRequest>(`/laboratory/requests/${id}/complete`);
  return response.data;
};

// Get test results
export const getTestResults = async (params?: {
  status?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
}) => {
  const response = await apiClient.get<TestResult[]>('/laboratory/results', { params });
  return response.data;
};

// Get test result by ID
export const getTestResultById = async (id: string) => {
  const response = await apiClient.get<TestResult>(`/laboratory/results/${id}`);
  return response.data;
};

// Save test results
export const saveTestResults = async (requestId: string, data: SaveResultRequest) => {
  const response = await apiClient.post<TestResult>('/laboratory/results', {
    requestId,
    ...data,
  });
  return response.data;
};

// Approve test results
export const approveTestResults = async (id: string, data: ApproveResultRequest) => {
  const response = await apiClient.put<TestResult>(`/laboratory/results/${id}/approve`, data);
  return response.data;
};

// Print barcode label
export const printBarcodeLabel = async (requestId: string) => {
  const response = await apiClient.get(`/laboratory/requests/${requestId}/print-barcode`, {
    responseType: 'blob',
  });
  return response.data;
};

// Print test result report
export const printTestResultReport = async (resultId: string) => {
  const response = await apiClient.get(`/laboratory/results/${resultId}/print`, {
    responseType: 'blob',
  });
  return response.data;
};

// Get test templates
export const getTestTemplates = async () => {
  const response = await apiClient.get('/laboratory/test-templates');
  return response.data;
};

// Get analyzers
export const getAnalyzers = async () => {
  const response = await apiClient.get('/laboratory/analyzers');
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
  printTestResultReport,
  getTestTemplates,
  getAnalyzers,
};
