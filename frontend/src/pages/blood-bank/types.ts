/**
 * Type definitions cho BloodBank v1 — extracted khỏi pages/BloodBank.tsx
 * (K32 Batch 1).
 */

export interface BloodUnit {
  id: string;
  unitCode: string;
  bloodType: string;
  component: string;
  volume: number;
  expiryDate: string;
  receiveDate: string;
  supplier: string;
  status: number; // 0: Available, 1: Reserved, 2: Used, 3: Expired, 4: Discarded
  location: string;
  donorId?: string;
  testResults?: string;
  bagCode?: string;
  collectionDate?: string;
  source?: string;
}

export interface BloodRequest {
  id: string;
  requestCode: string;
  patientCode: string;
  patientName: string;
  bloodType: string;
  component: string;
  quantity: number;
  urgency: number; // 0: Normal, 1: Urgent, 2: Emergency
  requestDate: string;
  requestedBy: string;
  department: string;
  status: number; // 0: Pending, 1: Approved, 2: Issued, 3: Transfused, 4: Cancelled
  reason: string;
}

export type BloodStockDetailDto = {
  bloodBagId: string;
  bagCode: string;
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  volume: number;
  expiryDate: string;
  collectionDate: string;
  status: string;
  storageLocation?: string;
};

export type BloodIssueRequestDto = {
  id: string;
  requestCode: string;
  patientCode?: string;
  patientName?: string;
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  requestedQuantity: number;
  urgency: string;
  requestDate: string;
  requestedByName: string;
  departmentName: string;
  status: string;
  clinicalIndication?: string;
};
