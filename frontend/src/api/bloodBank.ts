/**
 * Blood Bank API Client
 * Module 9: Quản lý máu, chế phẩm máu - 10 chức năng
 */

import apiClient from './apiClient';

// #region Interfaces

export interface BloodBagDto {
  id: string;
  bagCode: string;
  barcode: string;
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  productTypeName: string;
  volume: number;
  unit: string;
  collectionDate: string;
  expiryDate: string;
  donorCode?: string;
  donorName?: string;
  supplierId: string;
  supplierName: string;
  status: string;
  storageLocation?: string;
  temperature?: number;
  testResults?: string;
  isTestPassed: boolean;
  note?: string;
  createdAt: string;
}

export interface BloodProductTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  shelfLifeDays: number;
  minTemperature?: number;
  maxTemperature?: number;
  standardVolume?: number;
  unit: string;
  price: number;
  insurancePrice: number;
  isActive: boolean;
}

export interface BloodImportReceiptDto {
  id: string;
  receiptCode: string;
  receiptDate: string;
  supplierId: string;
  supplierName: string;
  supplierAddress?: string;
  deliveryPerson?: string;
  receiverName?: string;
  status: string;
  totalBags: number;
  totalAmount: number;
  note?: string;
  items: BloodImportItemDto[];
  createdAt: string;
  createdBy?: string;
}

export interface BloodImportItemDto {
  id: string;
  bagCode: string;
  barcode: string;
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  productTypeName: string;
  volume: number;
  unit: string;
  collectionDate: string;
  expiryDate: string;
  donorCode?: string;
  price: number;
  amount: number;
  testResults?: string;
}

export interface CreateBloodImportDto {
  receiptDate: string;
  supplierId: string;
  deliveryPerson?: string;
  note?: string;
  items: CreateBloodImportItemDto[];
}

export interface CreateBloodImportItemDto {
  bagCode: string;
  barcode: string;
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  volume: number;
  collectionDate: string;
  expiryDate: string;
  donorCode?: string;
  price: number;
  testResults?: string;
}

export interface BloodIssueRequestDto {
  id: string;
  requestCode: string;
  requestDate: string;
  departmentId: string;
  departmentName: string;
  requestedById: string;
  requestedByName: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  productTypeName: string;
  requestedQuantity: number;
  issuedQuantity: number;
  urgency: string;
  status: string;
  clinicalIndication?: string;
  note?: string;
  createdAt: string;
}

export interface CreateBloodIssueRequestDto {
  departmentId: string;
  patientId?: string;
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  requestedQuantity: number;
  urgency: string;
  clinicalIndication?: string;
  note?: string;
}

export interface BloodIssueReceiptDto {
  id: string;
  receiptCode: string;
  issueDate: string;
  departmentId: string;
  departmentName: string;
  requestedBy?: string;
  issuedBy?: string;
  status: string;
  totalBags: number;
  note?: string;
  items: BloodIssueItemDto[];
  createdAt: string;
}

export interface BloodIssueItemDto {
  id: string;
  bloodBagId: string;
  bagCode: string;
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  volume: number;
  expiryDate: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
}

export interface IssueBloodDto {
  requestId: string;
  bloodBagIds: string[];
  note?: string;
}

export interface BloodStockDto {
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  productTypeName: string;
  totalBags: number;
  availableBags: number;
  reservedBags: number;
  expiringWithin7Days: number;
  expiredBags: number;
  totalVolume: number;
}

export interface BloodStockDetailDto {
  bloodBagId: string;
  bagCode: string;
  barcode: string;
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  volume: number;
  collectionDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  storageLocation?: string;
  status: string;
}

export interface BloodInventoryDto {
  id: string;
  inventoryCode: string;
  inventoryDate: string;
  status: string;
  conductedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  totalBagsSystem: number;
  totalBagsActual: number;
  variance: number;
  note?: string;
  items: BloodInventoryItemDto[];
}

export interface BloodInventoryItemDto {
  id: string;
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  systemQuantity: number;
  actualQuantity: number;
  variance: number;
  note?: string;
}

export interface CreateBloodInventoryDto {
  inventoryDate: string;
  note?: string;
  items: CreateBloodInventoryItemDto[];
}

export interface CreateBloodInventoryItemDto {
  bloodType: string;
  rhFactor: string;
  productTypeId: string;
  actualQuantity: number;
  note?: string;
}

export interface BloodOrderDto {
  id: string;
  orderCode: string;
  orderDate: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientBloodType?: string;
  patientRhFactor?: string;
  visitId: string;
  departmentId: string;
  departmentName: string;
  orderDoctorName?: string;
  diagnosis?: string;
  clinicalIndication?: string;
  status: string;
  items: BloodOrderItemDto[];
  createdAt: string;
}

export interface BloodOrderItemDto {
  id: string;
  productTypeId: string;
  productTypeName: string;
  bloodType: string;
  rhFactor: string;
  orderedQuantity: number;
  issuedQuantity: number;
  transfusedQuantity: number;
  status: string;
  note?: string;
  assignedBags: BloodBagAssignmentDto[];
}

export interface BloodBagAssignmentDto {
  bloodBagId: string;
  bagCode: string;
  bloodType: string;
  rhFactor: string;
  volume: number;
  expiryDate: string;
  crossMatchResult?: string;
  crossMatchDate?: string;
  transfusionStatus: string;
  transfusionStartTime?: string;
  transfusionEndTime?: string;
  transfusionNote?: string;
}

export interface CreateBloodOrderDto {
  patientId: string;
  visitId: string;
  diagnosis?: string;
  clinicalIndication?: string;
  items: CreateBloodOrderItemDto[];
}

export interface CreateBloodOrderItemDto {
  productTypeId: string;
  quantity: number;
  note?: string;
}

export interface BloodStockCardDto {
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalImport: number;
  totalExport: number;
  closingBalance: number;
  transactions: BloodStockCardTransactionDto[];
}

export interface BloodStockCardTransactionDto {
  transactionDate: string;
  transactionType: string;
  documentCode: string;
  description?: string;
  quantity: number;
  balance: number;
}

export interface BloodInventoryReportDto {
  fromDate: string;
  toDate: string;
  items: BloodInventoryReportItemDto[];
}

export interface BloodInventoryReportItemDto {
  bloodType: string;
  rhFactor: string;
  productTypeName: string;
  openingStock: number;
  importQuantity: number;
  exportQuantity: number;
  expiredQuantity: number;
  destroyedQuantity: number;
  closingStock: number;
}

export interface BloodIssueSummaryDto {
  fromDate: string;
  toDate: string;
  departmentId?: string;
  departmentName?: string;
  totalBags: number;
  totalVolume: number;
  byProductType: BloodIssueSummaryByTypeDto[];
  byDepartment: BloodIssueSummaryByDeptDto[];
}

export interface BloodIssueSummaryByTypeDto {
  productTypeName: string;
  quantity: number;
  volume: number;
}

export interface BloodIssueSummaryByDeptDto {
  departmentName: string;
  quantity: number;
  volume: number;
}

export interface BloodIssueByPatientDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  age: number;
  gender?: string;
  bloodType?: string;
  rhFactor?: string;
  diagnosis?: string;
  departmentName?: string;
  items: BloodIssueByPatientItemDto[];
}

export interface BloodIssueByPatientItemDto {
  issueDate: string;
  bagCode: string;
  productTypeName: string;
  volume: number;
  transfusionStatus?: string;
  transfusionDate?: string;
}

export interface ScanBloodBagDto {
  barcodeOrQRCode: string;
}

export interface ScanBloodBagResultDto {
  found: boolean;
  bloodBag?: BloodBagDto;
  message?: string;
  warnings: string[];
}

export interface PrintBloodBagBarcodeDto {
  bloodBagIds: string[];
  labelFormat?: string;
}

export interface BloodSupplierDto {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  license?: string;
  licenseExpiryDate?: string;
  isActive: boolean;
}

// #endregion

// #region 1-2. Import Receipt APIs

export const getImportReceipts = (
  fromDate: string,
  toDate: string,
  supplierId?: string,
  status?: string
) =>
  apiClient.get<BloodImportReceiptDto[]>('/BloodBankComplete/import-receipts', {
    params: { fromDate, toDate, supplierId, status }
  });

export const getImportReceipt = (receiptId: string) =>
  apiClient.get<BloodImportReceiptDto>(`/BloodBankComplete/import-receipts/${receiptId}`);

export const createImportReceipt = (data: CreateBloodImportDto) =>
  apiClient.post<BloodImportReceiptDto>('/BloodBankComplete/import-receipts', data);

export const updateImportReceipt = (receiptId: string, data: CreateBloodImportDto) =>
  apiClient.put<BloodImportReceiptDto>(`/BloodBankComplete/import-receipts/${receiptId}`, data);

export const confirmImportReceipt = (receiptId: string) =>
  apiClient.post(`/BloodBankComplete/import-receipts/${receiptId}/confirm`);

export const cancelImportReceipt = (receiptId: string, reason: string) =>
  apiClient.post(`/BloodBankComplete/import-receipts/${receiptId}/cancel`, { reason });

export const printImportReceipt = (receiptId: string) =>
  apiClient.get(`/BloodBankComplete/import-receipts/${receiptId}/print`, {
    responseType: 'blob'
  });

// #endregion

// #region 3. Issue Request APIs

export const getIssueRequests = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  status?: string
) =>
  apiClient.get<BloodIssueRequestDto[]>('/BloodBankComplete/issue-requests', {
    params: { fromDate, toDate, departmentId, status }
  });

export const getIssueRequest = (requestId: string) =>
  apiClient.get<BloodIssueRequestDto>(`/BloodBankComplete/issue-requests/${requestId}`);

export const createIssueRequest = (data: CreateBloodIssueRequestDto) =>
  apiClient.post<BloodIssueRequestDto>('/BloodBankComplete/issue-requests', data);

export const approveIssueRequest = (requestId: string) =>
  apiClient.post(`/BloodBankComplete/issue-requests/${requestId}/approve`);

export const rejectIssueRequest = (requestId: string, reason: string) =>
  apiClient.post(`/BloodBankComplete/issue-requests/${requestId}/reject`, { reason });

export const issueBlood = (data: IssueBloodDto) =>
  apiClient.post<BloodIssueReceiptDto>('/BloodBankComplete/issue', data);

export const getIssueReceipts = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<BloodIssueReceiptDto[]>('/BloodBankComplete/issue-receipts', {
    params: { fromDate, toDate, departmentId }
  });

export const printIssueReceipt = (receiptId: string) =>
  apiClient.get(`/BloodBankComplete/issue-receipts/${receiptId}/print`, {
    responseType: 'blob'
  });

// #endregion

// #region 4. Stock APIs

export const getBloodStock = (bloodType?: string, rhFactor?: string, productTypeId?: string) =>
  apiClient.get<BloodStockDto[]>('/BloodBankComplete/stock', {
    params: { bloodType, rhFactor, productTypeId }
  });

export const getBloodStockDetail = (
  bloodType?: string,
  rhFactor?: string,
  productTypeId?: string,
  status?: string
) =>
  apiClient.get<BloodStockDetailDto[]>('/BloodBankComplete/stock/detail', {
    params: { bloodType, rhFactor, productTypeId, status }
  });

export const getBloodBag = (bloodBagId: string) =>
  apiClient.get<BloodBagDto>(`/BloodBankComplete/blood-bags/${bloodBagId}`);

export const updateBloodBagStatus = (bloodBagId: string, status: string, reason?: string) =>
  apiClient.put(`/BloodBankComplete/blood-bags/${bloodBagId}/status`, { status, reason });

export const getExpiringBloodBags = (daysUntilExpiry: number = 7) =>
  apiClient.get<BloodStockDetailDto[]>('/BloodBankComplete/stock/expiring', {
    params: { daysUntilExpiry }
  });

export const getExpiredBloodBags = () =>
  apiClient.get<BloodStockDetailDto[]>('/BloodBankComplete/stock/expired');

export const destroyExpiredBloodBags = (bloodBagIds: string[], reason: string) =>
  apiClient.post('/BloodBankComplete/blood-bags/destroy', { bloodBagIds, reason });

// #endregion

// #region 5. Inventory APIs

export const getInventories = (fromDate: string, toDate: string, status?: string) =>
  apiClient.get<BloodInventoryDto[]>('/BloodBankComplete/inventories', {
    params: { fromDate, toDate, status }
  });

export const getInventory = (inventoryId: string) =>
  apiClient.get<BloodInventoryDto>(`/BloodBankComplete/inventories/${inventoryId}`);

export const createInventory = (data: CreateBloodInventoryDto) =>
  apiClient.post<BloodInventoryDto>('/BloodBankComplete/inventories', data);

export const updateInventory = (inventoryId: string, data: CreateBloodInventoryDto) =>
  apiClient.put<BloodInventoryDto>(`/BloodBankComplete/inventories/${inventoryId}`, data);

export const completeInventory = (inventoryId: string) =>
  apiClient.post(`/BloodBankComplete/inventories/${inventoryId}/complete`);

export const approveInventory = (inventoryId: string) =>
  apiClient.post(`/BloodBankComplete/inventories/${inventoryId}/approve`);

// #endregion

// #region 6. Reports APIs

export const getStockCard = (
  bloodType: string,
  rhFactor: string,
  productTypeId: string,
  fromDate: string,
  toDate: string
) =>
  apiClient.get<BloodStockCardDto>('/BloodBankComplete/reports/stock-card', {
    params: { bloodType, rhFactor, productTypeId, fromDate, toDate }
  });

export const getInventoryReport = (fromDate: string, toDate: string) =>
  apiClient.get<BloodInventoryReportDto>('/BloodBankComplete/reports/inventory', {
    params: { fromDate, toDate }
  });

export const printImportReport = (fromDate: string, toDate: string, supplierId?: string) =>
  apiClient.get('/BloodBankComplete/reports/import/print', {
    params: { fromDate, toDate, supplierId },
    responseType: 'blob'
  });

export const printExportReport = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get('/BloodBankComplete/reports/export/print', {
    params: { fromDate, toDate, departmentId },
    responseType: 'blob'
  });

export const printInventoryReport = (inventoryId: string) =>
  apiClient.get(`/BloodBankComplete/inventories/${inventoryId}/print`, {
    responseType: 'blob'
  });

export const printStockReport = (fromDate: string, toDate: string) =>
  apiClient.get('/BloodBankComplete/reports/stock/print', {
    params: { fromDate, toDate },
    responseType: 'blob'
  });

// #endregion

// #region 7. Blood Order APIs

export const getBloodOrders = (
  fromDate: string,
  toDate: string,
  departmentId?: string,
  patientId?: string,
  status?: string
) =>
  apiClient.get<BloodOrderDto[]>('/BloodBankComplete/orders', {
    params: { fromDate, toDate, departmentId, patientId, status }
  });

export const getBloodOrder = (orderId: string) =>
  apiClient.get<BloodOrderDto>(`/BloodBankComplete/orders/${orderId}`);

export const createBloodOrder = (data: CreateBloodOrderDto) =>
  apiClient.post<BloodOrderDto>('/BloodBankComplete/orders', data);

export const cancelBloodOrder = (orderId: string, reason: string) =>
  apiClient.post(`/BloodBankComplete/orders/${orderId}/cancel`, { reason });

export const assignBloodBag = (orderItemId: string, bloodBagId: string) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/assign`, { bloodBagId });

export const unassignBloodBag = (orderItemId: string, bloodBagId: string, reason: string) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/unassign`, { bloodBagId, reason });

export const recordCrossMatchResult = (
  orderItemId: string,
  bloodBagId: string,
  result: string,
  note?: string
) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/cross-match`, {
    bloodBagId,
    result,
    note
  });

export const startTransfusion = (orderItemId: string, bloodBagId: string) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/start-transfusion`, { bloodBagId });

export const completeTransfusion = (orderItemId: string, bloodBagId: string, note?: string) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/complete-transfusion`, {
    bloodBagId,
    note
  });

export const recordTransfusionReaction = (
  orderItemId: string,
  bloodBagId: string,
  reaction: string,
  action: string
) =>
  apiClient.post(`/BloodBankComplete/orders/items/${orderItemId}/reaction`, {
    bloodBagId,
    reaction,
    action
  });

// #endregion

// #region 8-9. Issue Summary APIs

export const printBloodIssueSummary = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get('/BloodBankComplete/reports/issue-summary/print', {
    params: { fromDate, toDate, departmentId },
    responseType: 'blob'
  });

export const getBloodIssueSummary = (fromDate: string, toDate: string, departmentId?: string) =>
  apiClient.get<BloodIssueSummaryDto>('/BloodBankComplete/reports/issue-summary', {
    params: { fromDate, toDate, departmentId }
  });

export const printBloodIssueByPatient = (patientId: string, fromDate: string, toDate: string) =>
  apiClient.get(`/BloodBankComplete/patients/${patientId}/blood-issue/print`, {
    params: { fromDate, toDate },
    responseType: 'blob'
  });

export const getBloodIssueByPatient = (patientId: string, fromDate: string, toDate: string) =>
  apiClient.get<BloodIssueByPatientDto>(`/BloodBankComplete/patients/${patientId}/blood-issue`, {
    params: { fromDate, toDate }
  });

// #endregion

// #region 10. Barcode/QRCode APIs

export const scanBloodBag = (data: ScanBloodBagDto) =>
  apiClient.post<ScanBloodBagResultDto>('/BloodBankComplete/blood-bags/scan', data);

export const printBloodBagBarcodes = (data: PrintBloodBagBarcodeDto) =>
  apiClient.post('/BloodBankComplete/blood-bags/print-barcodes', data, {
    responseType: 'blob'
  });

export const getBloodBagByBarcode = (barcode: string) =>
  apiClient.get<BloodBagDto>(`/BloodBankComplete/blood-bags/by-barcode/${barcode}`);

// #endregion

// #region Catalog APIs

export const getProductTypes = () =>
  apiClient.get<BloodProductTypeDto[]>('/BloodBankComplete/product-types');

export const saveProductType = (data: BloodProductTypeDto) =>
  apiClient.post<BloodProductTypeDto>('/BloodBankComplete/product-types', data);

export const getSuppliers = (keyword?: string) =>
  apiClient.get<BloodSupplierDto[]>('/BloodBankComplete/suppliers', {
    params: { keyword }
  });

export const saveSupplier = (data: BloodSupplierDto) =>
  apiClient.post<BloodSupplierDto>('/BloodBankComplete/suppliers', data);

// #endregion

export default {
  // Import
  getImportReceipts,
  getImportReceipt,
  createImportReceipt,
  updateImportReceipt,
  confirmImportReceipt,
  cancelImportReceipt,
  printImportReceipt,

  // Issue Request
  getIssueRequests,
  getIssueRequest,
  createIssueRequest,
  approveIssueRequest,
  rejectIssueRequest,
  issueBlood,
  getIssueReceipts,
  printIssueReceipt,

  // Stock
  getBloodStock,
  getBloodStockDetail,
  getBloodBag,
  updateBloodBagStatus,
  getExpiringBloodBags,
  getExpiredBloodBags,
  destroyExpiredBloodBags,

  // Inventory
  getInventories,
  getInventory,
  createInventory,
  updateInventory,
  completeInventory,
  approveInventory,

  // Reports
  getStockCard,
  getInventoryReport,
  printImportReport,
  printExportReport,
  printInventoryReport,
  printStockReport,

  // Blood Order
  getBloodOrders,
  getBloodOrder,
  createBloodOrder,
  cancelBloodOrder,
  assignBloodBag,
  unassignBloodBag,
  recordCrossMatchResult,
  startTransfusion,
  completeTransfusion,
  recordTransfusionReaction,

  // Issue Summary
  printBloodIssueSummary,
  getBloodIssueSummary,
  printBloodIssueByPatient,
  getBloodIssueByPatient,

  // Barcode/QRCode
  scanBloodBag,
  printBloodBagBarcodes,
  getBloodBagByBarcode,

  // Catalog
  getProductTypes,
  saveProductType,
  getSuppliers,
  saveSupplier
};
