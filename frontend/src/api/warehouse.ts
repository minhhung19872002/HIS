/**
 * API Client cho Phân hệ 5: Kho Dược - Vật tư
 */
import apiClient from './client';

// ============================================================================
// Types/Interfaces
// ============================================================================

// #region Stock Receipt (Nhập kho)

export interface StockReceiptDto {
  id: string;
  receiptCode: string;
  receiptDate: string;
  warehouseId: string;
  warehouseName: string;
  receiptType: number;
  receiptTypeName: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  contractNumber?: string;
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  sourceReceiptId?: string;
  departmentId?: string;
  departmentName?: string;
  items: StockReceiptItemDto[];
  totalAmount: number;
  vatAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: number;
  statusName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
}

export interface StockReceiptItemDto {
  id: string;
  stockReceiptId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: number;
  unit: string;
  batchNumber?: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate: number;
  amount: number;
  countryOfOrigin?: string;
  manufacturer?: string;
  registrationNumber?: string;
  notes?: string;
}

export interface CreateStockReceiptDto {
  receiptDate: string;
  warehouseId: string;
  receiptType: number;
  supplierId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  contractNumber?: string;
  sourceWarehouseId?: string;
  sourceReceiptId?: string;
  departmentId?: string;
  items: CreateStockReceiptItemDto[];
  notes?: string;
}

export interface CreateStockReceiptItemDto {
  itemId: string;
  batchNumber?: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate: number;
  countryOfOrigin?: string;
  manufacturer?: string;
  registrationNumber?: string;
  notes?: string;
}

export interface SupplierPayableDto {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  totalReceiptAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoices: PayableInvoiceDto[];
}

export interface PayableInvoiceDto {
  receiptId: string;
  receiptCode: string;
  invoiceNumber?: string;
  receiptDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  daysOverdue: number;
}

export interface SupplierPaymentDto {
  id: string;
  supplierId: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receiptIds: string[];
  createdBy: string;
  createdByName: string;
  notes?: string;
}

// #endregion

// #region Stock Issue (Xuất kho)

export interface StockIssueDto {
  id: string;
  issueCode: string;
  issueDate: string;
  warehouseId: string;
  warehouseName: string;
  issueType: number;
  issueTypeName: string;
  departmentId?: string;
  departmentName?: string;
  targetWarehouseId?: string;
  targetWarehouseName?: string;
  supplierId?: string;
  supplierName?: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  prescriptionId?: string;
  items: StockIssueItemDto[];
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  status: number;
  statusName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
}

export interface StockIssueItemDto {
  id: string;
  stockIssueId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: number;
  unit: string;
  stockId: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentSource: number;
  insuranceRatio: number;
  notes?: string;
}

export interface CreateStockIssueDto {
  issueDate: string;
  warehouseId: string;
  issueType: number;
  departmentId?: string;
  targetWarehouseId?: string;
  supplierId?: string;
  patientId?: string;
  prescriptionId?: string;
  items: CreateStockIssueItemDto[];
  notes?: string;
}

export interface CreateStockIssueItemDto {
  itemId: string;
  stockId?: string;
  quantity: number;
  paymentSource: number;
  notes?: string;
}

export interface DispenseOutpatientDto {
  prescriptionId: string;
  prescriptionCode: string;
  prescriptionDate: string;
  patientCode: string;
  patientName: string;
  isInsurance: boolean;
  doctorName?: string;
  diagnosis?: string;
  items: DispenseItemDto[];
  totalAmount: number;
  insuranceAmount: number;
  patientPayAmount: number;
  status: number;
  statusName: string;
}

export interface DispenseItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  prescribedQuantity: number;
  dispensedQuantity: number;
  dosage?: string;
  usageInstructions?: string;
  stockId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitPrice: number;
  amount: number;
  insuranceRatio: number;
}

export interface PharmacySaleDto {
  id: string;
  saleCode: string;
  saleDate: string;
  warehouseId: string;
  warehouseName: string;
  saleType: number;
  saleTypeName: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  customerName?: string;
  customerPhone?: string;
  prescriptionId?: string;
  items: PharmacySaleItemDto[];
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod?: string;
  soldBy: string;
  soldByName: string;
}

export interface PharmacySaleItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  amount: number;
  batchNumber?: string;
  expiryDate?: string;
}

// #endregion

// #region Stock Management (Tồn kho)

export interface StockDto {
  id: string;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: number;
  itemTypeName: string;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  daysToExpiry?: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitPrice: number;
  totalValue: number;
  location?: string;
  isBelowMinimum: boolean;
  isAboveMaximum: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface StockSearchDto {
  warehouseId?: string;
  itemType?: number;
  keyword?: string;
  isExpiringSoon?: boolean;
  isBelowMinimum?: boolean;
  page?: number;
  pageSize?: number;
}

export interface StockMovementReportDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  openingQuantity: number;
  openingValue: number;
  totalReceived: number;
  totalReceivedValue: number;
  totalIssued: number;
  totalIssuedValue: number;
  closingQuantity: number;
  closingValue: number;
}

export interface ProcurementRequestDto {
  id: string;
  requestCode: string;
  requestDate: string;
  warehouseId: string;
  warehouseName: string;
  description?: string;
  items: ProcurementItemDto[];
  status: number;
  statusName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface ProcurementItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  averageConsumption: number;
  requestedQuantity: number;
  approvedQuantity: number;
  notes?: string;
}

export interface CreateProcurementRequestDto {
  warehouseId: string;
  description?: string;
  items: CreateProcurementItemDto[];
}

export interface CreateProcurementItemDto {
  itemId: string;
  requestedQuantity: number;
  notes?: string;
}

export interface AutoProcurementSuggestionDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  averageMonthlyUsage: number;
  sameMonthLastYearUsage: number;
  suggestedQuantity: number;
  suggestionReason?: string;
}

export interface StockTakeDto {
  id: string;
  stockTakeCode: string;
  stockTakeDate: string;
  warehouseId: string;
  warehouseName: string;
  periodFrom: string;
  periodTo: string;
  items: StockTakeItemDto[];
  status: number;
  statusName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
}

export interface StockTakeItemDto {
  id: string;
  stockTakeId: string;
  stockId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  bookQuantity: number;
  actualQuantity: number;
  differenceQuantity: number;
  unitPrice: number;
  differenceValue: number;
  notes?: string;
}

export interface BatchInfoDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  daysToExpiry: number;
  countryOfOrigin?: string;
  manufacturer?: string;
  registrationNumber?: string;
  supplierId?: string;
  supplierName?: string;
  receivedQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;
}

export interface ExpiryWarningDto {
  stockId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  batchNumber?: string;
  expiryDate: string;
  daysToExpiry: number;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  warehouseName: string;
  warningLevel: number;
  warningLevelName: string;
}

export interface UnclaimedPrescriptionDto {
  prescriptionId: string;
  prescriptionCode: string;
  prescriptionDate: string;
  patientCode: string;
  patientName: string;
  phoneNumber?: string;
  doctorName?: string;
  totalAmount: number;
  daysSincePrescription: number;
  status: number;
}

export interface StockCardDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  fromDate: string;
  toDate: string;
  openingQuantity: number;
  closingQuantity: number;
  entries: StockCardEntryDto[];
}

export interface StockCardEntryDto {
  transactionDate: string;
  documentCode: string;
  transactionType: string;
  description?: string;
  receivedQuantity: number;
  issuedQuantity: number;
  balance: number;
}

// #endregion

// #region Warehouse Management

export interface WarehouseDto {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: number;
  warehouseTypeName: string;
  parentWarehouseId?: string;
  parentWarehouseName?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  address?: string;
  managerName?: string;
}

export interface ReusableSupplyDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  maxReuseCount: number;
  currentReuseCount: number;
  remainingUses: number;
  lastSterilizationDate?: string;
  nextSterilizationDue?: string;
  status: number;
  statusName: string;
}

export interface ConsignmentStockDto {
  id: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  consignmentDate: string;
  expirationDate?: string;
}

export interface IUMedicineDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  baseUnit: string;
  iuPerBaseUnit: number;
  currentStockInBaseUnit: number;
  currentStockInIU: number;
}

export interface SplitIssueDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  packageUnit: string;
  splitUnit: string;
  quantityPerPackage: number;
  packagePricePerUnit: number;
  currentPackageStock: number;
  currentSplitStock: number;
}

export interface ProfitMarginConfigDto {
  id: string;
  warehouseId: string;
  itemGroupId?: string;
  itemGroupName?: string;
  itemId?: string;
  itemName?: string;
  profitMarginPercent: number;
  minPrice?: number;
  maxPrice?: number;
  isActive: boolean;
}

export interface DepartmentUsageReportDto {
  fromDate: string;
  toDate: string;
  departments: DepartmentUsageItemDto[];
  totalAmount: number;
}

export interface DepartmentUsageItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  issueCount: number;
  totalQuantity: number;
  totalAmount: number;
  topItems: ItemUsageDto[];
}

export interface ItemUsageDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  amount: number;
}

// #endregion

// #region Search DTOs

export interface StockReceiptSearchDto {
  fromDate?: string;
  toDate?: string;
  warehouseId?: string;
  receiptType?: number;
  supplierId?: string;
  status?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface StockIssueSearchDto {
  fromDate?: string;
  toDate?: string;
  warehouseId?: string;
  issueType?: number;
  departmentId?: string;
  status?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ============================================================================
// API Functions
// ============================================================================

const BASE_URL = '/api/warehouse';

// #region 5.1 Nhập kho

export const createSupplierReceipt = (dto: CreateStockReceiptDto) =>
  apiClient.post<StockReceiptDto>(`${BASE_URL}/receipts/supplier`, dto);

export const createOtherSourceReceipt = (dto: CreateStockReceiptDto) =>
  apiClient.post<StockReceiptDto>(`${BASE_URL}/receipts/other-source`, dto);

export const createTransferReceipt = (dto: CreateStockReceiptDto) =>
  apiClient.post<StockReceiptDto>(`${BASE_URL}/receipts/transfer`, dto);

export const createDepartmentReturnReceipt = (dto: CreateStockReceiptDto) =>
  apiClient.post<StockReceiptDto>(`${BASE_URL}/receipts/department-return`, dto);

export const updateStockReceipt = (id: string, dto: CreateStockReceiptDto) =>
  apiClient.put<StockReceiptDto>(`${BASE_URL}/receipts/${id}`, dto);

export const approveStockReceipt = (id: string) =>
  apiClient.post<StockReceiptDto>(`${BASE_URL}/receipts/${id}/approve`);

export const cancelStockReceipt = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/receipts/${id}/cancel`, reason);

export const getStockReceipts = (search: StockReceiptSearchDto) =>
  apiClient.get<PagedResult<StockReceiptDto>>(`${BASE_URL}/receipts`, { params: search });

export const getStockReceiptById = (id: string) =>
  apiClient.get<StockReceiptDto>(`${BASE_URL}/receipts/${id}`);

export const getSupplierPayables = (supplierId?: string) =>
  apiClient.get<SupplierPayableDto[]>(`${BASE_URL}/supplier-payables`, { params: { supplierId } });

export const createSupplierPayment = (dto: SupplierPaymentDto) =>
  apiClient.post<SupplierPaymentDto>(`${BASE_URL}/supplier-payments`, dto);

export const printStockReceipt = (id: string) =>
  apiClient.get(`${BASE_URL}/receipts/${id}/print`, { responseType: 'blob' });

export const printInspectionReport = (id: string) =>
  apiClient.get(`${BASE_URL}/receipts/${id}/print-inspection`, { responseType: 'blob' });

// #endregion

// #region 5.2 Xuất kho

export const autoSelectBatches = (warehouseId: string, itemId: string, quantity: number) =>
  apiClient.get<StockDto[]>(`${BASE_URL}/auto-select-batches`, { params: { warehouseId, itemId, quantity } });

export const dispenseOutpatientPrescription = (prescriptionId: string) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/dispense-outpatient/${prescriptionId}`);

export const dispenseInpatientOrder = (orderSummaryId: string) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/dispense-inpatient/${orderSummaryId}`);

export const issueToDepartment = (dto: CreateStockIssueDto) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/department`, dto);

export const createTransferIssue = (dto: CreateStockIssueDto) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/transfer`, dto);

export const createSupplierReturn = (dto: CreateStockIssueDto) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/supplier-return`, dto);

export const createDestructionIssue = (dto: CreateStockIssueDto) =>
  apiClient.post<StockIssueDto>(`${BASE_URL}/issues/destruction`, dto);

export const createPharmacySaleByPrescription = (prescriptionId: string) =>
  apiClient.post<PharmacySaleDto>(`${BASE_URL}/pharmacy-sales/by-prescription/${prescriptionId}`);

export const createRetailSale = (dto: PharmacySaleDto) =>
  apiClient.post<PharmacySaleDto>(`${BASE_URL}/pharmacy-sales/retail`, dto);

export const getStockIssues = (search: StockIssueSearchDto) =>
  apiClient.get<PagedResult<StockIssueDto>>(`${BASE_URL}/issues`, { params: search });

export const getStockIssueById = (id: string) =>
  apiClient.get<StockIssueDto>(`${BASE_URL}/issues/${id}`);

export const getPendingOutpatientPrescriptions = (warehouseId: string, date: string) =>
  apiClient.get<DispenseOutpatientDto[]>(`${BASE_URL}/pending-prescriptions`, { params: { warehouseId, date } });

export const printSaleInvoice = (saleId: string) =>
  apiClient.get(`${BASE_URL}/pharmacy-sales/${saleId}/print`, { responseType: 'blob' });

export const printStockIssue = (id: string) =>
  apiClient.get(`${BASE_URL}/issues/${id}/print`, { responseType: 'blob' });

export const printNarcoticIssue = (id: string) =>
  apiClient.get(`${BASE_URL}/issues/${id}/print-narcotic`, { responseType: 'blob' });

// #endregion

// #region 5.3 Tồn kho

export const createProcurementRequest = (dto: CreateProcurementRequestDto) =>
  apiClient.post<ProcurementRequestDto>(`${BASE_URL}/procurement-requests`, dto);

export const getAutoProcurementSuggestions = (warehouseId: string) =>
  apiClient.get<AutoProcurementSuggestionDto[]>(`${BASE_URL}/procurement-suggestions/${warehouseId}`);

export const approveProcurementRequest = (id: string) =>
  apiClient.post<ProcurementRequestDto>(`${BASE_URL}/procurement-requests/${id}/approve`);

export const getProcurementRequests = (warehouseId?: string, status?: number, fromDate?: string, toDate?: string) =>
  apiClient.get<ProcurementRequestDto[]>(`${BASE_URL}/procurement-requests`, { params: { warehouseId, status, fromDate, toDate } });

export const getStock = (search: StockSearchDto) =>
  apiClient.get<PagedResult<StockDto>>(`${BASE_URL}/stock`, { params: search });

export const getStockWarnings = (warehouseId: string) =>
  apiClient.get<StockDto[]>(`${BASE_URL}/stock-warnings/${warehouseId}`);

export const getExpiryWarnings = (warehouseId?: string, monthsAhead: number = 6) =>
  apiClient.get<ExpiryWarningDto[]>(`${BASE_URL}/expiry-warnings`, { params: { warehouseId, monthsAhead } });

export const getBatchInfo = (warehouseId?: string, itemId?: string) =>
  apiClient.get<BatchInfoDto[]>(`${BASE_URL}/batches`, { params: { warehouseId, itemId } });

export const getUnclaimedPrescriptions = (warehouseId: string, daysOld: number = 3) =>
  apiClient.get<UnclaimedPrescriptionDto[]>(`${BASE_URL}/unclaimed-prescriptions/${warehouseId}`, { params: { daysOld } });

export const cancelUnclaimedPrescription = (prescriptionId: string) =>
  apiClient.post<boolean>(`${BASE_URL}/unclaimed-prescriptions/${prescriptionId}/cancel`);

export const createStockTake = (warehouseId: string, periodFrom: string, periodTo: string) =>
  apiClient.post<StockTakeDto>(`${BASE_URL}/stock-takes`, { warehouseId, periodFrom, periodTo });

export const updateStockTakeResults = (id: string, items: StockTakeItemDto[]) =>
  apiClient.put<StockTakeDto>(`${BASE_URL}/stock-takes/${id}/results`, items);

export const completeStockTake = (id: string) =>
  apiClient.post<StockTakeDto>(`${BASE_URL}/stock-takes/${id}/complete`);

export const adjustStockAfterTake = (id: string) =>
  apiClient.post<boolean>(`${BASE_URL}/stock-takes/${id}/adjust`);

export const printStockTakeReport = (id: string) =>
  apiClient.get(`${BASE_URL}/stock-takes/${id}/print`, { responseType: 'blob' });

export const getStockCard = (warehouseId: string, itemId: string, fromDate: string, toDate: string) =>
  apiClient.get<StockCardDto>(`${BASE_URL}/stock-card`, { params: { warehouseId, itemId, fromDate, toDate } });

export const printStockCard = (warehouseId: string, itemId: string, fromDate: string, toDate: string) =>
  apiClient.get(`${BASE_URL}/stock-card/print`, { params: { warehouseId, itemId, fromDate, toDate }, responseType: 'blob' });

export const getStockMovementReport = (warehouseId: string, fromDate: string, toDate: string, itemType?: number) =>
  apiClient.get<StockMovementReportDto[]>(`${BASE_URL}/reports/stock-movement`, { params: { warehouseId, fromDate, toDate, itemType } });

export const printStockMovementReport = (warehouseId: string, fromDate: string, toDate: string, itemType?: number) =>
  apiClient.get(`${BASE_URL}/reports/stock-movement/print`, { params: { warehouseId, fromDate, toDate, itemType }, responseType: 'blob' });

export const getDepartmentUsageReport = (warehouseId: string, fromDate: string, toDate: string) =>
  apiClient.get<DepartmentUsageReportDto>(`${BASE_URL}/reports/department-usage`, { params: { warehouseId, fromDate, toDate } });

// #endregion

// #region 5.4 Quản lý

export const getWarehouses = (warehouseType?: number) =>
  apiClient.get<WarehouseDto[]>(`${BASE_URL}/warehouses`, { params: { warehouseType } });

export const getWarehouseById = (id: string) =>
  apiClient.get<WarehouseDto>(`${BASE_URL}/warehouses/${id}`);

export const getReusableSupplies = (warehouseId?: string, status?: number) =>
  apiClient.get<ReusableSupplyDto[]>(`${BASE_URL}/reusable-supplies`, { params: { warehouseId, status } });

export const recordSterilization = (id: string, sterilizationDate: string) =>
  apiClient.post<ReusableSupplyDto>(`${BASE_URL}/reusable-supplies/${id}/sterilize`, sterilizationDate);

export const getConsignmentStock = (warehouseId?: string, supplierId?: string) =>
  apiClient.get<ConsignmentStockDto[]>(`${BASE_URL}/consignment-stock`, { params: { warehouseId, supplierId } });

export const getIUMedicines = (warehouseId?: string) =>
  apiClient.get<IUMedicineDto[]>(`${BASE_URL}/iu-medicines`, { params: { warehouseId } });

export const convertIUToBaseUnit = (itemId: string, iuQuantity: number) =>
  apiClient.get<number>(`${BASE_URL}/convert-iu`, { params: { itemId, iuQuantity } });

export const getSplitableItems = (warehouseId: string) =>
  apiClient.get<SplitIssueDto[]>(`${BASE_URL}/splitable-items/${warehouseId}`);

export const splitPackage = (warehouseId: string, itemId: string, packageQuantity: number) =>
  apiClient.post<boolean>(`${BASE_URL}/split-package`, { warehouseId, itemId, packageQuantity });

export const getProfitMarginConfigs = (warehouseId: string) =>
  apiClient.get<ProfitMarginConfigDto[]>(`${BASE_URL}/profit-margin-configs/${warehouseId}`);

export const updateProfitMarginConfig = (dto: ProfitMarginConfigDto) =>
  apiClient.put<ProfitMarginConfigDto>(`${BASE_URL}/profit-margin-configs`, dto);

export const calculateSellingPrice = (warehouseId: string, itemId: string, costPrice: number) =>
  apiClient.get<number>(`${BASE_URL}/calculate-selling-price`, { params: { warehouseId, itemId, costPrice } });

// #endregion

// Default export
export default {
  // Receipts
  createSupplierReceipt,
  createOtherSourceReceipt,
  createTransferReceipt,
  createDepartmentReturnReceipt,
  updateStockReceipt,
  approveStockReceipt,
  cancelStockReceipt,
  getStockReceipts,
  getStockReceiptById,
  getSupplierPayables,
  createSupplierPayment,
  printStockReceipt,
  printInspectionReport,

  // Issues
  autoSelectBatches,
  dispenseOutpatientPrescription,
  dispenseInpatientOrder,
  issueToDepartment,
  createTransferIssue,
  createSupplierReturn,
  createDestructionIssue,
  createPharmacySaleByPrescription,
  createRetailSale,
  getStockIssues,
  getStockIssueById,
  getPendingOutpatientPrescriptions,
  printSaleInvoice,
  printStockIssue,
  printNarcoticIssue,

  // Stock
  createProcurementRequest,
  getAutoProcurementSuggestions,
  approveProcurementRequest,
  getProcurementRequests,
  getStock,
  getStockWarnings,
  getExpiryWarnings,
  getBatchInfo,
  getUnclaimedPrescriptions,
  cancelUnclaimedPrescription,
  createStockTake,
  updateStockTakeResults,
  completeStockTake,
  adjustStockAfterTake,
  printStockTakeReport,
  getStockCard,
  printStockCard,
  getStockMovementReport,
  printStockMovementReport,
  getDepartmentUsageReport,

  // Management
  getWarehouses,
  getWarehouseById,
  getReusableSupplies,
  recordSterilization,
  getConsignmentStock,
  getIUMedicines,
  convertIUToBaseUnit,
  getSplitableItems,
  splitPackage,
  getProfitMarginConfigs,
  updateProfitMarginConfig,
  calculateSellingPrice,
};
