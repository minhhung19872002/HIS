/**
 * API Client for Pharmacy Module
 */
import apiClient from '../../../services/apiClient';

// ============================================================================
// Types/Interfaces
// ============================================================================

export interface PendingPrescription {
  id: string;
  prescriptionCode: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  itemsCount: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'dispensing' | 'completed' | 'rejected';
  priority: 'urgent' | 'normal';
  createdDate: string;
  department: string;
}

export interface MedicationItem {
  id: string;
  medicationCode: string;
  medicationName: string;
  unit: string;
  quantity: number;
  dispensedQuantity: number;
  dosage: string;
  instruction: string;
  batches: BatchInfo[];
  selectedBatch?: string;
}

export interface BatchInfo {
  batchNumber: string;
  expiryDate: string;
  availableQuantity: number;
  warehouse: string;
  manufacturingDate: string;
  recommendedFEFO: boolean;
}

export interface InventoryItem {
  id: string;
  medicineId?: string;
  medicationCode: string;
  medicationName: string;
  category: string;
  unit: string;
  totalStock: number;
  minStock: number;
  maxStock: number;
  warehouseId?: string;
  warehouse: string;
  nearestExpiry: string;
  averagePrice: number;
  status: 'normal' | 'low' | 'out' | 'expiring';
}

export interface TransferRequest {
  id: string;
  transferCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  requestedBy: string;
  requestedDate: string;
  itemsCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'received';
  note?: string;
  items?: TransferLineItem[];
}

export interface TransferLineItem {
  medicineId: string;
  medicationCode: string;
  medicationName: string;
  unit: string;
  quantity: number;
  batchNumber?: string;
  note?: string;
}

export interface CreateTransferItemPayload {
  medicineId?: string;
  medicationCode?: string;
  quantity: number;
  batchNumber?: string;
  note?: string;
}

export interface CreateTransferPayload {
  fromWarehouse: string;
  toWarehouse: string;
  note?: string;
  items?: CreateTransferItemPayload[];
}

export interface AlertItem {
  id: string;
  type: 'low_stock' | 'expiry' | 'interaction' | 'out_of_stock';
  severity: 'high' | 'medium' | 'low';
  medicationName?: string;
  message: string;
  createdDate: string;
  acknowledged: boolean;
}

/** #438: một dòng lệch khi đối chiếu y lệnh nội trú vs cấp phát thực tế. */
export interface ReconciliationRow {
  medicalRecordId: string;
  medicalRecordCode?: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  medicineId: string;
  medicineCode?: string;
  medicineName?: string;
  unit?: string;
  orderedQuantity: number;
  dispensedQuantity: number;
  recordedDispensedQuantity: number;
  variance: number;
  /** NOT_DISPENSED · NO_ORDER · OVER_DISPENSED · FIELD_DRIFT · CABINET_ISSUE */
  discrepancyType: string;
  note?: string;
}

export interface ReconciliationSummary {
  medicalRecordCount: number;
  notDispensedCount: number;
  noOrderCount: number;
  overDispensedCount: number;
  fieldDriftCount: number;
  cabinetIssueCount: number;
}

export interface ReconciliationResult {
  rows: ReconciliationRow[];
  summary: ReconciliationSummary;
}

// ============================================================================
// API Functions
// ============================================================================

const BASE_URL = '/pharmacy';

// Pending Prescriptions
export const getPendingPrescriptions = () =>
  apiClient.get<PendingPrescription[]>(`${BASE_URL}/pending-prescriptions`);

export const acceptPrescription = (prescriptionId: string) =>
  apiClient.post<PendingPrescription>(`${BASE_URL}/prescriptions/${prescriptionId}/accept`);

export const rejectPrescription = (prescriptionId: string, reason?: string) =>
  apiClient.post<boolean>(`${BASE_URL}/prescriptions/${prescriptionId}/reject`, { reason });

// Medication Items
export const getMedicationItems = (prescriptionId: string) =>
  apiClient.get<MedicationItem[]>(`${BASE_URL}/prescriptions/${prescriptionId}/medications`);

export const updateDispensedQuantity = (itemId: string, quantity: number, batchNumber?: string) =>
  apiClient.put<MedicationItem>(`${BASE_URL}/medications/${itemId}/dispense`, { quantity, batchNumber });

export const completeDispensing = (prescriptionId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/prescriptions/${prescriptionId}/complete`);

// Inventory
export const getInventoryItems = (warehouseId?: string) =>
  apiClient.get<InventoryItem[]>(`${BASE_URL}/inventory`, { params: { warehouseId } });

export const getInventoryWarnings = () =>
  apiClient.get<InventoryItem[]>(`${BASE_URL}/inventory/warnings`);

export interface InventoryHistoryItem {
  id: string;
  medicationCode: string;
  medicationName: string;
  transactionType: 'import' | 'export' | 'transfer' | 'adjust';
  quantity: number;
  batchNumber?: string;
  referenceCode?: string;
  note?: string;
  createdDate: string;
  createdBy: string;
}

/** #438: báo cáo đối chiếu thuốc nội trú (read-only). Lọc theo HSBA hoặc khoa + khoảng ngày kê. */
export const getMedicationReconciliation = (params?: {
  medicalRecordId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
}) => apiClient.get<ReconciliationResult>(`${BASE_URL}/reconciliation`, { params });

export const getInventoryHistory = (medicationId: string) =>
  apiClient.get<InventoryHistoryItem[]>(`${BASE_URL}/inventory/${medicationId}/history`);

// Transfers
export const getTransferRequests = (status?: string) =>
  apiClient.get<TransferRequest[]>(`${BASE_URL}/transfers`, { params: { status } });

export const createTransfer = (transfer: CreateTransferPayload) =>
  apiClient.post<TransferRequest>(`${BASE_URL}/transfers`, transfer);

export const approveTransfer = (transferId: string) =>
  apiClient.post<TransferRequest>(`${BASE_URL}/transfers/${transferId}/approve`);

export const rejectTransfer = (transferId: string, reason?: string) =>
  apiClient.post<TransferRequest>(`${BASE_URL}/transfers/${transferId}/reject`, { reason });

export const receiveTransfer = (transferId: string) =>
  apiClient.post<TransferRequest>(`${BASE_URL}/transfers/${transferId}/receive`);

// Alerts
export const getAlerts = (acknowledged?: boolean) =>
  apiClient.get<AlertItem[]>(`${BASE_URL}/alerts`, { params: { acknowledged } });

export const acknowledgeAlert = (alertId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/alerts/${alertId}/acknowledge`);

export const resolveAlert = (alertId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/alerts/${alertId}/resolve`);

// ============================================================================
// Expiry Alerts — login-time popup (PharmacyEnhancementController)
// ============================================================================

export interface LoginExpiryAlert {
  id: string;
  medicineId: string;
  medicineName: string;
  warehouseId: string;
  warehouseName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  alertLevel: number;          // 1 = sắp hết hạn (<1 tháng), 2 = cảnh báo (1-3 tháng)
  alertLevelName: string;
}

export interface LoginExpiryResponse {
  totalAlerts: number;
  alerts: LoginExpiryAlert[];
}

/** Lấy cảnh báo hạn dùng hiện tại để hiện modal khi vào module Dược */
export const getExpiryAlertsOnLogin = () =>
  apiClient.get<LoginExpiryResponse>(`${BASE_URL}/expiry-alerts/on-login`);

/** Xác nhận (acknowledge) 1 cảnh báo hạn dùng */
export const acknowledgeExpiryAlert = (alertId: string) =>
  apiClient.put<{ success: boolean }>(`${BASE_URL}/expiry-alerts/${alertId}/acknowledge`);

// Drug Label Print
/** In nhãn thuốc (trả HTML text để mở cửa sổ in). FE mở window mới với nội dung này. */
export const printDrugLabel = (prescriptionId: string) =>
  apiClient.get<string>(`${BASE_URL}/prescriptions/${prescriptionId}/print-drug-label`, {
    responseType: 'text',
  });

// ============================================================================
// Clinical Pharmacy (Dược lâm sàng)
// ============================================================================

export const getClinicalReviews = () =>
  apiClient.get(`${BASE_URL}/clinical-reviews`);

// QA-R3: the pharmacy ADR tab used /pharmacy/adr-reports, which stores a GPP record with no patient and
// no severity (every report came back "moderate", patient blank). It now reads/writes the ADR module
// (/adr-report, AdrReports table — the same reports the "Báo cáo ADR" page shows). The page keeps its
// own shape (patientId = patient code, severity mild|moderate|severe), mapped here.
const ADR_SEVERITY_TO_NUM: Record<string, number> = { mild: 1, moderate: 2, severe: 3, critical: 4 };
const ADR_SEVERITY_FROM_NUM: Record<number, string> = { 1: 'mild', 2: 'moderate', 3: 'severe', 4: 'critical' };

export const getAdrReports = () =>
  apiClient.get('/adr-report').then((res) => ({
    ...res,
    data: Array.isArray(res.data)
      ? (res.data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          patientName: (r.patientName as string) || (r.patientCode as string) || undefined,
          patientCode: r.patientCode as string | undefined,
          medicationName: r.drugName as string | undefined,
          reaction: r.reactionDescription as string | undefined,
          severity: ADR_SEVERITY_FROM_NUM[r.severity as number] ?? undefined,
          reportDate: r.reportDate as string | undefined,
        }))
      : res.data,
  }));

export const submitAdrReport = (data: Record<string, unknown>) => {
  const reaction = (data.reaction as string | undefined)?.trim();
  const description = (data.description as string | undefined)?.trim();
  return apiClient.post('/adr-report', {
    // BE fills the patient name/age/gender from the patient code when it matches a patient.
    patientCode: ((data.patientCode ?? data.patientId) as string | undefined)?.trim() || undefined,
    patientName: (data.patientName as string | undefined) ?? '',
    drugName: data.medicationName ?? '',
    reactionDescription: reaction || description || '',
    notes: reaction && description ? description : undefined,
    severity: ADR_SEVERITY_TO_NUM[String(data.severity)] ?? 1,
    reactionStartDate: new Date().toISOString(),
  });
};

// Default export
export default {
  getPendingPrescriptions,
  acceptPrescription,
  rejectPrescription,
  getMedicationItems,
  updateDispensedQuantity,
  completeDispensing,
  getInventoryItems,
  getInventoryWarnings,
  getInventoryHistory,
  getTransferRequests,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  receiveTransfer,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getClinicalReviews,
  getAdrReports,
  submitAdrReport,
  printDrugLabel,
};
