/**
 * API Client for Pharmacy Module
 */
import apiClient from './client';

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
  medicationCode: string;
  medicationName: string;
  category: string;
  unit: string;
  totalStock: number;
  minStock: number;
  maxStock: number;
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

// ============================================================================
// API Functions
// ============================================================================

const BASE_URL = '/api/pharmacy';

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

// Transfers
export const getTransferRequests = (status?: string) =>
  apiClient.get<TransferRequest[]>(`${BASE_URL}/transfers`, { params: { status } });

export const createTransfer = (transfer: Partial<TransferRequest>) =>
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
  getTransferRequests,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  receiveTransfer,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
};
