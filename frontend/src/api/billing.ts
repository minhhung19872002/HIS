/**
 * API Client cho Phân hệ 10: Thu ngân
 * Module: Billing Complete
 */

import apiClient from './client';

// ==================== INTERFACES ====================

// #region Cashbook Management

export interface CashBookDto {
  id: string;
  code: string;
  name: string;
  bookType: number; // 1-Thu tiền, 2-Tạm ứng, 3-Hoàn ứng
  bookTypeName: string;
  departmentId?: string;
  departmentName?: string;
  cashierStationId?: string;
  cashierStationName?: string;
  receiptPrefix?: string;
  currentNumber: number;
  maxNumber?: number;
  openingBalance: number;
  currentBalance: number;
  status: number; // 1-Mở, 2-Tạm khóa, 3-Đã đóng
  statusName: string;
  authorizedUsers: CashBookUserDto[];
  createdAt: string;
  createdBy?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface CashBookUserDto {
  userId: string;
  userCode: string;
  userName: string;
  permission: number; // 1-Xem, 2-Thu, 3-Thu+Hoàn, 4-Quản lý
  permissionName: string;
  assignedAt: string;
  assignedBy?: string;
}

export interface CreateCashBookDto {
  code: string;
  name: string;
  bookType: number;
  departmentId?: string;
  cashierStationId?: string;
  receiptPrefix?: string;
  startNumber?: number;
  maxNumber?: number;
  openingBalance: number;
}

export interface AssignCashBookPermissionDto {
  cashBookId: string;
  userId: string;
  permission: number;
}

// #endregion

// #region Deposit Management

export interface DepositDto {
  id: string;
  receiptCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  medicalRecordId?: string;
  medicalRecordCode?: string;
  depositType: number; // 1-Ngoại trú, 2-Nội trú, 3-Từ khoa LS
  depositTypeName: string;
  depositSource: number; // 1-Thu ngân, 2-Khoa lâm sàng
  depositSourceName: string;
  departmentId?: string;
  departmentName?: string;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  paymentMethod: number;
  paymentMethodName: string;
  transactionNumber?: string;
  bankName?: string;
  cashierId: string;
  cashierName: string;
  depositBookId?: string;
  depositBookCode?: string;
  status: number; // 1-Chờ XN, 2-Đã XN, 3-Đã sử dụng, 4-Đã hoàn, 5-Đã hủy
  statusName: string;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface CreateDepositDto {
  patientId: string;
  medicalRecordId?: string;
  depositType: number;
  depositSource: number;
  departmentId?: string;
  amount: number;
  paymentMethod: number;
  transactionNumber?: string;
  bankName?: string;
  notes?: string;
}

export interface DepartmentDepositDto {
  id: string;
  receiptCode: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  submittedBy: string;
  submittedByName: string;
  deposits: DepositDto[];
  totalAmount: number;
  paymentMethod: number;
  cashierId: string;
  cashierName: string;
  status: number;
  createdAt: string;
  receivedAt?: string;
}

export interface DepositBalanceDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  totalDeposit: number;
  usedAmount: number;
  remainingBalance: number;
  activeDeposits: DepositDto[];
}

// #endregion

// #region Invoice Management

export interface InvoiceDto {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phoneNumber?: string;
  insuranceCardNumber?: string;
  insuranceCardPlace?: string;
  insuranceRate?: number;
  medicalRecordId: string;
  medicalRecordCode: string;
  patientType: number; // 1-Ngoại trú, 2-Nội trú
  patientTypeName: string;
  departmentId?: string;
  departmentName?: string;
  serviceItems: InvoiceServiceItemDto[];
  medicineItems: InvoiceMedicineItemDto[];
  supplyItems: InvoiceSupplyItemDto[];
  bedItems: InvoiceBedItemDto[];
  serviceTotal: number;
  medicineTotal: number;
  supplyTotal: number;
  bedTotal: number;
  subTotal: number;
  insuranceAmount: number;
  discountAmount: number;
  discountReason?: string;
  discountType?: number;
  discountPercent?: number;
  surchargeAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: number; // 0-Chưa TT, 1-Một phần, 2-Đã TT, 3-Đã hủy
  paymentStatusName: string;
  approvalStatus: number; // 0-Chưa duyệt, 1-Đã duyệt KT, 2-Tạm khóa
  approvalStatusName: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  lockReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceServiceItemDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup?: string;
  executeDepartmentId?: string;
  executeDepartmentName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  discountAmount: number;
  discountReason?: string;
  paymentObject: number;
  paymentObjectName: string;
  status: number;
  executedAt?: string;
}

export interface InvoiceMedicineItemDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  dosage?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  paymentObject: number;
  paymentObjectName: string;
  status: number;
}

export interface InvoiceSupplyItemDto {
  id: string;
  supplyId: string;
  supplyCode: string;
  supplyName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  paymentObject: number;
  status: number;
}

export interface InvoiceBedItemDto {
  id: string;
  bedCode: string;
  roomName: string;
  bedTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  dayRate: number;
  amount: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  paymentObject: number;
  status: number;
}

export interface CreateInvoiceDto {
  medicalRecordId: string;
  serviceItemIds?: string[];
  medicineItemIds?: string[];
  supplyItemIds?: string[];
}

export interface InvoiceSearchDto {
  keyword?: string;
  patientId?: string;
  departmentId?: string;
  patientType?: number;
  paymentStatus?: number;
  approvalStatus?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Payment Management

export interface PaymentDto {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  receiptCode: string;
  paymentDate: string;
  paymentMethod: number;
  paymentMethodName: string;
  cardNumber?: string;
  transactionNumber?: string;
  bankName?: string;
  amount: number;
  receivedAmount: number;
  changeAmount: number;
  depositId?: string;
  depositUsedAmount?: number;
  cashierId: string;
  cashierName: string;
  cashBookId?: string;
  cashBookCode?: string;
  notes?: string;
  status: number;
  statusName: string;
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelReason?: string;
  isPrinted: boolean;
  printCount: number;
  lastPrintedAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CreatePaymentDto {
  invoiceId: string;
  paymentMethod: number;
  amount: number;
  receivedAmount: number;
  cardNumber?: string;
  transactionNumber?: string;
  bankName?: string;
  depositId?: string;
  depositUsedAmount?: number;
  notes?: string;
}

export interface PaymentHistoryDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  totalPaid: number;
  totalDeposit: number;
  totalRefund: number;
  payments: PaymentDto[];
}

export interface PaymentStatusDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  hasInvoice: boolean;
  invoiceId?: string;
  invoiceCode?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  depositBalance: number;
  paymentStatus: number;
  paymentStatusName: string;
  canDischarge: boolean;
}

export interface UseDepositForPaymentDto {
  invoiceId: string;
  depositId: string;
  amount: number;
}

// #endregion

// #region Refund Management

export interface RefundDto {
  id: string;
  refundCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  refundType: number; // 1-Hoàn tạm ứng, 2-Hoàn thanh toán, 3-Hoàn BHYT
  refundTypeName: string;
  originalDepositId?: string;
  originalPaymentId?: string;
  refundAmount: number;
  refundMethod: number;
  refundMethodName: string;
  bankAccount?: string;
  bankName?: string;
  reason: string;
  cashierId: string;
  cashierName: string;
  status: number;
  statusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface CreateRefundDto {
  patientId: string;
  refundType: number;
  originalDepositId?: string;
  originalPaymentId?: string;
  refundAmount: number;
  refundMethod: number;
  bankAccount?: string;
  bankName?: string;
  reason: string;
}

export interface ApproveRefundDto {
  refundId: string;
  isApproved: boolean;
  rejectReason?: string;
}

export interface ConfirmRefundDto {
  refundId: string;
  transactionNumber?: string;
  notes?: string;
}

export interface RefundSearchDto {
  keyword?: string;
  patientId?: string;
  refundType?: number;
  status?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Discount Management

export interface ApplyDiscountDto {
  invoiceId: string;
  discountScope: number; // 1-Theo hóa đơn, 2-Theo dịch vụ
  discountType?: number; // 1-Theo %, 2-Theo số tiền
  discountPercent?: number;
  discountAmount?: number;
  discountReason?: string;
  serviceDiscounts?: ServiceDiscountDto[];
  approverId?: string;
}

export interface ServiceDiscountDto {
  itemId: string;
  itemType: number; // 1-Dịch vụ, 2-Thuốc, 3-Vật tư, 4-Giường
  discountType: number;
  discountPercent?: number;
  discountAmount?: number;
  reason?: string;
}

export interface DiscountHistoryDto {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  discountScope: number;
  discountType: number;
  discountPercent?: number;
  discountAmount: number;
  reason?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
}

// #endregion

// #region Record Locking

export interface RecordLockDto {
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  isLocked: boolean;
  lockType?: number;
  lockTypeName: string;
  lockReason?: string;
  lockedBy?: string;
  lockedByName?: string;
  lockedAt?: string;
  unlockedBy?: string;
  unlockedByName?: string;
  unlockedAt?: string;
}

export interface LockRecordDto {
  medicalRecordId: string;
  lock: boolean;
  lockType?: number;
  reason?: string;
}

// #endregion

// #region Accounting Approval

export interface AccountingApprovalDto {
  invoiceId: string;
  invoiceCode: string;
  patientName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  approvalStatus: number;
  approvalStatusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
}

export interface ApproveAccountingDto {
  invoiceIds: string[];
  isApproved: boolean;
  rejectReason?: string;
}

export interface PendingApprovalSearchDto {
  keyword?: string;
  departmentId?: string;
  patientType?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Insurance Check

export interface InsuranceCheckDto {
  insuranceCardNumber: string;
  patientName: string;
  dateOfBirth?: string;
  isValid: boolean;
  isInNetwork: boolean;
  isReferral: boolean;
  cardPlace?: string;
  cardFromDate?: string;
  cardToDate?: string;
  insuranceRate?: number;
  is5YearContinuous: boolean;
  warnings: string[];
  errors: string[];
  coPaymentRate?: number;
  maxCoPaymentAmount?: number;
  checkedAt: string;
}

export interface InsuranceCheckRequestDto {
  insuranceCardNumber: string;
  patientName: string;
  dateOfBirth?: string;
  checkOnline?: boolean;
}

// #endregion

// #region Electronic Invoice

export interface ElectronicInvoiceDto {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  eInvoiceNumber: string;
  eInvoiceSeries: string;
  eInvoiceDate: string;
  provider: string;
  providerInvoiceId?: string;
  buyerName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  buyerEmail?: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: number;
  statusName: string;
  lookupUrl?: string;
  lookupCode?: string;
  createdAt: string;
  createdBy?: string;
}

export interface IssueEInvoiceDto {
  invoiceId: string;
  buyerName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  buyerEmail?: string;
  sendEmail: boolean;
}

// #endregion

// #region Reports

export interface CashierReportDto {
  cashierId: string;
  cashierCode: string;
  cashierName: string;
  reportDate: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  cashBookId?: string;
  cashBookCode?: string;
  openingBalance: number;
  totalReceipt: number;
  receiptCount: number;
  paymentAmount: number;
  paymentCount: number;
  depositAmount: number;
  depositCount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  eWalletAmount: number;
  totalRefund: number;
  refundCount: number;
  closingBalance: number;
  transactions: CashierTransactionDto[];
  revenueByPatientType: PatientTypeRevenueDto[];
  revenueByDepartment: DepartmentRevenueDto[];
  status: number;
  isClosed: boolean;
  closedAt?: string;
  note?: string;
}

export interface CashierTransactionDto {
  id: string;
  transactionTime: string;
  transactionCode: string;
  transactionType: number;
  transactionTypeName: string;
  patientCode: string;
  patientName: string;
  paymentMethod: number;
  paymentMethodName: string;
  amount: number;
  note?: string;
}

export interface PatientTypeRevenueDto {
  patientType: number;
  patientTypeName: string;
  patientCount: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

export interface DepartmentRevenueDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  serviceAmount: number;
  medicineAmount: number;
  supplyAmount: number;
  totalAmount: number;
}

export interface CashierReportRequestDto {
  cashierId: string;
  date: string;
  fromTime?: string;
  toTime?: string;
}

export interface CloseCashBookDto {
  cashBookId: string;
  actualClosingBalance: number;
  note?: string;
}

export interface OutpatientRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalPatients: number;
  totalInvoices: number;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  dailyDetails: DailyRevenueItemDto[];
  serviceDetails: ServiceRevenueItemDto[];
  objectDetails: ObjectRevenueItemDto[];
}

export interface InpatientRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalPatients: number;
  totalInvoices: number;
  totalRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  depositRevenue: number;
  departmentDetails: DepartmentRevenueItemDto[];
  bedDetails: BedRevenueItemDto[];
}

export interface DailyRevenueItemDto {
  date: string;
  patientCount: number;
  invoiceCount: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

export interface ServiceRevenueItemDto {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  quantity: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

export interface ObjectRevenueItemDto {
  paymentObject: number;
  paymentObjectName: string;
  patientCount: number;
  totalAmount: number;
}

export interface DepartmentRevenueItemDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  patientCount: number;
  serviceAmount: number;
  medicineAmount: number;
  supplyAmount: number;
  bedAmount: number;
  totalAmount: number;
}

export interface BedRevenueItemDto {
  bedType: string;
  totalDays: number;
  dayRate: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

export interface DepositRevenueReportDto {
  fromDate: string;
  toDate: string;
  totalDeposits: number;
  totalDepositAmount: number;
  totalUsedAmount: number;
  totalRefundAmount: number;
  remainingAmount: number;
  dailyDetails: DailyDepositItemDto[];
  typeDetails: DepositTypeItemDto[];
}

export interface DailyDepositItemDto {
  date: string;
  depositCount: number;
  depositAmount: number;
  refundCount: number;
  refundAmount: number;
}

export interface DepositTypeItemDto {
  depositType: number;
  depositTypeName: string;
  count: number;
  amount: number;
}

export interface CashBookUsageReportDto {
  cashBookId: string;
  cashBookCode: string;
  cashBookName: string;
  fromDate: string;
  toDate: string;
  startReceiptNumber: number;
  endReceiptNumber: number;
  totalReceiptsUsed: number;
  totalReceiptsCancelled: number;
  totalReceipt: number;
  totalPayment: number;
  balance: number;
  userUsages: UserCashBookUsageDto[];
}

export interface UserCashBookUsageDto {
  userId: string;
  userCode: string;
  userName: string;
  receiptCount: number;
  totalAmount: number;
}

export interface RevenueReportRequestDto {
  fromDate: string;
  toDate: string;
  patientType?: number;
  departmentId?: string;
  cashierId?: string;
  paymentObject?: number;
}

// #endregion

// #region Patient Status

export interface PatientBillingStatusDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  recordStatus: number;
  recordStatusName: string;
  accountingStatus: number;
  accountingStatusName: string;
  paymentStatus: number;
  paymentStatusName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  paidAmount: number;
  depositBalance: number;
  remainingAmount: number;
  hasUnpaidServices: boolean;
  hasPendingApproval: boolean;
  isLocked: boolean;
  canDischarge: boolean;
  warnings: string[];
}

export interface PatientStatusSearchDto {
  keyword?: string;
  recordStatus?: number;
  accountingStatus?: number;
  paymentStatus?: number;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

// #endregion

// #region Unpaid Items

export interface UnpaidServiceItemDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  serviceGroup: string;
  orderDepartmentId?: string;
  orderDepartmentName?: string;
  executeDepartmentId?: string;
  executeDepartmentName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentObject: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  orderedAt: string;
  executedAt?: string;
}

export interface UnpaidMedicineItemDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  paymentObject: number;
  insuranceRate: number;
  insuranceAmount: number;
  patientAmount: number;
  prescribedAt: string;
  dispensedAt?: string;
}

// #endregion

// #region Statistics

export interface BillingStatisticsDto {
  fromDate: string;
  toDate: string;
  totalPatients: number;
  outpatientCount: number;
  inpatientCount: number;
  totalRevenue: number;
  serviceRevenue: number;
  medicineRevenue: number;
  supplyRevenue: number;
  bedRevenue: number;
  insuranceRevenue: number;
  patientRevenue: number;
  totalDeposit: number;
  depositUsed: number;
  depositRefund: number;
  totalDiscount: number;
  totalDebt: number;
  dailyTrend: DailyRevenueItemDto[];
}

export interface BillingStatisticsRequestDto {
  fromDate: string;
  toDate: string;
  patientType?: number;
  departmentId?: string;
  includeDailyTrend?: boolean;
}

export interface DailyRevenueReportDto {
  date: string;
  outpatientCount: number;
  outpatientRevenue: number;
  inpatientCount: number;
  inpatientRevenue: number;
  depositCount: number;
  depositAmount: number;
  refundCount: number;
  refundAmount: number;
  totalRevenue: number;
}

export interface DepartmentRevenueRequestDto {
  fromDate: string;
  toDate: string;
  departmentIds?: string[];
  patientType?: number;
}

export interface DebtStatisticsDto {
  asOfDate: string;
  totalDebtors: number;
  totalDebt: number;
  debt0To30Days: number;
  debt30To60Days: number;
  debt60To90Days: number;
  debtOver90Days: number;
  topDebtors: DebtorDto[];
}

export interface DebtorDto {
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber?: string;
  debtAmount: number;
  daysOverdue: number;
  lastPaymentDate: string;
}

// #endregion

// #region Insurance Claim

export interface InsuranceClaimDto {
  id: string;
  medicalRecordId: string;
  medicalRecordCode: string;
  patientName: string;
  insuranceCardNumber: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number;
  statusName: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
}

export interface Xml4210ResultDto {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileContent?: string;
  totalRecords: number;
  totalAmount: number;
  errors: string[];
  warnings: string[];
}

export interface GenerateXml4210RequestDto {
  fromDate: string;
  toDate: string;
  patientType?: number;
  medicalRecordIds?: string[];
  autoSubmit?: boolean;
}

export interface InsuranceClaimStatisticsDto {
  fromDate: string;
  toDate: string;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalClaimAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  outpatientAmount: number;
  inpatientAmount: number;
}

// #endregion

// #region Print Request DTOs

export interface Print6556RequestDto {
  medicalRecordId: string;
  splitByObject?: boolean;
  splitByDepartment?: boolean;
  paymentObject?: number;
  departmentId?: string;
}

export interface PrintByServiceRequestDto {
  patientId: string;
  serviceIds?: string[];
  fromDate?: string;
  toDate?: string;
}

// #endregion

// #region Paged Result

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// ==================== API FUNCTIONS ====================

const BASE_URL = '/BillingComplete';

// #region 10.1.1 Quản lý sổ thu

export const createCashBook = (dto: CreateCashBookDto) =>
  apiClient.post<CashBookDto>(`${BASE_URL}/cash-books`, dto);

export const createDepositBook = (dto: CreateCashBookDto) =>
  apiClient.post<CashBookDto>(`${BASE_URL}/deposit-books`, dto);

export const getCashBooks = (bookType?: number, departmentId?: string) =>
  apiClient.get<CashBookDto[]>(`${BASE_URL}/cash-books`, { params: { bookType, departmentId } });

export const getCashBookById = (id: string) =>
  apiClient.get<CashBookDto>(`${BASE_URL}/cash-books/${id}`);

export const lockCashBook = (id: string) =>
  apiClient.post<CashBookDto>(`${BASE_URL}/cash-books/${id}/lock`);

export const unlockCashBook = (id: string) =>
  apiClient.post<CashBookDto>(`${BASE_URL}/cash-books/${id}/unlock`);

export const assignCashBookPermission = (dto: AssignCashBookPermissionDto) =>
  apiClient.post<boolean>(`${BASE_URL}/cash-books/permissions`, dto);

export const removeCashBookPermission = (cashBookId: string, userId: string) =>
  apiClient.delete<boolean>(`${BASE_URL}/cash-books/${cashBookId}/permissions/${userId}`);

export const getCashBookUsers = (id: string) =>
  apiClient.get<CashBookUserDto[]>(`${BASE_URL}/cash-books/${id}/users`);

// #endregion

// #region 10.1.2 Tìm kiếm bệnh nhân

export const searchPatients = (dto: PatientStatusSearchDto) =>
  apiClient.get<PagedResultDto<PatientBillingStatusDto>>(`${BASE_URL}/patients/search`, { params: dto });

export const getPatientBillingStatus = (medicalRecordId: string) =>
  apiClient.get<PatientBillingStatusDto>(`${BASE_URL}/patients/${medicalRecordId}/billing-status`);

export const checkInsuranceCard = (dto: InsuranceCheckRequestDto) =>
  apiClient.post<InsuranceCheckDto>(`${BASE_URL}/insurance/check`, dto);

// #endregion

// #region 10.1.3 Tạm ứng

export const createDeposit = (dto: CreateDepositDto) =>
  apiClient.post<DepositDto>(`${BASE_URL}/deposits`, dto);

export const createDepartmentDeposit = (departmentId: string, depositIds: string[]) =>
  apiClient.post<DepartmentDepositDto>(`${BASE_URL}/deposits/department`, { departmentId, depositIds });

export const receiveDepartmentDeposit = (id: string) =>
  apiClient.post<DepartmentDepositDto>(`${BASE_URL}/deposits/department/${id}/receive`);

export const getDepositBalance = (patientId: string) =>
  apiClient.get<DepositBalanceDto>(`${BASE_URL}/deposits/balance/${patientId}`);

export const useDepositForPayment = (dto: UseDepositForPaymentDto) =>
  apiClient.post<PaymentDto>(`${BASE_URL}/deposits/use-for-payment`, dto);

export const getPatientDeposits = (patientId: string, status?: number) =>
  apiClient.get<DepositDto[]>(`${BASE_URL}/deposits/patient/${patientId}`, { params: { status } });

export const cancelDeposit = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/deposits/${id}/cancel`, { reason });

// #endregion

// #region 10.1.4 Thu tiền

export const createPayment = (dto: CreatePaymentDto) =>
  apiClient.post<PaymentDto>(`${BASE_URL}/payments`, dto);

export const cancelPayment = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/payments/${id}/cancel`, { reason });

export const getPaymentHistory = (patientId: string) =>
  apiClient.get<PaymentHistoryDto>(`${BASE_URL}/payments/history/${patientId}`);

export const checkPaymentStatus = (medicalRecordId: string) =>
  apiClient.get<PaymentStatusDto>(`${BASE_URL}/payments/status/${medicalRecordId}`);

// #endregion

// #region 10.1.5 Hoàn ứng

export const createRefund = (dto: CreateRefundDto) =>
  apiClient.post<RefundDto>(`${BASE_URL}/refunds`, dto);

export const approveRefund = (dto: ApproveRefundDto) =>
  apiClient.post<RefundDto>(`${BASE_URL}/refunds/approve`, dto);

export const confirmRefund = (dto: ConfirmRefundDto) =>
  apiClient.post<RefundDto>(`${BASE_URL}/refunds/confirm`, dto);

export const searchRefunds = (dto: RefundSearchDto) =>
  apiClient.get<PagedResultDto<RefundDto>>(`${BASE_URL}/refunds/search`, { params: dto });

export const cancelRefund = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/refunds/${id}/cancel`, { reason });

// #endregion

// #region 10.1.6 Tạm khóa hồ sơ

export const lockMedicalRecord = (dto: LockRecordDto) =>
  apiClient.post<RecordLockDto>(`${BASE_URL}/records/lock`, dto);

export const unlockMedicalRecord = (medicalRecordId: string) =>
  apiClient.post<RecordLockDto>(`${BASE_URL}/records/${medicalRecordId}/unlock`);

export const getRecordLockStatus = (medicalRecordId: string) =>
  apiClient.get<RecordLockDto>(`${BASE_URL}/records/${medicalRecordId}/lock-status`);

// #endregion

// #region 10.1.7 Duyệt kế toán

export const approveAccounting = (dto: ApproveAccountingDto) =>
  apiClient.post<AccountingApprovalDto[]>(`${BASE_URL}/accounting/approve`, dto);

export const getPendingApprovals = (dto: PendingApprovalSearchDto) =>
  apiClient.get<PagedResultDto<AccountingApprovalDto>>(`${BASE_URL}/accounting/pending`, { params: dto });

export const getApprovalDetail = (invoiceId: string) =>
  apiClient.get<AccountingApprovalDto>(`${BASE_URL}/accounting/invoices/${invoiceId}`);

// #endregion

// #region 10.1.8 Miễn giảm

export const applyInvoiceDiscount = (dto: ApplyDiscountDto) =>
  apiClient.post<InvoiceDto>(`${BASE_URL}/discounts/invoice`, dto);

export const applyServiceDiscount = (dto: ApplyDiscountDto) =>
  apiClient.post<InvoiceDto>(`${BASE_URL}/discounts/services`, dto);

export const getDiscountHistory = (invoiceId: string) =>
  apiClient.get<DiscountHistoryDto[]>(`${BASE_URL}/discounts/history/${invoiceId}`);

export const cancelDiscount = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/discounts/${id}/cancel`, { reason });

// #endregion

// #region 10.1.9 Hóa đơn

export const calculateInvoice = (medicalRecordId: string) =>
  apiClient.get<InvoiceDto>(`${BASE_URL}/invoices/calculate/${medicalRecordId}`);

export const createOrUpdateInvoice = (dto: CreateInvoiceDto) =>
  apiClient.post<InvoiceDto>(`${BASE_URL}/invoices`, dto);

export const getInvoiceById = (id: string) =>
  apiClient.get<InvoiceDto>(`${BASE_URL}/invoices/${id}`);

export const getPatientInvoice = (medicalRecordId: string) =>
  apiClient.get<InvoiceDto>(`${BASE_URL}/invoices/medical-record/${medicalRecordId}`);

export const searchInvoices = (dto: InvoiceSearchDto) =>
  apiClient.get<PagedResultDto<InvoiceDto>>(`${BASE_URL}/invoices/search`, { params: dto });

export const getUnpaidServices = (patientId: string) =>
  apiClient.get<UnpaidServiceItemDto[]>(`${BASE_URL}/invoices/unpaid-services/${patientId}`);

export const getUnpaidMedicines = (patientId: string) =>
  apiClient.get<UnpaidMedicineItemDto[]>(`${BASE_URL}/invoices/unpaid-medicines/${patientId}`);

// #endregion

// #region 10.2 In ấn

export const print6556Statement = (dto: Print6556RequestDto) =>
  apiClient.post(`${BASE_URL}/print/statement-6556`, dto, { responseType: 'blob' });

export const print6556ByObject = (dto: Print6556RequestDto) =>
  apiClient.post(`${BASE_URL}/print/statement-6556-by-object`, dto, { responseType: 'blob' });

export const print6556ByDepartment = (dto: Print6556RequestDto) =>
  apiClient.post(`${BASE_URL}/print/statement-6556-by-department`, dto, { responseType: 'blob' });

export const printDepositByService = (dto: PrintByServiceRequestDto) =>
  apiClient.post(`${BASE_URL}/print/deposit-by-service`, dto, { responseType: 'blob' });

export const printDepositReceipt = (id: string) =>
  apiClient.get(`${BASE_URL}/print/deposit/${id}`, { responseType: 'blob' });

export const printPaymentReceipt = (id: string) =>
  apiClient.get(`${BASE_URL}/print/payment/${id}`, { responseType: 'blob' });

export const printInvoice = (id: string) =>
  apiClient.get(`${BASE_URL}/print/invoice/${id}`, { responseType: 'blob' });

export const printRefundReceipt = (id: string) =>
  apiClient.get(`${BASE_URL}/print/refund/${id}`, { responseType: 'blob' });

// #endregion

// #region 10.2.1 Hóa đơn điện tử

export const issueElectronicInvoice = (dto: IssueEInvoiceDto) =>
  apiClient.post<ElectronicInvoiceDto>(`${BASE_URL}/e-invoices`, dto);

export const cancelElectronicInvoice = (id: string, reason: string) =>
  apiClient.post<boolean>(`${BASE_URL}/e-invoices/${id}/cancel`, { reason });

export const getElectronicInvoices = (invoiceId?: string, fromDate?: string, toDate?: string) =>
  apiClient.get<ElectronicInvoiceDto[]>(`${BASE_URL}/e-invoices`, { params: { invoiceId, fromDate, toDate } });

export const resendElectronicInvoice = (id: string, email: string) =>
  apiClient.post<boolean>(`${BASE_URL}/e-invoices/${id}/resend`, { email });

// #endregion

// #region 10.3 Quản lý thu ngân

export const getCashierReport = (dto: CashierReportRequestDto) =>
  apiClient.get<CashierReportDto>(`${BASE_URL}/reports/cashier`, { params: dto });

export const closeCashBook = (dto: CloseCashBookDto) =>
  apiClient.post<CashierReportDto>(`${BASE_URL}/cash-books/close`, dto);

export const getOutpatientRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.get<OutpatientRevenueReportDto>(`${BASE_URL}/reports/outpatient-revenue`, { params: dto });

export const getInpatientRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.get<InpatientRevenueReportDto>(`${BASE_URL}/reports/inpatient-revenue`, { params: dto });

export const getDepositRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.get<DepositRevenueReportDto>(`${BASE_URL}/reports/deposit-revenue`, { params: dto });

export const getCashBookUsageReport = (cashBookId: string, fromDate: string, toDate: string) =>
  apiClient.get<CashBookUsageReportDto>(`${BASE_URL}/reports/cash-book-usage/${cashBookId}`, { params: { fromDate, toDate } });

export const printOutpatientRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.post(`${BASE_URL}/reports/outpatient-revenue/print`, dto, { responseType: 'blob' });

export const printInpatientRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.post(`${BASE_URL}/reports/inpatient-revenue/print`, dto, { responseType: 'blob' });

export const printDepositRevenueReport = (dto: RevenueReportRequestDto) =>
  apiClient.post(`${BASE_URL}/reports/deposit-revenue/print`, dto, { responseType: 'blob' });

// #endregion

// #region 10.4 Thống kê & BHYT

export const getBillingStatistics = (dto: BillingStatisticsRequestDto) =>
  apiClient.get<BillingStatisticsDto>(`${BASE_URL}/statistics`, { params: dto });

export const getDailyRevenue = (date: string) =>
  apiClient.get<DailyRevenueReportDto>(`${BASE_URL}/statistics/daily/${date}`);

export const getRevenueByDepartment = (dto: DepartmentRevenueRequestDto) =>
  apiClient.get<DepartmentRevenueDto[]>(`${BASE_URL}/statistics/by-department`, { params: dto });

export const getDebtStatistics = (asOfDate?: string) =>
  apiClient.get<DebtStatisticsDto>(`${BASE_URL}/statistics/debt`, { params: { asOfDate } });

export const generateInsuranceClaim = (medicalRecordId: string) =>
  apiClient.post<InsuranceClaimDto>(`${BASE_URL}/insurance-claims/${medicalRecordId}`);

export const generateXml4210 = (dto: GenerateXml4210RequestDto) =>
  apiClient.post<Xml4210ResultDto>(`${BASE_URL}/insurance-claims/xml-4210`, dto);

export const getInsuranceClaimStatistics = (fromDate: string, toDate: string) =>
  apiClient.get<InsuranceClaimStatisticsDto>(`${BASE_URL}/insurance-claims/statistics`, { params: { fromDate, toDate } });

// #endregion

export default {
  // Cashbook
  createCashBook,
  createDepositBook,
  getCashBooks,
  getCashBookById,
  lockCashBook,
  unlockCashBook,
  assignCashBookPermission,
  removeCashBookPermission,
  getCashBookUsers,
  // Patient Search
  searchPatients,
  getPatientBillingStatus,
  checkInsuranceCard,
  // Deposit
  createDeposit,
  createDepartmentDeposit,
  receiveDepartmentDeposit,
  getDepositBalance,
  useDepositForPayment,
  getPatientDeposits,
  cancelDeposit,
  // Payment
  createPayment,
  cancelPayment,
  getPaymentHistory,
  checkPaymentStatus,
  // Refund
  createRefund,
  approveRefund,
  confirmRefund,
  searchRefunds,
  cancelRefund,
  // Record Lock
  lockMedicalRecord,
  unlockMedicalRecord,
  getRecordLockStatus,
  // Accounting
  approveAccounting,
  getPendingApprovals,
  getApprovalDetail,
  // Discount
  applyInvoiceDiscount,
  applyServiceDiscount,
  getDiscountHistory,
  cancelDiscount,
  // Invoice
  calculateInvoice,
  createOrUpdateInvoice,
  getInvoiceById,
  getPatientInvoice,
  searchInvoices,
  getUnpaidServices,
  getUnpaidMedicines,
  // Print
  print6556Statement,
  print6556ByObject,
  print6556ByDepartment,
  printDepositByService,
  printDepositReceipt,
  printPaymentReceipt,
  printInvoice,
  printRefundReceipt,
  // Electronic Invoice
  issueElectronicInvoice,
  cancelElectronicInvoice,
  getElectronicInvoices,
  resendElectronicInvoice,
  // Reports
  getCashierReport,
  closeCashBook,
  getOutpatientRevenueReport,
  getInpatientRevenueReport,
  getDepositRevenueReport,
  getCashBookUsageReport,
  printOutpatientRevenueReport,
  printInpatientRevenueReport,
  printDepositRevenueReport,
  // Statistics
  getBillingStatistics,
  getDailyRevenue,
  getRevenueByDepartment,
  getDebtStatistics,
  generateInsuranceClaim,
  generateXml4210,
  getInsuranceClaimStatistics,
};
