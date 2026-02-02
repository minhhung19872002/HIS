/**
 * API Client cho Phân hệ 15: Quản lý Trang thiết bị y tế (Medical Equipment)
 * Module: Equipment
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Equipment Inventory DTOs

export interface EquipmentDto {
  id: string;
  equipmentCode: string;
  name: string;
  nameEnglish?: string;
  category: string;
  categoryName: string;
  subcategory?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetNumber?: string;
  departmentId: string;
  departmentName: string;
  locationId?: string;
  locationName?: string;
  roomId?: string;
  roomName?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseOrderNumber?: string;
  supplier?: string;
  warrantyExpiry?: string;
  expectedLifeYears?: number;
  currentValue?: number;
  depreciationMethod?: string;
  riskClass: string; // Class I, II, III
  riskClassName: string;
  fdaClearance?: string;
  ceMarking?: boolean;
  operationalStatus: number; // 1-Operational, 2-UnderMaintenance, 3-OutOfService, 4-Decommissioned
  operationalStatusName: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  maintenanceSchedule?: string;
  calibrationSchedule?: string;
  usageInstructions?: string;
  safetyInstructions?: string;
  trainingRequired: boolean;
  authorizedUsers?: string[];
  accessories?: string[];
  consumables?: string[];
  imageUrl?: string;
  manualUrl?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CreateEquipmentDto {
  equipmentCode: string;
  name: string;
  nameEnglish?: string;
  category: string;
  subcategory?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetNumber?: string;
  departmentId: string;
  locationId?: string;
  roomId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  supplier?: string;
  warrantyExpiry?: string;
  expectedLifeYears?: number;
  riskClass: string;
  fdaClearance?: string;
  ceMarking?: boolean;
  maintenanceSchedule?: string;
  calibrationSchedule?: string;
  usageInstructions?: string;
  safetyInstructions?: string;
  trainingRequired: boolean;
  notes?: string;
}

export interface EquipmentSearchDto {
  keyword?: string;
  category?: string;
  departmentId?: string;
  operationalStatus?: number;
  riskClass?: string;
  maintenanceDue?: boolean;
  calibrationDue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface EquipmentCategoryDto {
  code: string;
  name: string;
  description?: string;
  parentCode?: string;
  subcategories?: EquipmentCategoryDto[];
  isActive: boolean;
}

// #endregion

// #region Maintenance DTOs

export interface MaintenanceScheduleDto {
  id: string;
  scheduleCode: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  departmentName: string;
  maintenanceType: string; // Preventive, Corrective, Predictive
  maintenanceTypeName: string;
  frequency: string; // Monthly, Quarterly, SemiAnnual, Annual
  frequencyName: string;
  lastPerformedDate?: string;
  nextDueDate: string;
  assignedToId?: string;
  assignedToName?: string;
  checklistItems: MaintenanceChecklistItemDto[];
  estimatedDurationMinutes?: number;
  estimatedCost?: number;
  notes?: string;
  isActive: boolean;
  status: number;
  statusName: string;
}

export interface MaintenanceChecklistItemDto {
  id?: string;
  itemOrder: number;
  description: string;
  isMandatory: boolean;
  acceptanceCriteria?: string;
}

export interface MaintenanceRecordDto {
  id: string;
  recordCode: string;
  scheduleId?: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  departmentName: string;
  maintenanceType: string;
  maintenanceTypeName: string;
  isScheduled: boolean;
  scheduledDate?: string;
  performedDate: string;
  performedBy: string;
  performedByName: string;
  performedByCompany?: string;
  description: string;
  workPerformed: string;
  partsReplaced?: MaintenancePartDto[];
  checklistResults?: ChecklistResultDto[];
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  equipmentDowntimeHours?: number;
  beforeStatus: number;
  afterStatus: number;
  afterStatusName: string;
  testResults?: string;
  certificateNumber?: string;
  nextMaintenanceDate?: string;
  recommendations?: string;
  attachments?: AttachmentDto[];
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: number;
  statusName: string;
}

export interface MaintenancePartDto {
  partName: string;
  partNumber?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ChecklistResultDto {
  itemId: string;
  description: string;
  passed: boolean;
  notes?: string;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

export interface CreateMaintenanceRecordDto {
  scheduleId?: string;
  equipmentId: string;
  maintenanceType: string;
  scheduledDate?: string;
  performedDate: string;
  performedByCompany?: string;
  description: string;
  workPerformed: string;
  partsReplaced?: MaintenancePartDto[];
  checklistResults?: ChecklistResultDto[];
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  equipmentDowntimeHours?: number;
  afterStatus: number;
  testResults?: string;
  certificateNumber?: string;
  nextMaintenanceDate?: string;
  recommendations?: string;
  notes?: string;
}

// #endregion

// #region Calibration DTOs

export interface CalibrationRecordDto {
  id: string;
  recordCode: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  departmentName: string;
  calibrationDate: string;
  calibratedBy: string;
  calibratedByName: string;
  calibratedByCompany?: string;
  calibrationStandard?: string;
  referenceEquipment?: string;
  referenceEquipmentCertificate?: string;
  temperatureC?: number;
  humidityPct?: number;
  testPoints: CalibrationTestPointDto[];
  result: string; // Pass, Fail, PassWithAdjustment
  resultName: string;
  adjustmentsMade?: string;
  uncertainty?: string;
  certificateNumber: string;
  certificateIssueDate: string;
  certificateExpiry: string;
  nextCalibrationDate: string;
  attachments?: AttachmentDto[];
  notes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: number;
  statusName: string;
}

export interface CalibrationTestPointDto {
  parameter: string;
  unit: string;
  nominalValue: number;
  measuredValue: number;
  tolerance: number;
  deviation: number;
  passed: boolean;
  notes?: string;
}

export interface CreateCalibrationRecordDto {
  equipmentId: string;
  calibrationDate: string;
  calibratedByCompany?: string;
  calibrationStandard?: string;
  referenceEquipment?: string;
  referenceEquipmentCertificate?: string;
  temperatureC?: number;
  humidityPct?: number;
  testPoints: CalibrationTestPointDto[];
  result: string;
  adjustmentsMade?: string;
  uncertainty?: string;
  certificateNumber: string;
  certificateExpiry: string;
  notes?: string;
}

// #endregion

// #region Repair DTOs

export interface RepairRequestDto {
  id: string;
  requestCode: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  departmentId: string;
  departmentName: string;
  requestedBy: string;
  requestedByName: string;
  requestedDate: string;
  priority: number; // 1-Low, 2-Medium, 3-High, 4-Critical
  priorityName: string;
  problemDescription: string;
  symptoms?: string;
  impactDescription?: string;
  equipmentLocation: string;
  contactPerson: string;
  contactPhone?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedDate?: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  diagnosisNotes?: string;
  repairActions?: string;
  partsUsed?: MaintenancePartDto[];
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  externalRepairCost?: number;
  totalCost?: number;
  downtimeHours?: number;
  rootCause?: string;
  preventiveMeasures?: string;
  status: number; // 1-Pending, 2-Assigned, 3-InProgress, 4-Completed, 5-Cancelled
  statusName: string;
  completedBy?: string;
  completedByName?: string;
  attachments?: AttachmentDto[];
  notes?: string;
}

export interface CreateRepairRequestDto {
  equipmentId: string;
  priority: number;
  problemDescription: string;
  symptoms?: string;
  impactDescription?: string;
  equipmentLocation: string;
  contactPerson: string;
  contactPhone?: string;
  notes?: string;
}

export interface AssignRepairDto {
  requestId: string;
  assignedToId: string;
  estimatedCompletionDate?: string;
  notes?: string;
}

export interface CompleteRepairDto {
  requestId: string;
  diagnosisNotes: string;
  repairActions: string;
  partsUsed?: MaintenancePartDto[];
  laborHours?: number;
  laborCost?: number;
  partsCost?: number;
  externalRepairCost?: number;
  downtimeHours?: number;
  rootCause?: string;
  preventiveMeasures?: string;
  testResults?: string;
  notes?: string;
}

// #endregion

// #region Disposal DTOs

export interface EquipmentDisposalDto {
  id: string;
  disposalCode: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  departmentName: string;
  disposalReason: string; // EndOfLife, Obsolete, Irreparable, SafetyConcern, Upgrade
  disposalReasonName: string;
  disposalMethod: string; // Sale, Donation, Recycling, Destruction, TradeIn
  disposalMethodName: string;
  requestedBy: string;
  requestedByName: string;
  requestedDate: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  disposalDate?: string;
  disposedBy?: string;
  disposedByName?: string;
  originalValue?: number;
  bookValue?: number;
  disposalValue?: number;
  disposalRecipient?: string;
  disposalRecipientContact?: string;
  environmentalClearance: boolean;
  dataSanitized: boolean;
  certificateNumber?: string;
  attachments?: AttachmentDto[];
  notes?: string;
  status: number; // 1-Requested, 2-Approved, 3-Disposed, 4-Rejected
  statusName: string;
}

export interface CreateDisposalRequestDto {
  equipmentId: string;
  disposalReason: string;
  disposalMethod: string;
  estimatedDisposalValue?: number;
  disposalRecipient?: string;
  environmentalClearance: boolean;
  dataSanitized: boolean;
  notes?: string;
}

export interface ApproveDisposalDto {
  disposalId: string;
  isApproved: boolean;
  approvalNotes?: string;
}

export interface CompleteDisposalDto {
  disposalId: string;
  disposalDate: string;
  actualDisposalValue?: number;
  disposalRecipient?: string;
  disposalRecipientContact?: string;
  certificateNumber?: string;
  notes?: string;
}

// #endregion

// #region Dashboard DTOs

export interface EquipmentDashboardDto {
  date: string;
  departmentId?: string;
  // Inventory summary
  totalEquipment: number;
  operationalEquipment: number;
  underMaintenanceEquipment: number;
  outOfServiceEquipment: number;
  decommissionedEquipment: number;
  // Value
  totalAssetValue: number;
  depreciatedValue: number;
  // Maintenance
  maintenanceDueThisWeek: number;
  maintenanceOverdue: number;
  calibrationDueThisWeek: number;
  calibrationOverdue: number;
  // Repairs
  openRepairRequests: number;
  criticalRepairs: number;
  averageRepairTime: number;
  // Costs
  monthlyMaintenanceCost: number;
  monthlyRepairCost: number;
  yearToDateCost: number;
  // By category
  byCategory: CategoryStatDto[];
  // By department
  byDepartment: DepartmentEquipmentStatDto[];
  // Alerts
  alerts: EquipmentAlertDto[];
}

export interface CategoryStatDto {
  category: string;
  categoryName: string;
  count: number;
  operationalCount: number;
  totalValue: number;
}

export interface DepartmentEquipmentStatDto {
  departmentId: string;
  departmentName: string;
  totalEquipment: number;
  operationalEquipment: number;
  maintenanceDue: number;
  openRepairs: number;
}

export interface EquipmentAlertDto {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  alertType: string; // MaintenanceDue, CalibrationDue, WarrantyExpiring, CriticalRepair
  alertTypeName: string;
  severity: number;
  severityName: string;
  dueDate?: string;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// #endregion

// #region Common DTOs

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/api/equipment';

// #region Equipment Inventory

export const getEquipment = (params: EquipmentSearchDto) =>
  apiClient.get<PagedResultDto<EquipmentDto>>(`${BASE_URL}`, { params });

export const getEquipmentById = (id: string) =>
  apiClient.get<EquipmentDto>(`${BASE_URL}/${id}`);

export const getEquipmentByCode = (code: string) =>
  apiClient.get<EquipmentDto>(`${BASE_URL}/code/${code}`);

export const createEquipment = (dto: CreateEquipmentDto) =>
  apiClient.post<EquipmentDto>(`${BASE_URL}`, dto);

export const updateEquipment = (id: string, dto: CreateEquipmentDto) =>
  apiClient.put<EquipmentDto>(`${BASE_URL}/${id}`, dto);

export const updateEquipmentStatus = (id: string, status: number, reason?: string) =>
  apiClient.post<EquipmentDto>(`${BASE_URL}/${id}/status`, { status, reason });

export const transferEquipment = (id: string, newDepartmentId: string, newLocationId?: string, notes?: string) =>
  apiClient.post<EquipmentDto>(`${BASE_URL}/${id}/transfer`, { newDepartmentId, newLocationId, notes });

export const getDepartmentEquipment = (departmentId: string) =>
  apiClient.get<EquipmentDto[]>(`${BASE_URL}/department/${departmentId}`);

export const getEquipmentCategories = () =>
  apiClient.get<EquipmentCategoryDto[]>(`${BASE_URL}/categories`);

export const printEquipmentLabel = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print-label`, { responseType: 'blob' });

export const printEquipmentReport = (id: string) =>
  apiClient.get(`${BASE_URL}/${id}/print-report`, { responseType: 'blob' });

// #endregion

// #region Maintenance

export const getMaintenanceSchedules = (equipmentId?: string, dueWithinDays?: number) =>
  apiClient.get<MaintenanceScheduleDto[]>(`${BASE_URL}/maintenance/schedules`, { params: { equipmentId, dueWithinDays } });

export const getMaintenanceSchedule = (id: string) =>
  apiClient.get<MaintenanceScheduleDto>(`${BASE_URL}/maintenance/schedules/${id}`);

export const createMaintenanceSchedule = (dto: MaintenanceScheduleDto) =>
  apiClient.post<MaintenanceScheduleDto>(`${BASE_URL}/maintenance/schedules`, dto);

export const updateMaintenanceSchedule = (id: string, dto: MaintenanceScheduleDto) =>
  apiClient.put<MaintenanceScheduleDto>(`${BASE_URL}/maintenance/schedules/${id}`, dto);

export const getMaintenanceRecords = (equipmentId: string) =>
  apiClient.get<MaintenanceRecordDto[]>(`${BASE_URL}/${equipmentId}/maintenance`);

export const getMaintenanceRecord = (id: string) =>
  apiClient.get<MaintenanceRecordDto>(`${BASE_URL}/maintenance/${id}`);

export const createMaintenanceRecord = (dto: CreateMaintenanceRecordDto) =>
  apiClient.post<MaintenanceRecordDto>(`${BASE_URL}/maintenance`, dto);

export const approveMaintenanceRecord = (id: string) =>
  apiClient.post<MaintenanceRecordDto>(`${BASE_URL}/maintenance/${id}/approve`);

export const getDueMaintenanceList = (dueWithinDays?: number) =>
  apiClient.get<EquipmentDto[]>(`${BASE_URL}/maintenance/due`, { params: { dueWithinDays } });

export const printMaintenanceReport = (id: string) =>
  apiClient.get(`${BASE_URL}/maintenance/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Calibration

export const getCalibrationRecords = (equipmentId: string) =>
  apiClient.get<CalibrationRecordDto[]>(`${BASE_URL}/${equipmentId}/calibration`);

export const getCalibrationRecord = (id: string) =>
  apiClient.get<CalibrationRecordDto>(`${BASE_URL}/calibration/${id}`);

export const createCalibrationRecord = (dto: CreateCalibrationRecordDto) =>
  apiClient.post<CalibrationRecordDto>(`${BASE_URL}/calibration`, dto);

export const approveCalibrationRecord = (id: string) =>
  apiClient.post<CalibrationRecordDto>(`${BASE_URL}/calibration/${id}/approve`);

export const getDueCalibrationList = (dueWithinDays?: number) =>
  apiClient.get<EquipmentDto[]>(`${BASE_URL}/calibration/due`, { params: { dueWithinDays } });

export const printCalibrationCertificate = (id: string) =>
  apiClient.get(`${BASE_URL}/calibration/${id}/print-certificate`, { responseType: 'blob' });

// #endregion

// #region Repairs

export const getRepairRequests = (departmentId?: string, status?: number, priority?: number) =>
  apiClient.get<RepairRequestDto[]>(`${BASE_URL}/repairs`, { params: { departmentId, status, priority } });

export const getRepairRequest = (id: string) =>
  apiClient.get<RepairRequestDto>(`${BASE_URL}/repairs/${id}`);

export const getEquipmentRepairHistory = (equipmentId: string) =>
  apiClient.get<RepairRequestDto[]>(`${BASE_URL}/${equipmentId}/repairs`);

export const createRepairRequest = (dto: CreateRepairRequestDto) =>
  apiClient.post<RepairRequestDto>(`${BASE_URL}/repairs`, dto);

export const assignRepair = (dto: AssignRepairDto) =>
  apiClient.post<RepairRequestDto>(`${BASE_URL}/repairs/assign`, dto);

export const startRepair = (id: string) =>
  apiClient.post<RepairRequestDto>(`${BASE_URL}/repairs/${id}/start`);

export const completeRepair = (dto: CompleteRepairDto) =>
  apiClient.post<RepairRequestDto>(`${BASE_URL}/repairs/complete`, dto);

export const cancelRepairRequest = (id: string, reason: string) =>
  apiClient.post<RepairRequestDto>(`${BASE_URL}/repairs/${id}/cancel`, { reason });

export const printRepairReport = (id: string) =>
  apiClient.get(`${BASE_URL}/repairs/${id}/print`, { responseType: 'blob' });

// #endregion

// #region Disposal

export const getDisposalRequests = (status?: number) =>
  apiClient.get<EquipmentDisposalDto[]>(`${BASE_URL}/disposals`, { params: { status } });

export const getDisposalRequest = (id: string) =>
  apiClient.get<EquipmentDisposalDto>(`${BASE_URL}/disposals/${id}`);

export const createDisposalRequest = (dto: CreateDisposalRequestDto) =>
  apiClient.post<EquipmentDisposalDto>(`${BASE_URL}/disposals`, dto);

export const approveDisposal = (dto: ApproveDisposalDto) =>
  apiClient.post<EquipmentDisposalDto>(`${BASE_URL}/disposals/approve`, dto);

export const completeDisposal = (dto: CompleteDisposalDto) =>
  apiClient.post<EquipmentDisposalDto>(`${BASE_URL}/disposals/complete`, dto);

export const printDisposalCertificate = (id: string) =>
  apiClient.get(`${BASE_URL}/disposals/${id}/print-certificate`, { responseType: 'blob' });

// #endregion

// #region Dashboard & Reports

export const getDashboard = (date: string, departmentId?: string) =>
  apiClient.get<EquipmentDashboardDto>(`${BASE_URL}/dashboard`, { params: { date, departmentId } });

export const getAlerts = (departmentId?: string, acknowledged?: boolean) =>
  apiClient.get<EquipmentAlertDto[]>(`${BASE_URL}/alerts`, { params: { departmentId, acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const runMaintenanceCheck = () =>
  apiClient.post(`${BASE_URL}/maintenance/run-check`);

export const getEquipmentStatistics = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get(`${BASE_URL}/statistics`, { params: { fromDate, toDate, departmentId } });

export const exportEquipmentReport = (reportType: string, departmentId?: string, format?: string) =>
  apiClient.get(`${BASE_URL}/reports/export`, { params: { reportType, departmentId, format }, responseType: 'blob' });

// #endregion

export default {
  // Inventory
  getEquipment,
  getEquipmentById,
  getEquipmentByCode,
  createEquipment,
  updateEquipment,
  updateEquipmentStatus,
  transferEquipment,
  getDepartmentEquipment,
  getEquipmentCategories,
  printEquipmentLabel,
  printEquipmentReport,
  // Maintenance
  getMaintenanceSchedules,
  getMaintenanceSchedule,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  getMaintenanceRecords,
  getMaintenanceRecord,
  createMaintenanceRecord,
  approveMaintenanceRecord,
  getDueMaintenanceList,
  printMaintenanceReport,
  // Calibration
  getCalibrationRecords,
  getCalibrationRecord,
  createCalibrationRecord,
  approveCalibrationRecord,
  getDueCalibrationList,
  printCalibrationCertificate,
  // Repairs
  getRepairRequests,
  getRepairRequest,
  getEquipmentRepairHistory,
  createRepairRequest,
  assignRepair,
  startRepair,
  completeRepair,
  cancelRepairRequest,
  printRepairReport,
  // Disposal
  getDisposalRequests,
  getDisposalRequest,
  createDisposalRequest,
  approveDisposal,
  completeDisposal,
  printDisposalCertificate,
  // Dashboard
  getDashboard,
  getAlerts,
  acknowledgeAlert,
  runMaintenanceCheck,
  getEquipmentStatistics,
  exportEquipmentReport,
};
