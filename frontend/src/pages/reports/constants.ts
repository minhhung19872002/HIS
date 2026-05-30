/**
 * Constants cho Reports v1 — pure data (KHÔNG JSX, KHÔNG handler).
 * Extracted khỏi pages/Reports.tsx (K17 Batch 1).
 */

import type { Nc10ReportDef, ApiCategory } from './types';

/**
 * Report ID → API category + report type mapping.
 * 140 reports across 8 categories (A: Clinical · B: Inpatient · C: Pharmacy ·
 * D: CLS · E: Receipt · F: Quality · G: ICD · H: HR/Referral).
 *
 * Extracted khỏi pages/Reports.tsx (K17 Batch 4).
 */
export const reportApiMapping: Record<string, { apiCategory: ApiCategory; reportType: string }> = {
  // ==================== A. Kham benh (Clinical / OPD) ====================
  r9_1:   { apiCategory: 'finance',    reportType: 'OpdIpdCostByFee' },
  r9_7:   { apiCategory: 'statistics', reportType: 'ExaminationActivity' },
  r9_31:  { apiCategory: 'statistics', reportType: 'DailyPatientCount' },
  r9_53:  { apiCategory: 'statistics', reportType: 'ExaminationRegister' },
  r9_62:  { apiCategory: 'statistics', reportType: 'ServiceTimeAndWait' },
  r9_63_a: { apiCategory: 'finance',   reportType: 'ServiceRevenueDetail' },
  r9_83:  { apiCategory: 'statistics', reportType: 'ExaminationActivitySummary' },
  r9_89:  { apiCategory: 'statistics', reportType: 'ReceptionByRoom' },
  r9_90:  { apiCategory: 'statistics', reportType: 'ExaminationActivity2' },
  r9_103: { apiCategory: 'statistics', reportType: 'VisitAndAdmissionCount' },
  r9_105: { apiCategory: 'statistics', reportType: 'AvgExaminationTime' },
  r9_114: { apiCategory: 'statistics', reportType: 'ExaminationDiary' },
  r9_115: { apiCategory: 'statistics', reportType: 'ExaminationRegister2' },
  r9_125: { apiCategory: 'statistics', reportType: 'ClinicRoomStatistics' },
  r9_126: { apiCategory: 'statistics', reportType: 'ExaminationRegister3' },
  r9_130: { apiCategory: 'statistics', reportType: 'PatientWaitTimeDetail' },

  // ==================== B. Noi tru (Inpatient) ====================
  r9_6:   { apiCategory: 'statistics', reportType: 'DailyBriefingBedCapacity' },
  r9_13:  { apiCategory: 'statistics', reportType: 'CareLevelClassification' },
  r9_16:  { apiCategory: 'statistics', reportType: 'UndischargedPatients' },
  r9_21:  { apiCategory: 'statistics', reportType: 'DischargeByDeptTreatType' },
  r9_23:  { apiCategory: 'statistics', reportType: 'PatientsByRoom' },
  r9_34:  { apiCategory: 'statistics', reportType: 'AdmitTransferDischarge' },
  r9_44:  { apiCategory: 'statistics', reportType: 'ActiveInpatients' },
  r9_48:  { apiCategory: 'statistics', reportType: 'PatientsByWard' },
  r9_65:  { apiCategory: 'statistics', reportType: 'ActivePatientsByDept' },
  r9_70:  { apiCategory: 'statistics', reportType: 'DischargeByDept' },
  r9_72:  { apiCategory: 'statistics', reportType: 'InpatientTreatmentActivity' },
  r9_77:  { apiCategory: 'statistics', reportType: 'AdmissionDetailByDept' },
  r9_86:  { apiCategory: 'statistics', reportType: 'DischargeRegister' },
  r9_91:  { apiCategory: 'statistics', reportType: 'AdmissionRegister' },
  r9_96:  { apiCategory: 'statistics', reportType: 'TreatmentActivity2360' },
  r9_102: { apiCategory: 'statistics', reportType: 'TreatmentActivity' },
  r9_107: { apiCategory: 'statistics', reportType: 'TransferOutPatients' },
  r9_108: { apiCategory: 'statistics', reportType: 'PresentPatientsByDept' },
  r9_109: { apiCategory: 'statistics', reportType: 'AdmissionByDept' },
  r9_118: { apiCategory: 'statistics', reportType: 'UnfinishedTreatment' },
  r9_122: { apiCategory: 'statistics', reportType: 'TreatmentActivity2' },
  r9_127: { apiCategory: 'statistics', reportType: 'BedServiceByDept' },
  r9_128: { apiCategory: 'statistics', reportType: 'TreatmentCompletionByDept' },
  r9_129: { apiCategory: 'statistics', reportType: 'AdmissionByDept2' },

  // ==================== C. Tai chinh (Finance) ====================
  r9_2:   { apiCategory: 'finance', reportType: 'CashierSummary' },
  r9_14:  { apiCategory: 'finance', reportType: 'HospitalFeeServiceDetail' },
  r9_24:  { apiCategory: 'finance', reportType: 'DeptRevenueServiceDetail' },
  r9_37:  { apiCategory: 'finance', reportType: 'CashBookUsageDetail' },
  r9_42:  { apiCategory: 'finance', reportType: 'HospitalFeeSummary' },
  r9_46:  { apiCategory: 'finance', reportType: 'RevenueByServiceType' },
  r9_50:  { apiCategory: 'finance', reportType: 'OtherPayerPatients' },
  r9_57:  { apiCategory: 'finance', reportType: 'RevenueByOrderingDept' },
  r9_63_c: { apiCategory: 'finance', reportType: 'ServiceRevenueDetailKCB' },
  r9_68:  { apiCategory: 'finance', reportType: 'CancelledTransactionsSummary' },
  r9_71:  { apiCategory: 'finance', reportType: 'DeptRoomRevenue' },
  r9_78:  { apiCategory: 'finance', reportType: 'ApprovedExcessDeficit' },
  r9_85:  { apiCategory: 'finance', reportType: 'PatientRevenueByDept' },
  r9_92:  { apiCategory: 'finance', reportType: 'UnapprovedFinanceClose' },
  r9_98:  { apiCategory: 'finance', reportType: 'HospitalRevenueDetail' },
  r9_100: { apiCategory: 'finance', reportType: 'AutoSurgeryBonus' },
  r9_111: { apiCategory: 'finance', reportType: 'SurgeryProfitLoss' },
  r9_112: { apiCategory: 'finance', reportType: 'OutpatientRevenueSummary' },
  r9_116: { apiCategory: 'finance', reportType: 'DeptRevenueDetail' },
  r9_117: { apiCategory: 'finance', reportType: 'CancelledTransactionDetail' },
  r9_123: { apiCategory: 'finance', reportType: 'FundUsageSummary' },
  r9_132: { apiCategory: 'finance', reportType: 'CashCollectionDetail' },
  r9_135: { apiCategory: 'finance', reportType: 'RevenueByOrderingDept2' },
  r9_136: { apiCategory: 'finance', reportType: 'RevenueByService' },
  r9_138: { apiCategory: 'finance', reportType: 'DischargePayment' },

  // ==================== D. Duoc / Kho (Pharmacy / Warehouse) ====================
  r9_4:   { apiCategory: 'pharmacy', reportType: 'StockMovementByWarehouse' },
  r9_8:   { apiCategory: 'pharmacy', reportType: 'PharmacyProfit' },
  r9_9:   { apiCategory: 'pharmacy', reportType: 'EmergencyCabinetNXT' },
  r9_15:  { apiCategory: 'pharmacy', reportType: 'IssueToDepByWarehouse' },
  r9_28:  { apiCategory: 'pharmacy', reportType: 'StockMovement' },
  r9_45:  { apiCategory: 'pharmacy', reportType: 'DeptDispensingSheet' },
  r9_47:  { apiCategory: 'pharmacy', reportType: 'RetailSaleRevenue' },
  r9_54:  { apiCategory: 'pharmacy', reportType: 'ProcurementImport' },
  r9_67:  { apiCategory: 'pharmacy', reportType: 'ProcurementVsStock' },
  r9_69:  { apiCategory: 'pharmacy', reportType: 'IssueToDept' },
  r9_76:  { apiCategory: 'pharmacy', reportType: 'PrescriptionByDoctor' },
  r9_79:  { apiCategory: 'pharmacy', reportType: 'DeptConsumableIssue' },
  r9_80:  { apiCategory: 'pharmacy', reportType: 'StockMovementAllWH' },
  r9_84:  { apiCategory: 'pharmacy', reportType: 'StockCardDetail' },
  r9_87:  { apiCategory: 'pharmacy', reportType: 'IssueByPatientType' },
  r9_93:  { apiCategory: 'pharmacy', reportType: 'StockMovementDetail' },
  r9_99:  { apiCategory: 'pharmacy', reportType: 'ImportInvoiceSheet' },
  r9_101: { apiCategory: 'pharmacy', reportType: 'IssueByDeptDetail' },
  r9_106: { apiCategory: 'pharmacy', reportType: 'IssuedQtyByDept' },
  r9_119: { apiCategory: 'pharmacy', reportType: 'IssueToDept2' },
  r9_120: { apiCategory: 'pharmacy', reportType: 'ImportBySupplier' },
  r9_137: { apiCategory: 'pharmacy', reportType: 'PrescriptionIssueByType' },
  r9_139: { apiCategory: 'pharmacy', reportType: 'RetailSaleDetail' },
  r9_140: { apiCategory: 'pharmacy', reportType: 'PrescriptionIssueByPatient' },

  // ==================== E. CLS (Lab / Imaging) ====================
  r9_3:   { apiCategory: 'statistics', reportType: 'ParaclinicalBriefing' },
  r9_5:   { apiCategory: 'statistics', reportType: 'ParaclinicalActivitySummary' },
  r9_19:  { apiCategory: 'statistics', reportType: 'MicrobiologyRegister' },
  r9_20:  { apiCategory: 'statistics', reportType: 'LabRegister' },
  r9_22:  { apiCategory: 'statistics', reportType: 'UltrasoundRegister' },
  r9_25:  { apiCategory: 'statistics', reportType: 'EndoscopyRegister' },
  r9_30:  { apiCategory: 'statistics', reportType: 'LabWithIndexRegister' },
  r9_38:  { apiCategory: 'statistics', reportType: 'ParaclinicalRegister' },
  r9_39:  { apiCategory: 'statistics', reportType: 'ImagingRegister' },
  r9_51:  { apiCategory: 'statistics', reportType: 'LabRegister2' },
  r9_55:  { apiCategory: 'statistics', reportType: 'FunctionalTestRegister' },
  r9_64:  { apiCategory: 'statistics', reportType: 'ParaclinicalDeptSummary' },
  r9_94:  { apiCategory: 'statistics', reportType: 'ImagingFilmStatistics' },
  r9_95:  { apiCategory: 'finance',    reportType: 'ImagingRevenue' },
  r9_97:  { apiCategory: 'statistics', reportType: 'UltrasoundByRoom' },
  r9_110: { apiCategory: 'statistics', reportType: 'DoctorByMachine' },
  r9_113: { apiCategory: 'statistics', reportType: 'OrderedVsPerformedCLS' },
  r9_121: { apiCategory: 'statistics', reportType: 'MicrobiologyOrder' },
  r9_134: { apiCategory: 'statistics', reportType: 'ParaclinicalTracking' },

  // ==================== F. PTTT (Surgery) ====================
  r9_10:  { apiCategory: 'statistics', reportType: 'ProcedureRegister' },
  r9_18:  { apiCategory: 'statistics', reportType: 'SurgeryRegister' },
  r9_35:  { apiCategory: 'statistics', reportType: 'InpatientProcedureRegister' },
  r9_40:  { apiCategory: 'finance',    reportType: 'ORCost' },
  r9_56:  { apiCategory: 'statistics', reportType: 'ProcedureByDept' },
  r9_66:  { apiCategory: 'statistics', reportType: 'SurgeryPatientList' },
  r9_73:  { apiCategory: 'statistics', reportType: 'SurgeryProcedure' },
  r9_75:  { apiCategory: 'statistics', reportType: 'ProcedureRegister2' },
  r9_81:  { apiCategory: 'statistics', reportType: 'SurgeryList' },
  r9_82:  { apiCategory: 'statistics', reportType: 'SurgeryProcedureActivity' },
  r9_88:  { apiCategory: 'finance',    reportType: 'SurgeryPathologyBonus' },

  // ==================== G. BHYT (Insurance) ====================
  r9_11:  { apiCategory: 'finance',    reportType: 'C80aNew' },
  r9_17:  { apiCategory: 'statistics', reportType: 'ScheduledPatients' },
  r9_26:  { apiCategory: 'finance',    reportType: 'UnapprovedDischargeSettlement' },
  r9_29:  { apiCategory: 'finance',    reportType: 'Form79QD3360' },
  r9_32:  { apiCategory: 'finance',    reportType: 'InsuranceServiceForm21' },
  r9_33:  { apiCategory: 'finance',    reportType: 'InsuranceSupplyForm19' },
  r9_36:  { apiCategory: 'statistics', reportType: 'ReferralPatients' },
  r9_41:  { apiCategory: 'statistics', reportType: 'ExternalBloodRegister' },
  r9_43:  { apiCategory: 'finance',    reportType: 'C79aNew' },
  r9_49:  { apiCategory: 'finance',    reportType: 'Form80QD3360' },
  r9_52:  { apiCategory: 'statistics', reportType: 'InboundReferralPatients' },
  r9_58:  { apiCategory: 'finance',    reportType: 'InternalDataAudit' },
  r9_59:  { apiCategory: 'statistics', reportType: 'DiseaseAndDeathICD10' },
  r9_60:  { apiCategory: 'finance',    reportType: 'InsuranceMedicineForm20' },
  r9_61:  { apiCategory: 'finance',    reportType: 'InsurancePaymentRequest' },
  r9_74:  { apiCategory: 'statistics', reportType: 'NutritionMealPortion' },
  r9_104: { apiCategory: 'finance',    reportType: 'InsuranceDetail' },
  r9_124: { apiCategory: 'statistics', reportType: 'ForeignNationalPatients' },
  r9_131: { apiCategory: 'statistics', reportType: 'MedicalRecordArchive' },
  r9_133: { apiCategory: 'statistics', reportType: 'ICDCV2360Statistics' },

  // ==================== H. Nhan su / Chuyen tuyen (HR / Referral) ====================
  r9_12:  { apiCategory: 'statistics', reportType: 'OutboundReferralSummary' },
  r9_27:  { apiCategory: 'statistics', reportType: 'DialysisMachineUsage' },
};

/** Department value-to-ID mapping for API calls. */
export const departmentIdMap: Record<string, string | undefined> = {
  all: undefined,
  noi: 'noi',
  ngoai: 'ngoai',
  san: 'san',
  nhi: 'nhi',
  xn: 'xn',
  cdha: 'cdha',
  duoc: 'duoc',
  cap_cuu: 'cap_cuu',
  hscc: 'hscc',
  phcn: 'phcn',
  tmh: 'tmh',
  mat: 'mat',
  rhm: 'rhm',
  da_lieu: 'da_lieu',
};

/** Data source options cho NangCap4 dynamic report builder. */
export const DATA_SOURCES = [
  { value: 'patients', label: 'Bệnh nhân', fields: ['patientCode', 'fullName', 'dateOfBirth', 'gender', 'phoneNumber', 'address', 'insuranceNumber', 'patientType'] },
  { value: 'examinations', label: 'Khám bệnh', fields: ['examDate', 'patientName', 'doctorName', 'departmentName', 'mainIcdCode', 'mainIcdName', 'status', 'queueNumber'] },
  { value: 'prescriptions', label: 'Đơn thuốc', fields: ['prescriptionDate', 'patientName', 'doctorName', 'medicineName', 'dosage', 'quantity', 'unit', 'totalAmount'] },
  { value: 'labRequests', label: 'Xét nghiệm', fields: ['requestDate', 'patientName', 'testName', 'result', 'unit', 'referenceRange', 'abnormalFlag', 'status'] },
  { value: 'admissions', label: 'Nội trú', fields: ['admissionDate', 'patientName', 'departmentName', 'bedNumber', 'diagnosisName', 'attendingDoctor', 'status', 'dischargeDate'] },
  { value: 'billing', label: 'Thu ngân', fields: ['receiptDate', 'patientName', 'totalAmount', 'paidAmount', 'discountAmount', 'insuranceCovered', 'paymentMethod', 'status'] },
  { value: 'pharmacy', label: 'Dược', fields: ['medicineName', 'batchNumber', 'expiryDate', 'stockQuantity', 'unit', 'unitPrice', 'supplier', 'warehouseName'] },
  { value: 'services', label: 'Dịch vụ', fields: ['serviceCode', 'serviceName', 'departmentName', 'price', 'insurancePrice', 'category', 'isActive'] },
];

/** Filter operator options. */
export const OPERATORS = [
  { value: 'eq', label: '=' }, { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' }, { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' },
  { value: 'contains', label: 'Chứa' }, { value: 'startsWith', label: 'Bắt đầu' },
];

/** Cell render format options. */
export const FORMATS: { value: string; label: string }[] = [
  { value: 'text', label: 'Văn bản' }, { value: 'number', label: 'Số' },
  { value: 'currency', label: 'Tiền tệ (VNĐ)' }, { value: 'date', label: 'Ngày (DD/MM/YYYY)' },
  { value: 'datetime', label: 'Ngày giờ' }, { value: 'percent', label: 'Phần trăm (%)' },
];

/** localStorage key cho custom report definitions. */
export const STORAGE_KEY = 'his_custom_reports';

/** NangCap10 Tab 1 — BHYT Cost Reports (10 reports, items 376-385). */
export const bhytCostReports: Nc10ReportDef[] = [
  { id: 'bhyt-16', name: '16/BHYT - DM thuoc che pham YHCT thanh toan BHYT', description: 'Danh muc thuoc che pham y hoc co truyen duoc BHYT thanh toan' },
  { id: 'bhyt-17', name: '17/BHYT - DM vi thuoc YHCT thanh toan BHYT', description: 'Danh muc vi thuoc y hoc co truyen duoc BHYT thanh toan' },
  { id: 'bhyt-18', name: '18/BHYT - Thong ke DV KT su dung thuoc phong xa', description: 'Thong ke dich vu ky thuat su dung thuoc phong xa va hop chat danh dau' },
  { id: 'bhyt-19', name: '19/BHYT - Thong ke tong hop VTYT duoc BHYT thanh toan', description: 'Thong ke tong hop vat tu y te duoc BHYT thanh toan theo ky' },
  { id: 'bhyt-20', name: '20/BHYT - Thong ke tong hop thuoc su dung cho BN BHYT', description: 'Thong ke tong hop thuoc su dung cho benh nhan BHYT theo ky bao cao' },
  { id: 'bhyt-21', name: '21/BHYT - Thong ke tong hop DVKT su dung cho BN BHYT', description: 'Thong ke tong hop dich vu ky thuat su dung cho benh nhan BHYT' },
  { id: 'bhyt-c79a', name: 'C79a-HD - DS BN BHYT KCB ngoai tru de nghi thanh toan', description: 'Danh sach benh nhan BHYT kham chua benh ngoai tru de nghi co quan BHXH thanh toan' },
  { id: 'bhyt-c80a', name: 'C80a-HD - DS BN BHYT KCB noi tru de nghi thanh toan', description: 'Danh sach benh nhan BHYT kham chua benh noi tru de nghi co quan BHXH thanh toan' },
  { id: 'bhyt-c79b-c80b', name: 'C79B-HD va C80B-HD', description: 'Bieu mau C79B va C80B tong hop chi phi KCB BHYT ngoai tru va noi tru' },
  { id: 'bhyt-21-cv285', name: '21/BHYT theo CV 285 BHXH', description: 'Thong ke tong hop DVKT theo cong van 285/BHXH-CSYT' },
];

/** NangCap10 Tab 2 — Administrative & CLS Reports (18 reports, items 386-403). */
export const adminClsReports: Nc10ReportDef[] = [
  { id: 'admin-so-kham', name: 'So kham benh (chung, chuyen khoa, ngoai tru)', description: 'So kham benh tong hop: kham chung, kham chuyen khoa va kham ngoai tru' },
  { id: 'admin-so-vao-ra', name: 'So vao vien, ra vien, chuyen vien', description: 'So theo doi benh nhan vao vien, ra vien va chuyen vien' },
  { id: 'admin-so-pt', name: 'So phau thuat', description: 'So theo doi cac ca phau thuat da thuc hien' },
  { id: 'admin-so-tt', name: 'So thu thuat', description: 'So theo doi cac thu thuat da thuc hien' },
  { id: 'admin-so-xn', name: 'So xet nghiem', description: 'So xet nghiem tong hop tat ca cac loai' },
  { id: 'admin-so-xn-tb', name: 'So xet nghiem te bao mau ngoai vi', description: 'So xet nghiem te bao mau ngoai vi (huyet do)' },
  { id: 'admin-so-cdha', name: 'So chan doan hinh anh', description: 'So theo doi chan doan hinh anh (X-quang, CT, MRI, sieu am)' },
  { id: 'admin-so-ns', name: 'So noi soi', description: 'So theo doi cac thu thuat noi soi' },
  { id: 'admin-so-vs', name: 'So xet nghiem vi sinh', description: 'So xet nghiem vi sinh (cay, KSĐ, nhuan sac)' },
  { id: 'admin-luu-hsba', name: 'So luu tru ho so benh an', description: 'So luu tru ho so benh an da hoan thanh dieu tri' },
  { id: 'admin-luu-hsba-tv', name: 'So luu tru ho so benh an tu vong', description: 'So luu tru ho so benh an cac ca tu vong' },
  { id: 'admin-th-thuoc', name: 'So tong hop thuoc hang ngay', description: 'So tong hop thuoc su dung hang ngay toan vien' },
  { id: 'admin-bc-icd10', name: 'BC tinh hinh benh tat tu vong theo ICD10', description: 'Bao cao tinh hinh benh tat va tu vong phan loai theo ma ICD-10' },
  { id: 'admin-bc-kham', name: 'BC hoat dong kham benh', description: 'Bao cao tong hop hoat dong kham benh theo ky' },
  { id: 'admin-bc-dt', name: 'BC hoat dong dieu tri', description: 'Bao cao tong hop hoat dong dieu tri noi tru' },
  { id: 'admin-bc-pttt', name: 'BC hoat dong phau thuat, thu thuat', description: 'Bao cao tong hop hoat dong phau thuat va thu thuat' },
  { id: 'admin-bc-cls', name: 'BC hoat dong Can Lam Sang', description: 'Bao cao hoat dong can lam sang (xet nghiem, CDHA, TDCN)' },
  { id: 'admin-bc-tntt', name: 'BC tai nan thuong tich', description: 'Bao cao thong ke tai nan thuong tich theo nguyen nhan va muc do' },
];

/** NangCap10 Tab 3 — Pharmacy Reports (12 reports, items 404-415). */
export const pharmacyExtReports: Nc10ReportDef[] = [
  { id: 'pharma-the-kho', name: 'The kho', description: 'The kho theo doi xuat nhap ton tung mat hang theo lo/han' },
  { id: 'pharma-bc-cong-tac', name: 'BC cong tac duoc benh vien', description: 'Bao cao tong hop cong tac duoc benh vien theo ky' },
  { id: 'pharma-bc-sd-thuoc', name: 'BC su dung thuoc', description: 'Bao cao tinh hinh su dung thuoc toan vien' },
  { id: 'pharma-bc-ks', name: 'BC su dung khang sinh', description: 'Bao cao tinh hinh su dung khang sinh (theo DDD, theo khoa)' },
  { id: 'pharma-bc-hc', name: 'BC su dung hoa chat', description: 'Bao cao tinh hinh su dung hoa chat xet nghiem' },
  { id: 'pharma-bc-vtyt', name: 'BC su dung vat tu y te tieu hao', description: 'Bao cao tinh hinh su dung vat tu y te tieu hao theo khoa' },
  { id: 'pharma-kk-thuoc', name: 'Bien ban kiem ke thuoc', description: 'Bien ban kiem ke thuoc dinh ky tai kho/tu truc' },
  { id: 'pharma-kk-hc', name: 'Bien ban kiem ke hoa chat', description: 'Bien ban kiem ke hoa chat xet nghiem' },
  { id: 'pharma-kk-vtyt', name: 'Bien ban kiem ke vat tu y te tieu hao', description: 'Bien ban kiem ke vat tu y te tieu hao' },
  { id: 'pharma-mat-hong', name: 'BB xac nhan thuoc/hoa chat/VTYT mat/hong/vo', description: 'Bien ban xac nhan thuoc, hoa chat, VTYT bi mat, hong hoac vo' },
  { id: 'pharma-thanh-ly', name: 'BB thanh ly thuoc', description: 'Bien ban thanh ly thuoc het han su dung hoac khong dat chat luong' },
  { id: 'pharma-kiem-nhap', name: 'So kiem nhap thuoc/hoa chat/VTYT tieu hao', description: 'So kiem nhap thuoc, hoa chat, VTYT tieu hao khi nhap kho' },
];
