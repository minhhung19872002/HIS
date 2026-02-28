import request from '@/utils/request';

// ============================================
// Phân hệ 12: Giám định BHYT - XML Export
// Theo QĐ 4210, 4750, 3176, 130
// ============================================

// #region Types

// XML Data Types
export interface Xml1MedicalRecordDto {
  maLk: string;
  maBn: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: number;
  diaChi: string;
  maThe: string;
  maDkbd: string;
  gtTheTu: string;
  gtTheDen: string;
  mienCungCt?: string;
  ngayVao: string;
  ngayRa?: string;
  soNgayDt: number;
  tinhTrangRv: number;
  ketQuaDt: string;
  maLoaiKcb: string;
  maKhoa: string;
  maBenhChinh: string;
  maBenhKt?: string;
  maBenhYhct?: string;
  maPtttQt?: string;
  maDoiTuong?: string;
  tienKham: number;
  tienGiuong: number;
  tienNgoaitruth: number;
  tienBhyt: number;
  tienBnCct: number;
  tienNguoibenh: number;
  tienTuphitru: number;
  canNang?: string;
  maTtpt?: string;
  maPhong: string;
}

export interface Xml2MedicineDto {
  maLk: string;
  stt: number;
  maThuoc: string;
  maNhom: string;
  tenThuoc: string;
  donViTinh?: string;
  hamLuong?: string;
  duongDung?: string;
  soLuong: number;
  donGia: number;
  tyLeThanhToan: number;
  thanhTien: number;
  maKhoa?: string;
  maBacSi?: string;
  ngayYl?: string;
  maPttt?: string;
  maBenh?: string;
  thanhTienBv?: number;
  tienBhyt?: number;
  tienBnCct?: number;
  tienNguoiBenh?: number;
  mucHuong?: number;
  maNguonChiTra?: number;
}

export interface Xml3ServiceDto {
  maLk: string;
  stt: number;
  maDvu: string;
  maNhom: string;
  maPttt?: string;
  tenDvu: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  tyLeThanhToan: number;
  thanhTien: number;
  maKhoa?: string;
  maBacSi?: string;
  ngayYl?: string;
  ngayKq?: string;
  maBenh?: string;
  thanhTienBv?: number;
  tienBhyt?: number;
  tienBnCct?: number;
  tienNguoiBenh?: number;
  mucHuong?: number;
  maNguonChiTra?: number;
}

export interface Xml4OtherMedicineDto {
  maLk: string;
  stt: number;
  maThuoc: string;
  tenThuoc: string;
  donViTinh?: string;
  hamLuong?: string;
  duongDung?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  maKhoa?: string;
  maBacSi?: string;
  ngayYl?: string;
}

export interface Xml5PrescriptionDto {
  maLk: string;
  stt: number;
  maThuoc: string;
  tenThuoc: string;
  soDk?: string;
  hamLuong?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  lieuDung?: string;
  cachDung?: string;
  soNgay: number;
  maBenh?: string;
  ngayKeDon: string;
}

export interface Xml7ReferralDto {
  maLk: string;
  stt: number;
  soHoSo: string;
  maBnChuyenDi: string;
  maCskbChuyenDi: string;
  ngayChuyenDi: string;
  maCskbChuyenDen: string;
  lyDoChuyenVien: string;
  maBenhChinh?: string;
  maBenhKt?: string;
  tomTatKq?: string;
  huongDieuTri?: string;
  phuongTienVc?: string;
  hoTenNguoiHt?: string;
  chucDanhNguoiHt?: string;
}

// Claim Types
export interface InsuranceClaimSummaryDto {
  id: string;
  maLk: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  coPayAmount: number;
  patientAmount: number;
  status: number;
  statusName: string;
  rejectReason?: string;
  submitDate?: string;
  createdAt: string;
}

export interface InsuranceValidationResultDto {
  maLk: string;
  isValid: boolean;
  errors: InsuranceValidationError[];
  warnings: InsuranceValidationWarning[];
}

export interface InsuranceValidationError {
  errorCode: string;
  field: string;
  message: string;
  tableName: string;
}

export interface InsuranceValidationWarning {
  warningCode: string;
  field: string;
  message: string;
}

// Card Verification Types
export interface InsuranceCardVerificationDto {
  maThe: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: number;
  diaChi: string;
  gtTheTu: string;
  gtTheDen: string;
  maDkbd: string;
  tenDkbd: string;
  mucHuong: string;
  duDkKcb: boolean;
  lyDoKhongDuDk?: string;
  mienCungCt: boolean;
  maLyDoMien?: string;
  ngayDu5Nam?: string;
  isTraTruoc: boolean;
  maKv: string;
  loaiThe: string;
  verificationTime: string;
  verificationToken: string;
}

export interface InsuranceHistoryDto {
  maThe: string;
  visits: InsuranceVisitHistoryDto[];
}

export interface InsuranceVisitHistoryDto {
  maCsKcb: string;
  tenCsKcb: string;
  ngayKcb: string;
  maLoaiKcb: string;
  maBenhChinh: string;
  tenBenhChinh: string;
  tienBhyt: number;
}

export interface InsuranceBenefitDto {
  insuranceNumber: string;
  paymentRatio: number;
  hasCoPayExemption: boolean;
  is5YearsContinuous: boolean;
  coveredServices: string[];
  remainingBudget?: number;
}

// Settlement Types
export interface InsuranceSettlementBatchDto {
  id: string;
  batchCode: string;
  month: number;
  year: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number;
  createdAt: string;
  submitDate?: string;
  resultDate?: string;
}

export interface InsuranceReconciliationDto {
  id: string;
  batchCode: string;
  month: number;
  year: number;
  hospitalRecordCount: number;
  hospitalTotalAmount: number;
  hospitalInsuranceAmount: number;
  acceptedRecordCount: number;
  acceptedTotalAmount: number;
  acceptedInsuranceAmount: number;
  rejectedRecordCount: number;
  differenceAmount: number;
  rejectedClaims: RejectedClaimDto[];
  status: number;
  reconciliationDate: string;
}

export interface RejectedClaimDto {
  maLk: string;
  patientName: string;
  insuranceNumber: string;
  rejectCode: string;
  rejectReason: string;
  claimAmount: number;
  rejectedAmount: number;
}

// Report Types
export interface MonthlyInsuranceReportDto {
  month: number;
  year: number;
  totalVisits: number;
  outpatientVisits: number;
  inpatientVisits: number;
  emergencyVisits: number;
  totalCost: number;
  medicineCost: number;
  serviceCost: number;
  bedCost: number;
  examinationCost: number;
  insurancePaid: number;
  patientPaid: number;
  coPayAmount: number;
  byTreatmentType: Record<string, number>;
  byDepartment: Record<string, number>;
  topDiseases: DiseaseStatDto[];
  topMedicines: MedicineStatDto[];
}

export interface DiseaseStatDto {
  icdCode: string;
  diseaseName: string;
  count: number;
  totalCost: number;
}

export interface MedicineStatDto {
  medicineCode: string;
  medicineName: string;
  totalQuantity: number;
  totalCost: number;
}

export interface ReportC79aDto {
  maCsKcb: string;
  tenCsKcb: string;
  month: number;
  year: number;
  lines: ReportC79aLineDto[];
  totalAmount: number;
  totalInsuranceAmount: number;
}

export interface ReportC79aLineDto {
  stt: number;
  tenChiTieu: string;
  soLuot: number;
  tienTamUng: number;
  tienDeNghi: number;
  tienQuyetToan: number;
}

export interface Report80aDto {
  maCsKcb: string;
  tenCsKcb: string;
  month: number;
  year: number;
  details: Report80aDetailDto[];
  totalPatients: number;
  totalInsuranceAmount: number;
}

export interface Report80aDetailDto {
  stt: number;
  loaiThe: string;
  soLuotKcb: number;
  soNguoi: number;
  tienDeNghi: number;
  tienQuyetToan: number;
}

// Catalog Types
export interface ServiceInsuranceMapDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  insuranceCode: string;
  insuranceGroupCode: string;
  insurancePrice: number;
  paymentRatio: number;
  effectiveDate: string;
  expiredDate?: string;
  isActive: boolean;
}

export interface MedicineInsuranceMapDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  insuranceCode: string;
  insuranceGroupCode: string;
  hoatChat?: string;
  duongDung?: string;
  hamLuong?: string;
  insurancePrice: number;
  paymentRatio: number;
  effectiveDate: string;
  expiredDate?: string;
  isActive: boolean;
}

export interface IcdInsuranceMapDto {
  icdCode: string;
  icdName: string;
  isValidForOutpatient: boolean;
  isValidForInpatient: boolean;
  maxDays?: number;
  maxCost?: number;
  requiredServices: string[];
  allowedMedicines: string[];
}

// Config Types
export interface InsurancePortalConfigDto {
  portalUrl: string;
  username: string;
  password?: string;
  certificatePath: string;
  useProxy: boolean;
  proxyUrl?: string;
  timeoutSeconds: number;
  testMode: boolean;
}

export interface FacilityInfoDto {
  maCsKcb: string;
  tenCsKcb: string;
  diaChi: string;
  maTinh: string;
  maHuyen: string;
  hangBenhVien: number;
  tuyenKcb: number;
  maSoThue?: string;
  soDienThoai?: string;
  giamDoc?: string;
}

// Export/Import Types
export interface XmlExportConfigDto {
  month: number;
  year: number;
  fromDate?: string;
  toDate?: string;
  maLkList?: string[];
  patientType?: number;
  treatmentType?: number;
  departmentId?: string;
  includeXml1: boolean;
  includeXml2: boolean;
  includeXml3: boolean;
  includeXml4: boolean;
  includeXml5: boolean;
  includeXml7: boolean;
  validateBeforeExport: boolean;
  compressOutput: boolean;
}

export interface XmlExportResultDto {
  batchId: string;
  batchCode: string;
  totalRecords: number;
  successRecords: number;
  failedRecords: number;
  filePath?: string;
  fileSize: number;
  fileChecksum?: string;
  errors: XmlExportError[];
  exportTime: string;
}

export interface XmlExportError {
  maLk: string;
  errorCode: string;
  errorMessage: string;
}

export interface SubmitToInsurancePortalDto {
  batchId: string;
  username: string;
  password: string;
  certificatePath: string;
  testMode: boolean;
}

export interface SubmitResultDto {
  success: boolean;
  transactionId?: string;
  message?: string;
  errors: SubmitError[];
  submitTime: string;
}

export interface SubmitError {
  maLk: string;
  errorCode: string;
  errorMessage: string;
}

export interface SubmitStatusDto {
  transactionId: string;
  status: number;
  statusName: string;
  message?: string;
  completedAt?: string;
}

export interface InsuranceFeedbackDto {
  transactionId: string;
  totalRecords: number;
  acceptedRecords: number;
  rejectedRecords: number;
  items: FeedbackItem[];
}

export interface FeedbackItem {
  maLk: string;
  isAccepted: boolean;
  rejectCode?: string;
  rejectReason?: string;
}

export interface InsuranceCostCalculationDto {
  unitPrice: number;
  insurancePrice: number;
  paymentRatio: number;
  insuranceAmount: number;
  coPayAmount: number;
  patientAmount: number;
  notes?: string;
}

export interface ReferralCheckResult {
  isCorrectReferral: boolean;
  paymentRatio: number;
  reason?: string;
  requiresReferralLetter: boolean;
}

export interface PortalConnectionTestResult {
  isConnected: boolean;
  responseTimeMs: number;
  errorMessage?: string;
  testedAt: string;
}

export interface ImportResultDto {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: ImportError[];
}

export interface ImportError {
  rowNumber: number;
  columnName: string;
  errorMessage: string;
}

export interface InsuranceActivityLogDto {
  id: string;
  maLk?: string;
  action: string;
  description?: string;
  userName?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface InsuranceClaimSearchDto {
  keyword?: string;
  maLk?: string;
  patientCode?: string;
  insuranceNumber?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
  departmentId?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// #endregion

// #region 12.1 Tra cứu và xác minh thẻ BHYT

export const verifyInsuranceCard = (data: { insuranceNumber: string; patientName: string; dateOfBirth: string }) =>
  request.post<InsuranceCardVerificationDto>('/insurance/verify-card', data);

export const getInsuranceHistory = (insuranceNumber: string) =>
  request.get<InsuranceHistoryDto>(`/insurance/history/${insuranceNumber}`);

export const checkInsuranceValidity = (insuranceNumber: string, serviceDate?: string) =>
  request.get<boolean>('/insurance/check-validity', { params: { insuranceNumber, serviceDate } });

export const getInsuranceBenefits = (insuranceNumber: string) =>
  request.get<InsuranceBenefitDto>(`/insurance/benefits/${insuranceNumber}`);

export const checkPrimaryRegistration = (insuranceNumber: string, facilityCode: string) =>
  request.get<boolean>('/insurance/check-primary-registration', { params: { insuranceNumber, facilityCode } });

// #endregion

// #region 12.2 Tạo và quản lý hồ sơ BHYT

export const createInsuranceClaim = (examinationId: string) =>
  request.post<InsuranceClaimSummaryDto>(`/insurance/claims/create/${examinationId}`);

export const getInsuranceClaimByMaLk = (maLk: string) =>
  request.get<InsuranceClaimSummaryDto>(`/insurance/claims/${maLk}`);

export const searchInsuranceClaims = (dto: InsuranceClaimSearchDto) =>
  request.post<PagedResult<InsuranceClaimSummaryDto>>('/insurance/claims/search', dto);

export const updateInsuranceClaim = (maLk: string, dto: { diagnosisCode?: string; diagnosisName?: string; treatmentResult?: number; notes?: string }) =>
  request.put<InsuranceClaimSummaryDto>(`/insurance/claims/${maLk}`, dto);

export const deleteInsuranceClaim = (maLk: string) =>
  request.delete<boolean>(`/insurance/claims/${maLk}`);

export const lockInsuranceClaim = (maLk: string) =>
  request.post<boolean>(`/insurance/claims/${maLk}/lock`);

export const unlockInsuranceClaim = (maLk: string, reason: string) =>
  request.post<boolean>(`/insurance/claims/${maLk}/unlock`, { reason });

// #endregion

// Preview export types
export interface XmlExportPreviewDto {
  totalRecords: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  departmentName?: string;
  totalCostAmount: number;
  totalInsuranceAmount: number;
  totalPatientAmount: number;
  tables: XmlTablePreview[];
  validationErrors: InsuranceValidationResultDto[];
  hasBlockingErrors: boolean;
}

export interface XmlTablePreview {
  tableName: string;
  description: string;
  recordCount: number;
}

// #region 12.3 Xuất XML theo chuẩn BHXH

// Preview export before generating
export const previewExport = (config: XmlExportConfigDto) =>
  request.post<XmlExportPreviewDto>('/insurance/xml/preview', config);

// Sign XML batch with digital signature
export const signXmlBatch = (batchId: string) =>
  request.post<{ success: boolean; message: string }>(`/insurance/xml/sign/${batchId}`);

export const generateXml1Data = (config: XmlExportConfigDto) =>
  request.post<Xml1MedicalRecordDto[]>('/insurance/xml/generate/xml1', config);

export const generateXml2Data = (config: XmlExportConfigDto) =>
  request.post<Xml2MedicineDto[]>('/insurance/xml/generate/xml2', config);

export const generateXml3Data = (config: XmlExportConfigDto) =>
  request.post<Xml3ServiceDto[]>('/insurance/xml/generate/xml3', config);

export const generateXml4Data = (config: XmlExportConfigDto) =>
  request.post<Xml4OtherMedicineDto[]>('/insurance/xml/generate/xml4', config);

export const generateXml5Data = (config: XmlExportConfigDto) =>
  request.post<Xml5PrescriptionDto[]>('/insurance/xml/generate/xml5', config);

export const generateXml7Data = (config: XmlExportConfigDto) =>
  request.post<Xml7ReferralDto[]>('/insurance/xml/generate/xml7', config);

export const exportXml = (config: XmlExportConfigDto) =>
  request.post<XmlExportResultDto>('/insurance/xml/export', config);

export const exportExcel = (config: XmlExportConfigDto) =>
  request.post('/insurance/xml/export-excel', config, { responseType: 'blob' });

export const downloadXmlFile = (batchId: string) =>
  request.get(`/insurance/xml/download/${batchId}`, { responseType: 'blob' });

// #endregion

// #region 12.4 Kiểm tra và validate

export const validateClaim = (maLk: string) =>
  request.get<InsuranceValidationResultDto>(`/insurance/validate/${maLk}`);

export const validateClaimsBatch = (maLkList: string[]) =>
  request.post<InsuranceValidationResultDto[]>('/insurance/validate/batch', maLkList);

export const validateBeforeExport = (config: XmlExportConfigDto) =>
  request.post<InsuranceValidationResultDto[]>('/insurance/validate/before-export', config);

export const validateBhytPrescription = (prescriptionId: string) =>
  request.get<{ errorCode: string; medicineCode: string; medicineName: string; message: string; isBlocking: boolean }[]>(`/insurance/validate/prescription/${prescriptionId}`);

export const validateBhytServiceOrder = (serviceOrderId: string) =>
  request.get<{ errorCode: string; serviceCode: string; serviceName: string; message: string; isBlocking: boolean }[]>(`/insurance/validate/service-order/${serviceOrderId}`);

export const checkCostCeiling = (maLk: string) =>
  request.get<{ maLk: string; totalCost: number; ceilingAmount: number; isExceeded: boolean; exceededAmount: number; violatedRules: string[] }>(`/insurance/check-cost-ceiling/${maLk}`);

// #endregion

// #region 12.5 Gửi dữ liệu lên cổng BHXH

export const submitToInsurancePortal = (dto: SubmitToInsurancePortalDto) =>
  request.post<SubmitResultDto>('/insurance/submit', dto);

export const checkSubmitStatus = (transactionId: string) =>
  request.get<SubmitStatusDto>(`/insurance/submit-status/${transactionId}`);

export const getInsuranceFeedback = (transactionId: string) =>
  request.get<InsuranceFeedbackDto>(`/insurance/feedback/${transactionId}`);

export const resubmitRejectedClaims = (maLkList: string[]) =>
  request.post<SubmitResultDto>('/insurance/resubmit', maLkList);

// #endregion

// #region 12.6 Đối soát và quyết toán

export const createSettlementBatch = (month: number, year: number) =>
  request.post<InsuranceSettlementBatchDto>('/insurance/settlement/create', { month, year });

export const getSettlementBatch = (batchId: string) =>
  request.get<InsuranceSettlementBatchDto>(`/insurance/settlement/${batchId}`);

export const getSettlementBatches = (year: number) =>
  request.get<InsuranceSettlementBatchDto[]>(`/insurance/settlement/list/${year}`);

export const importReconciliationResult = (batchId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<InsuranceReconciliationDto>(`/insurance/reconciliation/import/${batchId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getRejectedClaims = (batchId: string) =>
  request.get<RejectedClaimDto[]>(`/insurance/rejected-claims/${batchId}`);

export const processRejectedClaim = (maLk: string, dto: { action: number; notes?: string; updateData?: any }) =>
  request.post<boolean>(`/insurance/rejected-claims/${maLk}/process`, dto);

export const calculateReconciliationDifference = (batchId: string) =>
  request.get<{ batchId: string; hospitalAmount: number; insuranceAmount: number; differenceAmount: number; details: any[] }>(`/insurance/reconciliation/difference/${batchId}`);

// #endregion

// #region 12.7 Báo cáo BHYT

export const getMonthlyInsuranceReport = (month: number, year: number) =>
  request.get<MonthlyInsuranceReportDto>('/insurance/reports/monthly', { params: { month, year } });

export const getReportC79a = (month: number, year: number) =>
  request.get<ReportC79aDto>('/insurance/reports/c79a', { params: { month, year } });

export const getReport80a = (month: number, year: number) =>
  request.get<Report80aDto>('/insurance/reports/80a', { params: { month, year } });

export const exportReportC79aToExcel = (month: number, year: number) =>
  request.get('/insurance/reports/c79a/export', { params: { month, year }, responseType: 'blob' });

export const exportReport80aToExcel = (month: number, year: number) =>
  request.get('/insurance/reports/80a/export', { params: { month, year }, responseType: 'blob' });

export const getTreatmentTypeReport = (month: number, year: number) =>
  request.get<{ treatmentTypeCode: string; treatmentTypeName: string; visitCount: number; totalCost: number; insurancePaid: number; patientPaid: number }[]>('/insurance/reports/by-treatment-type', { params: { month, year } });

export const getTopDiseasesReport = (month: number, year: number, top = 20) =>
  request.get<DiseaseStatDto[]>('/insurance/reports/top-diseases', { params: { month, year, top } });

export const getTopMedicinesReport = (month: number, year: number, top = 20) =>
  request.get<MedicineStatDto[]>('/insurance/reports/top-medicines', { params: { month, year, top } });

export const getDepartmentReport = (month: number, year: number) =>
  request.get<{ departmentId: string; departmentCode: string; departmentName: string; visitCount: number; totalCost: number; insurancePaid: number; medicineCost: number; serviceCost: number }[]>('/insurance/reports/by-department', { params: { month, year } });

// #endregion

// #region 12.8 Quản lý danh mục BHYT

export const getServiceMappings = (keyword?: string) =>
  request.get<ServiceInsuranceMapDto[]>('/insurance/catalog/service-mappings', { params: { keyword } });

export const updateServiceMapping = (id: string, dto: ServiceInsuranceMapDto) =>
  request.put<ServiceInsuranceMapDto>(`/insurance/catalog/service-mappings/${id}`, dto);

export const getMedicineMappings = (keyword?: string) =>
  request.get<MedicineInsuranceMapDto[]>('/insurance/catalog/medicine-mappings', { params: { keyword } });

export const updateMedicineMapping = (id: string, dto: MedicineInsuranceMapDto) =>
  request.put<MedicineInsuranceMapDto>(`/insurance/catalog/medicine-mappings/${id}`, dto);

export const importMedicineCatalog = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ImportResultDto>('/insurance/catalog/import-medicines', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const importServiceCatalog = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<ImportResultDto>('/insurance/catalog/import-services', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const updateInsurancePrices = (dto: { id: string; batchCode: string; description: string; effectiveDate: string; quyetDinhSo: string; totalItems: number; updatedItems: number; status: number; createdAt: string; createdBy: string }) =>
  request.post('/insurance/catalog/update-prices', dto);

export const getValidIcdCodes = (keyword?: string) =>
  request.get<IcdInsuranceMapDto[]>('/insurance/catalog/valid-icd-codes', { params: { keyword } });

// #endregion

// #region 12.9 Cấu hình và thiết lập

export const getPortalConfig = () =>
  request.get<InsurancePortalConfigDto>('/insurance/config/portal');

export const updatePortalConfig = (config: InsurancePortalConfigDto) =>
  request.put<InsurancePortalConfigDto>('/insurance/config/portal', config);

export const testPortalConnection = () =>
  request.get<PortalConnectionTestResult>('/insurance/config/test-connection');

export const getFacilityInfo = () =>
  request.get<FacilityInfoDto>('/insurance/config/facility');

export const updateFacilityInfo = (dto: FacilityInfoDto) =>
  request.put<FacilityInfoDto>('/insurance/config/facility', dto);

// #endregion

// #region 12.10 Tiện ích

export const generateMaLk = (examinationId: string) =>
  request.post<string>(`/insurance/generate-malk/${examinationId}`);

export const calculateServiceInsuranceCost = (serviceId: string, insuranceNumber: string) =>
  request.get<InsuranceCostCalculationDto>('/insurance/calculate/service-cost', { params: { serviceId, insuranceNumber } });

export const calculateMedicineInsuranceCost = (medicineId: string, quantity: number, insuranceNumber: string) =>
  request.get<InsuranceCostCalculationDto>('/insurance/calculate/medicine-cost', { params: { medicineId, quantity, insuranceNumber } });

export const getInsurancePaymentRatio = (insuranceNumber: string, treatmentType: number) =>
  request.get<number>('/insurance/payment-ratio', { params: { insuranceNumber, treatmentType } });

export const checkReferralStatus = (insuranceNumber: string, facilityCode: string) =>
  request.get<ReferralCheckResult>('/insurance/check-referral', { params: { insuranceNumber, facilityCode } });

export const getInsuranceLogs = (maLk?: string, fromDate?: string, toDate?: string) =>
  request.get<InsuranceActivityLogDto[]>('/insurance/logs', { params: { maLk, fromDate, toDate } });

// #endregion
