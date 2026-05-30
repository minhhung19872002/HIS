/**
 * Type definitions cho Pharmacy v1 — extracted khỏi pages/Pharmacy.tsx
 * (K18 Batch 1). Pure types.
 */

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

export interface BatchInfo {
  batchNumber: string;
  expiryDate: string;
  availableQuantity: number;
  warehouse: string;
  manufacturingDate: string;
  recommendedFEFO: boolean;
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

export type TransferDrugItem = {
  _key: string;
  medicationCode: string;
  medicationName: string;
  quantity: number;
  unit: string;
};

export interface ClinicalReview {
  id: string;
  prescriptionCode: string;
  patientName: string;
  patientCode: string;
  doctorName: string;
  reviewType: 'routine' | 'interaction' | 'dose' | 'allergy' | 'duplicate' | 'renal' | 'adr';
  status: 'pending' | 'approved' | 'flagged' | 'rejected';
  severity: 'high' | 'medium' | 'low';
  findings: string;
  recommendation: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AdrReport {
  id: string;
  patientName: string;
  patientCode: string;
  medicationName: string;
  reactionType: string;
  severity: 'mild' | 'moderate' | 'severe' | 'fatal';
  onsetDate: string;
  reportedBy: string;
  description: string;
  outcome: string;
  status: 'reported' | 'investigating' | 'confirmed' | 'closed';
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
