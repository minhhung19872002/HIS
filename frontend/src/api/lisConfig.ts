import { apiClient } from './client';

// ===========================
// Types
// ===========================

export interface AnalyzerDto {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  connectionType: string; // HL7 | ASTM | Serial
  ipAddress?: string;
  port?: number;
  baudRate?: number;
  protocolVersion?: string;
  isActive: boolean;
  connectionStatus?: string; // Connected | Disconnected | Unknown
  lastConnectedAt?: string;
  description?: string;
}

export interface CreateAnalyzerDto {
  name: string;
  model: string;
  manufacturer: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  baudRate?: number;
  protocolVersion?: string;
  isActive: boolean;
  description?: string;
}

export interface TestParameterDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  dataType: string; // Number | Text | Enum
  enumValues?: string;
  sortOrder?: number;
  isActive: boolean;
}

export interface CreateTestParameterDto {
  code: string;
  name: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  dataType: string;
  enumValues?: string;
  sortOrder?: number;
  isActive: boolean;
}

export interface ReferenceRangeDto {
  id: string;
  testParameterId: string;
  testCode: string;
  testName?: string;
  ageGroup: string; // Newborn | Infant | Child | Adolescent | Adult | Elderly
  gender: string; // Male | Female | Both
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
}

export interface CreateReferenceRangeDto {
  testParameterId: string;
  ageGroup: string;
  gender: string;
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
}

export interface AnalyzerMappingDto {
  id: string;
  analyzerId: string;
  analyzerName?: string;
  analyzerTestCode: string;
  hisTestParameterId: string;
  hisTestCode?: string;
  hisTestName?: string;
  isActive: boolean;
}

export interface CreateAnalyzerMappingDto {
  analyzerId: string;
  analyzerTestCode: string;
  hisTestParameterId: string;
  isActive: boolean;
}

export interface LabconnectStatusDto {
  isConnected: boolean;
  lastSyncTime?: string;
  serverUrl?: string;
  version?: string;
  pendingSendCount?: number;
  pendingReceiveCount?: number;
}

export interface LabconnectSyncHistoryDto {
  id: string;
  syncTime: string;
  direction: string; // Send | Receive
  recordCount: number;
  status: string; // Success | Failed | Partial
  errorMessage?: string;
  duration?: number;
}

// ===========================
// API Functions
// ===========================

// Analyzers
export const getAnalyzers = () =>
  apiClient.get<AnalyzerDto[]>('/lis/analyzers');

export const createAnalyzer = (data: CreateAnalyzerDto) =>
  apiClient.post<AnalyzerDto>('/lis/analyzers', data);

export const updateAnalyzer = (id: string, data: CreateAnalyzerDto) =>
  apiClient.put<AnalyzerDto>(`/lis/analyzers/${id}`, data);

export const deleteAnalyzer = (id: string) =>
  apiClient.delete(`/lis/analyzers/${id}`);

export const testAnalyzerConnection = (id: string) =>
  apiClient.post<{ success: boolean; message: string }>(`/lis/analyzers/${id}/test-connection`);

// Test Parameters
export const getTestParameters = () =>
  apiClient.get<TestParameterDto[]>('/lis/test-parameters');

export const createTestParameter = (data: CreateTestParameterDto) =>
  apiClient.post<TestParameterDto>('/lis/test-parameters', data);

export const updateTestParameter = (id: string, data: CreateTestParameterDto) =>
  apiClient.put<TestParameterDto>(`/lis/test-parameters/${id}`, data);

export const deleteTestParameter = (id: string) =>
  apiClient.delete(`/lis/test-parameters/${id}`);

export const importTestParametersCsv = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/lis/test-parameters/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Reference Ranges
export const getReferenceRanges = (testParameterId?: string) =>
  apiClient.get<ReferenceRangeDto[]>('/lis/reference-ranges', {
    params: testParameterId ? { testParameterId } : undefined,
  });

export const createReferenceRange = (data: CreateReferenceRangeDto) =>
  apiClient.post<ReferenceRangeDto>('/lis/reference-ranges', data);

export const updateReferenceRange = (id: string, data: CreateReferenceRangeDto) =>
  apiClient.put<ReferenceRangeDto>(`/lis/reference-ranges/${id}`, data);

export const deleteReferenceRange = (id: string) =>
  apiClient.delete(`/lis/reference-ranges/${id}`);

// Analyzer Mappings
export const getAnalyzerMappings = (analyzerId?: string) =>
  apiClient.get<AnalyzerMappingDto[]>('/lis/analyzer-mappings', {
    params: analyzerId ? { analyzerId } : undefined,
  });

export const createAnalyzerMapping = (data: CreateAnalyzerMappingDto) =>
  apiClient.post<AnalyzerMappingDto>('/lis/analyzer-mappings', data);

export const updateAnalyzerMapping = (id: string, data: CreateAnalyzerMappingDto) =>
  apiClient.put<AnalyzerMappingDto>(`/lis/analyzer-mappings/${id}`, data);

export const deleteAnalyzerMapping = (id: string) =>
  apiClient.delete(`/lis/analyzer-mappings/${id}`);

export const autoMapAnalyzer = (analyzerId: string) =>
  apiClient.post<{ mappedCount: number; message: string }>(`/lis/analyzer-mappings/auto-map/${analyzerId}`);

// Labconnect
export const getLabconnectStatus = () =>
  apiClient.get<LabconnectStatusDto>('/lis/labconnect/status');

export const syncLabconnect = (direction?: string) =>
  apiClient.post<{ success: boolean; message: string; syncedCount?: number }>('/lis/labconnect/sync', { direction });

export const getLabconnectHistory = () =>
  apiClient.get<LabconnectSyncHistoryDto[]>('/lis/labconnect/history');

export const retryFailedSyncs = () =>
  apiClient.post<{ success: boolean; retriedCount: number }>('/lis/labconnect/retry-failed');

export default {
  getAnalyzers,
  createAnalyzer,
  updateAnalyzer,
  deleteAnalyzer,
  testAnalyzerConnection,
  getTestParameters,
  createTestParameter,
  updateTestParameter,
  deleteTestParameter,
  importTestParametersCsv,
  getReferenceRanges,
  createReferenceRange,
  updateReferenceRange,
  deleteReferenceRange,
  getAnalyzerMappings,
  createAnalyzerMapping,
  updateAnalyzerMapping,
  deleteAnalyzerMapping,
  autoMapAnalyzer,
  getLabconnectStatus,
  syncLabconnect,
  getLabconnectHistory,
  retryFailedSyncs,
};
