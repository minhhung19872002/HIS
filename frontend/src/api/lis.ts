/**
 * LIS (Laboratory Information System) API Client
 * Module 7: Xét nghiệm - 31+ chức năng
 */

import apiClient from './client';

// #region Interfaces

// Analyzer interfaces
export interface LabAnalyzerDto {
  id: string;
  code: string;
  name: string;
  manufacturer: string;
  model: string;
  protocol: string; // HL7, ASTM1381, ASTM1394, RS232, TCP/IP
  connectionType: string; // Serial, TCP, File
  connectionString: string;
  ipAddress?: string;
  port?: number;
  comPort?: string;
  baudRate?: number;
  dataBits?: string;
  parity?: string;
  stopBits?: string;
  departmentId: string;
  departmentName: string;
  isConnected: boolean;
  lastCommunication?: string;
  isActive: boolean;
}

export interface CreateAnalyzerDto {
  code: string;
  name: string;
  manufacturer: string;
  model: string;
  protocol: string;
  connectionType: string;
  connectionString: string;
  ipAddress?: string;
  port?: number;
  comPort?: string;
  baudRate?: number;
  dataBits?: string;
  parity?: string;
  stopBits?: string;
  departmentId: string;
  isActive: boolean;
}

export interface UpdateAnalyzerDto extends CreateAnalyzerDto {
  id: string;
}

export interface AnalyzerTestMappingDto {
  id: string;
  analyzerId: string;
  testId: string;
  testCode: string;
  testName: string;
  analyzerTestCode: string;
  analyzerTestName?: string;
  factor?: number;
  isActive: boolean;
}

export interface UpdateAnalyzerTestMappingDto {
  testId: string;
  analyzerTestCode: string;
  analyzerTestName?: string;
  factor?: number;
  isActive: boolean;
}

export interface AnalyzerConnectionStatusDto {
  analyzerId: string;
  isConnected: boolean;
  lastCommunication?: string;
  errorMessage?: string;
  pingTimeMs?: number;
}

export interface RawDataDto {
  id: string;
  analyzerId: string;
  receivedTime: string;
  rawData: string;
  isProcessed: boolean;
  processedTime?: string;
  errorMessage?: string;
}

export interface AnalyzerConnectionLogDto {
  id: string;
  analyzerId: string;
  analyzerName: string;
  eventTime: string;
  eventType: string;
  message: string;
  rawData?: string;
}

export interface AnalyzerRealtimeStatusDto {
  analyzerId: string;
  analyzerName: string;
  status: string;
  lastCommunication?: string;
  pendingWorklistCount: number;
  todayTestCount: number;
  currentQCStatus: string;
  activeAlerts: string[];
}

// Sample Collection interfaces
export interface SampleCollectionListDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  visitId: string;
  visitCode: string;
  departmentName: string;
  orderTime: string;
  sampleCount: number;
  collectedCount: number;
  status: string;
  patientType: string;
}

export interface SampleCollectionItemDto {
  id: string;
  orderId: string;
  orderCode: string;
  sampleType: string;
  sampleTypeName: string;
  tubeType: string;
  tubeColor: string;
  barcode?: string;
  tests: string[];
  status: string;
  collectionTime?: string;
  collectorName?: string;
}

export interface SampleTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  tubeTypes: string[];
  isActive: boolean;
}

export interface TubeTypeDto {
  id: string;
  code: string;
  name: string;
  color: string;
  colorHex: string;
  description?: string;
  isActive: boolean;
}

export interface CollectSampleDto {
  orderId: string;
  sampleType: string;
  tubeType?: string;
  collectionTime: string;
  collectorId?: string;
  note?: string;
}

export interface CollectSampleResultDto {
  sampleId: string;
  barcode: string;
  success: boolean;
  message?: string;
}

export interface SampleValidationResultDto {
  sampleId: string;
  isValid: boolean;
  warnings: string[];
  errors: string[];
  expirationTime?: string;
}

// Lab Order interfaces
export interface LabOrderDto {
  id: string;
  orderCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  visitId: string;
  orderDate: string;
  orderDoctorName: string;
  departmentName: string;
  status: string;
  testCount: number;
  completedCount: number;
  sampleCollected: boolean;
  patientType: string;
}

export interface LabOrderDetailDto {
  id: string;
  orderCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  orderDate: string;
  orderDoctorName: string;
  departmentName: string;
  diagnosis?: string;
  clinicalInfo?: string;
  testItems: LabTestItemDto[];
  samples: SampleCollectionItemDto[];
}

export interface LabTestItemDto {
  id: string;
  testCode: string;
  testName: string;
  groupName: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  status: string;
  resultTime?: string;
  technicianName?: string;
  approvedTime?: string;
  approvedBy?: string;
}

export interface EnterLabResultDto {
  orderId: string;
  items: LabResultItemDto[];
}

export interface LabResultItemDto {
  testItemId: string;
  result: string;
  flag?: string;
  note?: string;
}

export interface ApproveLabResultDto {
  orderId: string;
  itemIds: string[];
  note?: string;
  conclusion?: string;
}

export interface SendWorklistDto {
  analyzerId: string;
  orderIds: string[];
}

export interface SendWorklistResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}

export interface ReceiveResultDto {
  receivedCount: number;
  processedCount: number;
  errorCount: number;
  errors: string[];
  results: AnalyzerResultDto[];
}

export interface AnalyzerResultDto {
  sampleId: string;
  testCode: string;
  result: string;
  unit?: string;
  flag?: string;
  resultTime: string;
  matched: boolean;
  orderId?: string;
  testItemId?: string;
}

// Critical Value interfaces
export interface CriticalValueAlertDto {
  id: string;
  orderId: string;
  orderCode: string;
  patientId: string;
  patientName: string;
  testCode: string;
  testName: string;
  result: string;
  unit?: string;
  criticalRange: string;
  alertTime: string;
  isAcknowledged: boolean;
  acknowledgedTime?: string;
  acknowledgedBy?: string;
  notifiedPerson?: string;
  notificationMethod?: string;
}

export interface ProcessCriticalValueDto {
  alertId: string;
  action: string;
  notifiedPerson?: string;
  notificationMethod?: string;
  note?: string;
}

export interface AcknowledgeCriticalValueDto {
  notifiedPerson: string;
  notificationMethod: string;
  notificationTime: string;
  note?: string;
}

// Lab Result History interfaces
export interface LabResultHistoryDto {
  orderId: string;
  testDate: string;
  testCode: string;
  testName: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  approvedBy?: string;
}

export interface LabResultComparisonDto {
  testCode: string;
  testName: string;
  unit?: string;
  dataPoints: LabResultPointDto[];
  trendPercentage?: number;
  trendDirection?: string;
}

export interface LabResultPointDto {
  date: string;
  value: number;
  flag?: string;
}

export interface DeltaCheckResultDto {
  orderId: string;
  items: DeltaCheckItemDto[];
  hasCriticalDelta: boolean;
}

export interface DeltaCheckItemDto {
  testId: string;
  testCode: string;
  testName: string;
  currentValue: number;
  previousValue?: number;
  previousDate?: string;
  deltaPercent?: number;
  deltaThreshold?: number;
  isCritical: boolean;
}

// QC interfaces
export interface RunQCDto {
  analyzerId: string;
  testId: string;
  qcLevel: string;
  qcLotNumber: string;
  qcValue: number;
  runTime: string;
}

export interface QCResultDto {
  id: string;
  qcLevel: string;
  value: number;
  mean: number;
  sd: number;
  cv: number;
  zScore: number;
  isAccepted: boolean;
  westgardRule?: string;
  violations: string[];
}

export interface LeveyJenningsChartDto {
  testName: string;
  analyzerName: string;
  mean: number;
  sd: number;
  plus1SD: number;
  plus2SD: number;
  plus3SD: number;
  minus1SD: number;
  minus2SD: number;
  minus3SD: number;
  dataPoints: QCDataPointDto[];
}

export interface QCDataPointDto {
  date: string;
  value: number;
  level: string;
  isRejected: boolean;
  violations?: string;
}

// Catalog interfaces
export interface LabTestCatalogDto {
  id: string;
  code: string;
  name: string;
  englishName?: string;
  groupId: string;
  groupName: string;
  unit?: string;
  resultType: string;
  resultOptions?: string;
  decimalPlaces?: number;
  price?: number;
  insurancePrice?: number;
  sampleType?: string;
  tubeType?: string;
  tatMinutes?: number;
  isActive: boolean;
}

export interface SaveLabTestDto {
  id?: string;
  code: string;
  name: string;
  englishName?: string;
  groupId: string;
  unit?: string;
  resultType: string;
  resultOptions?: string;
  decimalPlaces?: number;
  price?: number;
  insurancePrice?: number;
  sampleType?: string;
  tubeType?: string;
  tatMinutes?: number;
  isActive: boolean;
}

export interface LabTestGroupDto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  testCount: number;
  isActive: boolean;
}

export interface SaveLabTestGroupDto {
  id?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ReferenceRangeDto {
  id: string;
  testId: string;
  gender: string;
  ageFromDays?: number;
  ageToDays?: number;
  lowValue?: number;
  highValue?: number;
  textRange?: string;
  description?: string;
}

export interface UpdateReferenceRangeDto {
  id?: string;
  gender: string;
  ageFromDays?: number;
  ageToDays?: number;
  lowValue?: number;
  highValue?: number;
  textRange?: string;
  description?: string;
}

export interface CriticalValueConfigDto {
  testId: string;
  testCode: string;
  testName: string;
  criticalLow?: number;
  criticalHigh?: number;
  panicLow?: number;
  panicHigh?: number;
  requireAcknowledgment: boolean;
  acknowledgmentTimeoutMinutes?: number;
  notificationMethod?: string;
}

export interface UpdateCriticalValueConfigDto {
  criticalLow?: number;
  criticalHigh?: number;
  panicLow?: number;
  panicHigh?: number;
  requireAcknowledgment: boolean;
  acknowledgmentTimeoutMinutes?: number;
  notificationMethod?: string;
}

export interface LabTestNormDto {
  id: string;
  testId: string;
  reagentId: string;
  reagentName: string;
  quantity: number;
  unit: string;
}

export interface UpdateLabTestNormDto {
  id?: string;
  reagentId: string;
  quantity: number;
  unit: string;
}

export interface LabConclusionTemplateDto {
  id: string;
  testId?: string;
  testCode?: string;
  testName?: string;
  templateCode: string;
  templateName: string;
  conclusionText: string;
  condition?: string;
  isActive: boolean;
}

export interface SaveConclusionTemplateDto {
  id?: string;
  testId?: string;
  templateCode: string;
  templateName: string;
  conclusionText: string;
  condition?: string;
  isActive: boolean;
}

// Report interfaces
export interface LabRegisterReportDto {
  fromDate: string;
  toDate: string;
  departmentName?: string;
  totalOrders: number;
  totalTests: number;
  items: LabRegisterItemDto[];
}

export interface LabRegisterItemDto {
  rowNumber: number;
  orderDate: string;
  patientCode: string;
  patientName: string;
  age?: number;
  gender?: string;
  testName: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  orderDoctorName?: string;
  technicianName?: string;
}

export interface LabStatisticsDto {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  totalTests: number;
  completedTests: number;
  pendingTests: number;
  abnormalCount: number;
  criticalCount: number;
  byDay: LabStatisticsByDayDto[];
  byTest: LabStatisticsByTestDto[];
}

export interface LabStatisticsByDayDto {
  date: string;
  orderCount: number;
  testCount: number;
}

export interface LabStatisticsByTestDto {
  testCode: string;
  testName: string;
  count: number;
  abnormalCount: number;
}

export interface LabRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  byDepartment: LabRevenueByDepartmentDto[];
  byTest: LabRevenueByTestDto[];
}

export interface LabRevenueByDepartmentDto {
  departmentName: string;
  testCount: number;
  revenue: number;
}

export interface LabRevenueByTestDto {
  testCode: string;
  testName: string;
  count: number;
  revenue: number;
}

export interface LabTATReportDto {
  fromDate: string;
  toDate: string;
  totalTests: number;
  averageTATMinutes: number;
  tatCompliancePercent: number;
  tatByTest: LabTATByTestDto[];
  tatByDay: LabTATByDayDto[];
}

export interface LabTATByTestDto {
  testCode: string;
  testName: string;
  testCount: number;
  targetTATMinutes?: number;
  averageTATMinutes: number;
  compliancePercent: number;
}

export interface LabTATByDayDto {
  date: string;
  testCount: number;
  averageTATMinutes: number;
  compliancePercent: number;
}

export interface AnalyzerUtilizationReportDto {
  fromDate: string;
  toDate: string;
  analyzers: AnalyzerUtilizationItemDto[];
}

export interface AnalyzerUtilizationItemDto {
  analyzerId: string;
  analyzerName: string;
  totalTests: number;
  capacity: number;
  utilizationPercent: number;
  uptimePercent: number;
  errorCount: number;
}

export interface AbnormalRateReportDto {
  fromDate: string;
  toDate: string;
  totalTests: number;
  abnormalCount: number;
  abnormalPercent: number;
  criticalCount: number;
  criticalPercent: number;
  byTest: AbnormalRateByTestDto[];
}

export interface AbnormalRateByTestDto {
  testCode: string;
  testName: string;
  totalCount: number;
  abnormalCount: number;
  abnormalPercent: number;
  highCount: number;
  lowCount: number;
  criticalCount: number;
}

export interface QCReportDto {
  fromDate: string;
  toDate: string;
  byAnalyzer: QCReportByAnalyzerDto[];
}

export interface QCReportByAnalyzerDto {
  analyzerId: string;
  analyzerName: string;
  totalQCRuns: number;
  acceptedRuns: number;
  rejectedRuns: number;
  acceptanceRate: number;
  byTest: QCReportByTestDto[];
}

export interface QCReportByTestDto {
  testCode: string;
  testName: string;
  totalRuns: number;
  accepted: number;
  rejected: number;
  cv: number;
  bias: number;
}

// Worklist interfaces
export interface WorklistDto {
  id: string;
  analyzerId: string;
  analyzerName: string;
  createdTime: string;
  sentTime?: string;
  status: string;
  orderCount: number;
  sentCount: number;
  errorCount: number;
  orders: WorklistOrderDto[];
}

export interface WorklistOrderDto {
  orderId: string;
  orderCode: string;
  patientName: string;
  sampleId: string;
  tests: string[];
  status: string;
  errorMessage?: string;
}

export interface CreateWorklistDto {
  analyzerId: string;
  orderIds: string[];
  autoSend: boolean;
}

export interface ProcessAnalyzerResultDto {
  processedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  errors: string[];
}

export interface UnmappedResultDto {
  id: string;
  analyzerId: string;
  analyzerName: string;
  sampleId: string;
  testCode: string;
  result: string;
  receivedTime: string;
  rawData: string;
}

export interface ManualMapResultDto {
  unmappedResultId: string;
  orderItemId: string;
}

// POCT interfaces
export interface POCTDeviceDto {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
}

export interface EnterPOCTResultDto {
  deviceId: string;
  patientId: string;
  visitId?: string;
  testCode: string;
  result: string;
  testTime: string;
  operatorId?: string;
}

export interface SyncPOCTResultDto {
  syncedCount: number;
  matchedCount: number;
  errorCount: number;
  errors: string[];
}

// Microbiology interfaces
export interface MicrobiologyCultureDto {
  id: string;
  orderId: string;
  orderCode: string;
  patientId: string;
  patientName: string;
  sampleType: string;
  collectionDate: string;
  cultureStartDate?: string;
  status: string;
  preliminaryResult?: string;
  finalResult?: string;
  reportDate?: string;
  technicianName?: string;
}

export interface EnterCultureResultDto {
  cultureId: string;
  cultureDate: string;
  hasGrowth: boolean;
  organisms: CultureOrganismDto[];
  preliminaryConclusion?: string;
  finalConclusion?: string;
}

export interface CultureOrganismDto {
  organismId?: string;
  organismCode: string;
  organismName: string;
  quantity: string;
  colonyDescription?: string;
}

export interface EnterAntibioticSensitivityDto {
  cultureId: string;
  organismId: string;
  results: AntibioticResultDto[];
}

export interface AntibioticResultDto {
  antibioticId: string;
  sensitivity: string;
  mic?: number;
  zoneDiameter?: number;
}

export interface AntibioticDto {
  id: string;
  code: string;
  name: string;
  group: string;
  isActive: boolean;
}

export interface BacteriaDto {
  id: string;
  code: string;
  name: string;
  scientificName?: string;
  type: string;
  isActive: boolean;
}

export interface MicrobiologyStatisticsDto {
  fromDate: string;
  toDate: string;
  totalCultures: number;
  positiveCultures: number;
  positiveRate: number;
  topOrganisms: OrganismFrequencyDto[];
  resistancePatterns: AntibioticResistanceDto[];
}

export interface OrganismFrequencyDto {
  organismName: string;
  count: number;
  percentage: number;
}

export interface AntibioticResistanceDto {
  organismName: string;
  antibioticName: string;
  testedCount: number;
  resistantCount: number;
  resistanceRate: number;
}

// #endregion

// #region 7.1 Analyzer Management APIs

export const getAnalyzers = (keyword?: string, isActive?: boolean) =>
  apiClient.get<LabAnalyzerDto[]>('/LISComplete/analyzers', {
    params: { keyword, isActive }
  });

export const createAnalyzer = (data: CreateAnalyzerDto) =>
  apiClient.post<LabAnalyzerDto>('/LISComplete/analyzers', data);

export const updateAnalyzer = (id: string, data: UpdateAnalyzerDto) =>
  apiClient.put<LabAnalyzerDto>(`/LISComplete/analyzers/${id}`, data);

export const deleteAnalyzer = (id: string) =>
  apiClient.delete(`/LISComplete/analyzers/${id}`);

export const getAnalyzerTestMappings = (analyzerId: string) =>
  apiClient.get<AnalyzerTestMappingDto[]>(`/LISComplete/analyzers/${analyzerId}/mappings`);

export const updateAnalyzerTestMappings = (analyzerId: string, mappings: UpdateAnalyzerTestMappingDto[]) =>
  apiClient.put(`/LISComplete/analyzers/${analyzerId}/mappings`, mappings);

export const checkAnalyzerConnection = (analyzerId: string) =>
  apiClient.get<AnalyzerConnectionStatusDto>(`/LISComplete/analyzers/${analyzerId}/connection-status`);

export const toggleAnalyzerConnection = (analyzerId: string, connect: boolean) =>
  apiClient.post(`/LISComplete/analyzers/${analyzerId}/toggle-connection`, null, {
    params: { connect }
  });

export const getRawDataFromAnalyzer = (analyzerId: string, fromDate: string, toDate: string) =>
  apiClient.get<RawDataDto[]>(`/LISComplete/analyzers/${analyzerId}/raw-data`, {
    params: { fromDate, toDate }
  });

export const getConnectionLogs = (analyzerId: string, fromDate: string, toDate: string) =>
  apiClient.get<AnalyzerConnectionLogDto[]>(`/LISComplete/analyzers/${analyzerId}/connection-logs`, {
    params: { fromDate, toDate }
  });

export const getAnalyzersRealtimeStatus = () =>
  apiClient.get<AnalyzerRealtimeStatusDto[]>('/LISComplete/analyzers/realtime-status');

// #endregion

// #region 7.2 Sample Collection APIs

export const getSampleCollectionList = (
  date: string,
  departmentId?: string,
  patientType?: string,
  keyword?: string
) =>
  apiClient.get<SampleCollectionListDto[]>('/LISComplete/sample-collection/list', {
    params: { date, departmentId, patientType, keyword }
  });

export const getPatientSamples = (patientId: string, visitId: string) =>
  apiClient.get<SampleCollectionItemDto[]>(
    `/LISComplete/sample-collection/patient/${patientId}/visit/${visitId}`
  );

export const collectSample = (data: CollectSampleDto) =>
  apiClient.post<CollectSampleResultDto>('/LISComplete/sample-collection/collect', data);

export const printSampleBarcode = (sampleId: string) =>
  apiClient.get(`/LISComplete/sample-collection/${sampleId}/barcode`, {
    responseType: 'blob'
  });

export const printSampleBarcodesBatch = (sampleIds: string[]) =>
  apiClient.post('/LISComplete/sample-collection/barcodes/batch', sampleIds, {
    responseType: 'blob'
  });

export const cancelSample = (sampleId: string, reason: string) =>
  apiClient.post(`/LISComplete/sample-collection/${sampleId}/cancel`, { reason });

export const getSampleTypes = () =>
  apiClient.get<SampleTypeDto[]>('/LISComplete/sample-types');

export const getTubeTypes = () =>
  apiClient.get<TubeTypeDto[]>('/LISComplete/tube-types');

export const validateSample = (sampleId: string) =>
  apiClient.get<SampleValidationResultDto>(`/LISComplete/sample-collection/${sampleId}/validate`);

// #endregion

// #region 7.3 Lab Test Execution APIs

export const getPendingLabOrders = (
  date: string,
  departmentId?: string,
  analyzerId?: string,
  patientType?: string,
  keyword?: string
) =>
  apiClient.get<LabOrderDto[]>('/LISComplete/orders/pending', {
    params: { date, departmentId, analyzerId, patientType, keyword }
  });

export const getLabOrderDetail = (orderId: string) =>
  apiClient.get<LabOrderDetailDto>(`/LISComplete/orders/${orderId}`);

export const sendWorklistToAnalyzer = (data: SendWorklistDto) =>
  apiClient.post<SendWorklistResultDto>('/LISComplete/worklist/send', data);

export const receiveResultFromAnalyzer = (analyzerId: string) =>
  apiClient.post<ReceiveResultDto>(`/LISComplete/analyzers/${analyzerId}/receive-results`);

export const enterLabResult = (data: EnterLabResultDto) =>
  apiClient.post('/LISComplete/orders/enter-result', data);

export const approveLabResult = (data: ApproveLabResultDto) =>
  apiClient.post('/LISComplete/orders/approve', data);

export const preliminaryApproveLabResult = (orderId: string, technicianNote?: string) =>
  apiClient.post(`/LISComplete/orders/${orderId}/preliminary-approve`, { technicianNote });

export const finalApproveLabResult = (orderId: string, doctorNote?: string) =>
  apiClient.post(`/LISComplete/orders/${orderId}/final-approve`, { doctorNote });

export const cancelApproval = (orderId: string, reason: string) =>
  apiClient.post(`/LISComplete/orders/${orderId}/cancel-approval`, { reason });

export const printLabResult = (orderId: string, format: string = 'A4') =>
  apiClient.get(`/LISComplete/orders/${orderId}/print`, {
    params: { format },
    responseType: 'blob'
  });

export const processCriticalValue = (data: ProcessCriticalValueDto) =>
  apiClient.post('/LISComplete/critical-values/process', data);

export const getCriticalValueAlerts = (fromDate: string, toDate: string, acknowledged?: boolean) =>
  apiClient.get<CriticalValueAlertDto[]>('/LISComplete/critical-values/alerts', {
    params: { fromDate, toDate, acknowledged }
  });

export const acknowledgeCriticalValue = (alertId: string, data: AcknowledgeCriticalValueDto) =>
  apiClient.post(`/LISComplete/critical-values/${alertId}/acknowledge`, data);

export const getLabResultHistory = (patientId: string, testCode?: string, lastNMonths?: number) =>
  apiClient.get<LabResultHistoryDto[]>(`/LISComplete/patients/${patientId}/history`, {
    params: { testCode, lastNMonths }
  });

export const compareLabResults = (patientId: string, testCode: string, lastNTimes: number = 5) =>
  apiClient.get<LabResultComparisonDto>(`/LISComplete/patients/${patientId}/compare`, {
    params: { testCode, lastNTimes }
  });

export const performDeltaCheck = (orderId: string) =>
  apiClient.get<DeltaCheckResultDto>(`/LISComplete/orders/${orderId}/delta-check`);

export const rerunLabTest = (orderItemId: string, reason: string) =>
  apiClient.post(`/LISComplete/orders/items/${orderItemId}/rerun`, { reason });

// #endregion

// #region QC APIs

export const runQC = (data: RunQCDto) =>
  apiClient.post<QCResultDto>('/LISComplete/qc/run', data);

export const getLeveyJenningsChart = (
  testId: string,
  analyzerId: string,
  fromDate: string,
  toDate: string
) =>
  apiClient.get<LeveyJenningsChartDto>('/LISComplete/qc/levey-jennings', {
    params: { testId, analyzerId, fromDate, toDate }
  });

export const getQCReport = (fromDate: string, toDate: string, analyzerId?: string) =>
  apiClient.get<QCReportDto>('/LISComplete/reports/qc', {
    params: { fromDate, toDate, analyzerId }
  });

// #endregion

// #region 7.4 Catalog Management APIs

export const getLabTestCatalog = (keyword?: string, groupId?: string, isActive?: boolean) =>
  apiClient.get<LabTestCatalogDto[]>('/LISComplete/catalog/tests', {
    params: { keyword, groupId, isActive }
  });

export const saveLabTest = (data: SaveLabTestDto) =>
  apiClient.post<LabTestCatalogDto>('/LISComplete/catalog/tests', data);

export const getLabTestGroups = () =>
  apiClient.get<LabTestGroupDto[]>('/LISComplete/catalog/groups');

export const saveLabTestGroup = (data: SaveLabTestGroupDto) =>
  apiClient.post<LabTestGroupDto>('/LISComplete/catalog/groups', data);

export const getReferenceRanges = (testId: string) =>
  apiClient.get<ReferenceRangeDto[]>(`/LISComplete/catalog/tests/${testId}/reference-ranges`);

export const updateReferenceRanges = (testId: string, ranges: UpdateReferenceRangeDto[]) =>
  apiClient.put(`/LISComplete/catalog/tests/${testId}/reference-ranges`, ranges);

export const getCriticalValueConfig = (testId: string) =>
  apiClient.get<CriticalValueConfigDto>(`/LISComplete/catalog/tests/${testId}/critical-values`);

export const updateCriticalValueConfig = (testId: string, config: UpdateCriticalValueConfigDto) =>
  apiClient.put(`/LISComplete/catalog/tests/${testId}/critical-values`, config);

export const getLabTestNorms = (testId: string) =>
  apiClient.get<LabTestNormDto[]>(`/LISComplete/catalog/tests/${testId}/norms`);

export const updateLabTestNorms = (testId: string, norms: UpdateLabTestNormDto[]) =>
  apiClient.put(`/LISComplete/catalog/tests/${testId}/norms`, norms);

export const getConclusionTemplates = (testId?: string) =>
  apiClient.get<LabConclusionTemplateDto[]>('/LISComplete/catalog/conclusion-templates', {
    params: { testId }
  });

export const saveConclusionTemplate = (data: SaveConclusionTemplateDto) =>
  apiClient.post<LabConclusionTemplateDto>('/LISComplete/catalog/conclusion-templates', data);

// #endregion

// #region Report APIs

export const getLabRegisterReport = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<LabRegisterReportDto>('/LISComplete/reports/register', {
    params: { fromDate, toDate, departmentId }
  });

export const getLabStatistics = (fromDate: string, toDate: string, groupBy: string = 'day') =>
  apiClient.get<LabStatisticsDto>('/LISComplete/reports/statistics', {
    params: { fromDate, toDate, groupBy }
  });

export const getLabRevenueReport = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<LabRevenueReportDto>('/LISComplete/reports/revenue', {
    params: { fromDate, toDate, departmentId }
  });

export const getLabTATReport = (fromDate: string, toDate: string) =>
  apiClient.get<LabTATReportDto>('/LISComplete/reports/tat', {
    params: { fromDate, toDate }
  });

export const getAnalyzerUtilizationReport = (fromDate: string, toDate: string, analyzerId?: string) =>
  apiClient.get<AnalyzerUtilizationReportDto>('/LISComplete/reports/analyzer-utilization', {
    params: { fromDate, toDate, analyzerId }
  });

export const getAbnormalRateReport = (fromDate: string, toDate: string) =>
  apiClient.get<AbnormalRateReportDto>('/LISComplete/reports/abnormal-rate', {
    params: { fromDate, toDate }
  });

export const exportLabDataForBHXH = (fromDate: string, toDate: string) =>
  apiClient.get('/LISComplete/reports/bhxh-export', {
    params: { fromDate, toDate },
    responseType: 'blob'
  });

// #endregion

// #region Worklist APIs

export const createWorklist = (data: CreateWorklistDto) =>
  apiClient.post<WorklistDto>('/LISComplete/worklist/create', data);

export const getPendingWorklists = (analyzerId?: string) =>
  apiClient.get<WorklistDto[]>('/LISComplete/worklist/pending', {
    params: { analyzerId }
  });

export const processAnalyzerResult = (analyzerId: string, rawData: string) =>
  apiClient.post<ProcessAnalyzerResultDto>(`/LISComplete/analyzers/${analyzerId}/process-result`, { rawData });

export const getUnmappedResults = (analyzerId?: string) =>
  apiClient.get<UnmappedResultDto[]>('/LISComplete/unmapped-results', {
    params: { analyzerId }
  });

export const manualMapResult = (data: ManualMapResultDto) =>
  apiClient.post('/LISComplete/unmapped-results/map', data);

export const retryWorklist = (worklistId: string) =>
  apiClient.post(`/LISComplete/worklist/${worklistId}/retry`);

// #endregion

// #region POCT APIs

export const getPOCTDevices = (keyword?: string) =>
  apiClient.get<POCTDeviceDto[]>('/LISComplete/poct/devices', {
    params: { keyword }
  });

export const enterPOCTResult = (data: EnterPOCTResultDto) =>
  apiClient.post('/LISComplete/poct/results', data);

export const syncPOCTResults = (deviceId: string) =>
  apiClient.post<SyncPOCTResultDto>(`/LISComplete/poct/devices/${deviceId}/sync`);

// #endregion

// #region Microbiology APIs

export const getMicrobiologyCultures = (fromDate: string, toDate: string, status?: string) =>
  apiClient.get<MicrobiologyCultureDto[]>('/LISComplete/microbiology/cultures', {
    params: { fromDate, toDate, status }
  });

export const enterCultureResult = (data: EnterCultureResultDto) =>
  apiClient.post('/LISComplete/microbiology/cultures/result', data);

export const enterAntibioticSensitivity = (data: EnterAntibioticSensitivityDto) =>
  apiClient.post('/LISComplete/microbiology/antibiotic-sensitivity', data);

export const getAntibiotics = () =>
  apiClient.get<AntibioticDto[]>('/LISComplete/microbiology/antibiotics');

export const getBacterias = () =>
  apiClient.get<BacteriaDto[]>('/LISComplete/microbiology/bacterias');

export const getMicrobiologyStatistics = (fromDate: string, toDate: string) =>
  apiClient.get<MicrobiologyStatisticsDto>('/LISComplete/microbiology/statistics', {
    params: { fromDate, toDate }
  });

// #endregion

export default {
  // Analyzer Management
  getAnalyzers,
  createAnalyzer,
  updateAnalyzer,
  deleteAnalyzer,
  getAnalyzerTestMappings,
  updateAnalyzerTestMappings,
  checkAnalyzerConnection,
  toggleAnalyzerConnection,
  getRawDataFromAnalyzer,
  getConnectionLogs,
  getAnalyzersRealtimeStatus,

  // Sample Collection
  getSampleCollectionList,
  getPatientSamples,
  collectSample,
  printSampleBarcode,
  printSampleBarcodesBatch,
  cancelSample,
  getSampleTypes,
  getTubeTypes,
  validateSample,

  // Lab Test Execution
  getPendingLabOrders,
  getLabOrderDetail,
  sendWorklistToAnalyzer,
  receiveResultFromAnalyzer,
  enterLabResult,
  approveLabResult,
  preliminaryApproveLabResult,
  finalApproveLabResult,
  cancelApproval,
  printLabResult,
  processCriticalValue,
  getCriticalValueAlerts,
  acknowledgeCriticalValue,
  getLabResultHistory,
  compareLabResults,
  performDeltaCheck,
  rerunLabTest,

  // QC
  runQC,
  getLeveyJenningsChart,
  getQCReport,

  // Catalog Management
  getLabTestCatalog,
  saveLabTest,
  getLabTestGroups,
  saveLabTestGroup,
  getReferenceRanges,
  updateReferenceRanges,
  getCriticalValueConfig,
  updateCriticalValueConfig,
  getLabTestNorms,
  updateLabTestNorms,
  getConclusionTemplates,
  saveConclusionTemplate,

  // Reports
  getLabRegisterReport,
  getLabStatistics,
  getLabRevenueReport,
  getLabTATReport,
  getAnalyzerUtilizationReport,
  getAbnormalRateReport,
  exportLabDataForBHXH,

  // Worklist
  createWorklist,
  getPendingWorklists,
  processAnalyzerResult,
  getUnmappedResults,
  manualMapResult,
  retryWorklist,

  // POCT
  getPOCTDevices,
  enterPOCTResult,
  syncPOCTResults,

  // Microbiology
  getMicrobiologyCultures,
  enterCultureResult,
  enterAntibioticSensitivity,
  getAntibiotics,
  getBacterias,
  getMicrobiologyStatistics
};
