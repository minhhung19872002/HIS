import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  message,
  Tabs,
  DatePicker,
  Select,
  Divider,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  Statistic,
  Alert,
  Badge,
  Tooltip,
} from 'antd';
import {
  PrinterOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  EyeOutlined,
  AuditOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  SwapOutlined,
  TeamOutlined,
  ShopOutlined,
  ReconciliationOutlined,
  FileSearchOutlined,
  AccountBookOutlined,
  ScissorOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { financeApi, pharmacyReportApi, statisticsApi } from '../api/system';
import type {
  FinancialReportRequest,
  PharmacyReportRequest,
  StatisticsReportRequest,
} from '../api/system';
import { reconciliationApi } from '../api/reconciliation';
import type {
  SupplierProcurementItemDto,
  RevenueByRecordItemDto,
  DeptCostVsFeesItemDto,
  RecordCostSummaryItemDto,
  FeesVsStandardsItemDto,
  ServiceOrderDoctorsItemDto,
  DispensingVsBillingItemDto,
  DispensingVsStandardsItemDto,
} from '../api/reconciliation';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Search } = Input;

// ============================================================================
// Report Configuration Types
// ============================================================================

interface ReportConfig {
  /** Unique report ID - used for API mapping and state */
  id: string;
  /** Report reference code (e.g. "9.1", "9.7") */
  code: string;
  /** Vietnamese report name */
  name: string;
  /** Short description */
  description: string;
}

interface ReportCategoryConfig {
  title: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportConfig[];
}

// ============================================================================
// API Mapping
// ============================================================================

type ApiCategory = 'finance' | 'pharmacy' | 'statistics';

const reportApiMapping: Record<string, { apiCategory: ApiCategory; reportType: string }> = {
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

// Department value-to-ID mapping for API calls
const departmentIdMap: Record<string, string | undefined> = {
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

// ============================================================================
// 140 Reports in 8 Categories (A-H) per BV
// ============================================================================

const reportCategories: Record<string, ReportCategoryConfig> = {
  // ----------------------------------------------------------------
  // A. Bao cao Kham benh (Clinical / OPD) - 16 reports
  // ----------------------------------------------------------------
  clinical: {
    title: 'A. Khám bệnh',
    icon: <BarChartOutlined />,
    color: '#1890ff',
    reports: [
      { id: 'r9_1',   code: '9.1',  name: 'Chi phí KCB thu phí nội ngoại trú', description: 'Tổng hợp chi phí KCB thu phí nội trú và ngoại trú' },
      { id: 'r9_7',   code: '9.7',  name: 'Hoạt động khám bệnh', description: 'Báo cáo hoạt động khám bệnh tổng hợp' },
      { id: 'r9_31',  code: '9.31', name: 'Thống kê số lượt BN khám trong ngày', description: 'Số lượt bệnh nhân khám theo ngày' },
      { id: 'r9_53',  code: '9.53', name: 'Sổ khám bệnh', description: 'Sổ theo dõi khám bệnh' },
      { id: 'r9_62',  code: '9.62', name: 'Thời gian thực hiện DV và thời gian chờ', description: 'Thống kê thời gian thực hiện dịch vụ và thời gian chờ đợi' },
      { id: 'r9_63_a', code: '9.63', name: 'Chi tiết doanh thu từng DV KCB', description: 'Chi tiết doanh thu từng dịch vụ khám chữa bệnh' },
      { id: 'r9_83',  code: '9.83', name: 'Thống kê hoạt động khám bệnh', description: 'Báo cáo thống kê hoạt động khám bệnh chi tiết' },
      { id: 'r9_89',  code: '9.89', name: 'Tổng hợp BN tiếp đón theo phòng', description: 'Tổng hợp bệnh nhân tiếp đón theo từng phòng khám' },
      { id: 'r9_90',  code: '9.90', name: 'Hoạt động khám bệnh', description: 'Báo cáo hoạt động khám bệnh (mẫu 2)' },
      { id: 'r9_103', code: '9.103', name: 'Lượt khám, lượt nhập viện', description: 'Thống kê lượt khám và lượt nhập viện' },
      { id: 'r9_105', code: '9.105', name: 'Thời gian khám bệnh trung bình', description: 'Thống kê thời gian khám bệnh trung bình theo phòng' },
      { id: 'r9_114', code: '9.114', name: 'Sổ nhật ký khám bệnh', description: 'Sổ nhật ký khám bệnh hàng ngày' },
      { id: 'r9_115', code: '9.115', name: 'Sổ khám bệnh', description: 'Sổ khám bệnh (mẫu 2)' },
      { id: 'r9_125', code: '9.125', name: 'Thống kê số liệu phòng khám', description: 'Thống kê số liệu chi tiết từng phòng khám' },
      { id: 'r9_126', code: '9.126', name: 'Sổ khám bệnh', description: 'Sổ khám bệnh (mẫu 3)' },
      { id: 'r9_130', code: '9.130', name: 'Chi tiết thời gian BN chờ đợi', description: 'Chi tiết thời gian bệnh nhân chờ đợi từng bước' },
    ],
  },

  // ----------------------------------------------------------------
  // B. Bao cao Noi tru (Inpatient) - 24 reports
  // ----------------------------------------------------------------
  inpatient: {
    title: 'B. Nội trú',
    icon: <HomeOutlined />,
    color: '#722ed1',
    reports: [
      { id: 'r9_6',   code: '9.6',  name: 'Giao ban - Công suất giường', description: 'Báo cáo giao ban và công suất sử dụng giường bệnh' },
      { id: 'r9_13',  code: '9.13', name: 'Phân cấp chăm sóc', description: 'Thống kê phân cấp chăm sóc bệnh nhân nội trú' },
      { id: 'r9_16',  code: '9.16', name: 'DS BN chưa ra viện', description: 'Danh sách bệnh nhân chưa ra viện' },
      { id: 'r9_21',  code: '9.21', name: 'Sổ ra viện theo khoa (Diện ĐT)', description: 'Sổ ra viện theo khoa phân theo diện điều trị' },
      { id: 'r9_23',  code: '9.23', name: 'DS BN tại các buồng', description: 'Danh sách bệnh nhân tại các buồng bệnh' },
      { id: 'r9_34',  code: '9.34', name: 'Sổ vào viện, chuyển viện, ra viện', description: 'Sổ theo dõi vào viện, chuyển viện và ra viện' },
      { id: 'r9_44',  code: '9.44', name: 'DS BN đang điều trị', description: 'Danh sách bệnh nhân đang điều trị nội trú' },
      { id: 'r9_48',  code: '9.48', name: 'DS BN tại buồng bệnh', description: 'Danh sách bệnh nhân tại từng buồng bệnh' },
      { id: 'r9_65',  code: '9.65', name: 'DS BN đang điều trị tại khoa', description: 'Danh sách bệnh nhân đang điều trị tại từng khoa' },
      { id: 'r9_70',  code: '9.70', name: 'Sổ ra viện theo khoa', description: 'Sổ ra viện theo từng khoa điều trị' },
      { id: 'r9_72',  code: '9.72', name: 'Hoạt động điều trị nội trú', description: 'Báo cáo hoạt động điều trị nội trú tổng hợp' },
      { id: 'r9_77',  code: '9.77', name: 'Chi tiết BN vào ĐT tại các khoa', description: 'Chi tiết bệnh nhân vào điều trị tại các khoa' },
      { id: 'r9_86',  code: '9.86', name: 'Sổ ra viện', description: 'Sổ ra viện tổng hợp toàn viện' },
      { id: 'r9_91',  code: '9.91', name: 'Sổ vào viện', description: 'Sổ vào viện tổng hợp toàn viện' },
      { id: 'r9_96',  code: '9.96', name: 'Hoạt động điều trị mẫu 03 QĐ 2360', description: 'Báo cáo hoạt động điều trị theo mẫu 03 QĐ 2360/QĐ-BYT' },
      { id: 'r9_102', code: '9.102', name: 'Hoạt động điều trị', description: 'Báo cáo hoạt động điều trị tổng hợp' },
      { id: 'r9_107', code: '9.107', name: 'DS BN chuyển đi khoa khác', description: 'Danh sách bệnh nhân chuyển đi khoa khác' },
      { id: 'r9_108', code: '9.108', name: 'DS BN hiện diện tại khoa', description: 'Danh sách bệnh nhân hiện diện tại khoa' },
      { id: 'r9_109', code: '9.109', name: 'Sổ vào viện theo khoa', description: 'Sổ vào viện theo từng khoa tiếp nhận' },
      { id: 'r9_118', code: '9.118', name: 'DS BN chưa kết thúc ĐT', description: 'Danh sách bệnh nhân chưa kết thúc điều trị' },
      { id: 'r9_122', code: '9.122', name: 'Hoạt động điều trị', description: 'Báo cáo hoạt động điều trị (mẫu 2)' },
      { id: 'r9_127', code: '9.127', name: 'Thống kê DV giường các khoa', description: 'Thống kê dịch vụ giường bệnh các khoa' },
      { id: 'r9_128', code: '9.128', name: 'Tổng hợp SL kết thúc ĐT các khoa', description: 'Tổng hợp số lượng kết thúc điều trị các khoa' },
      { id: 'r9_129', code: '9.129', name: 'Số vào viện theo khoa', description: 'Thống kê số vào viện theo từng khoa' },
    ],
  },

  // ----------------------------------------------------------------
  // C. Bao cao Tai chinh (Finance) - 25 reports
  // ----------------------------------------------------------------
  finance: {
    title: 'C. Tài chính',
    icon: <DollarOutlined />,
    color: '#faad14',
    reports: [
      { id: 'r9_2',   code: '9.2',  name: 'Tổng hợp thu chi theo thu ngân', description: 'Tổng hợp thu chi theo từng thu ngân viên' },
      { id: 'r9_14',  code: '9.14', name: 'Sổ thanh toán VP (chi tiết từng DV)', description: 'Sổ thanh toán viện phí chi tiết từng dịch vụ' },
      { id: 'r9_24',  code: '9.24', name: 'Doanh thu khoa chi tiết theo DV', description: 'Doanh thu khoa phòng chi tiết theo dịch vụ' },
      { id: 'r9_37',  code: '9.37', name: 'Chi tiết sử dụng sổ thu chi', description: 'Chi tiết sử dụng sổ thu chi theo phiếu' },
      { id: 'r9_42',  code: '9.42', name: 'Tổng hợp viện phí', description: 'Tổng hợp viện phí toàn viện' },
      { id: 'r9_46',  code: '9.46', name: 'Doanh thu theo loại DV', description: 'Doanh thu theo từng loại dịch vụ' },
      { id: 'r9_50',  code: '9.50', name: 'DS BN nguồn khác chi trả', description: 'Danh sách bệnh nhân có nguồn khác chi trả' },
      { id: 'r9_57',  code: '9.57', name: 'Tổng hợp doanh thu theo khoa chỉ định', description: 'Tổng hợp doanh thu theo khoa chỉ định dịch vụ' },
      { id: 'r9_63_c', code: '9.63', name: 'Chi tiết doanh thu DV KCB', description: 'Chi tiết doanh thu dịch vụ KCB (mẫu tài chính)' },
      { id: 'r9_68',  code: '9.68', name: 'Tổng hợp giao dịch bị hủy', description: 'Tổng hợp các giao dịch thanh toán bị hủy' },
      { id: 'r9_71',  code: '9.71', name: 'Doanh thu khoa phòng', description: 'Doanh thu theo khoa phòng tổng hợp' },
      { id: 'r9_78',  code: '9.78', name: 'DS BN đã duyệt khóa VP thừa/thiếu', description: 'Danh sách BN đã duyệt khóa viện phí có thừa hoặc thiếu' },
      { id: 'r9_85',  code: '9.85', name: 'Chi tiết doanh thu BN theo khoa', description: 'Chi tiết doanh thu bệnh nhân theo từng khoa' },
      { id: 'r9_92',  code: '9.92', name: 'DS BN kết thúc ĐT chưa duyệt khóa TC', description: 'DS BN kết thúc điều trị chưa duyệt khóa tài chính' },
      { id: 'r9_98',  code: '9.98', name: 'Chi tiết doanh thu toàn viện', description: 'Chi tiết doanh thu toàn viện theo dịch vụ' },
      { id: 'r9_100', code: '9.100', name: 'Bồi dưỡng PTTT tự động', description: 'Tính bồi dưỡng phẫu thuật thủ thuật tự động' },
      { id: 'r9_111', code: '9.111', name: 'Hạch toán lỗ lãi PTTT', description: 'Hạch toán lỗ lãi phẫu thuật thủ thuật' },
      { id: 'r9_112', code: '9.112', name: 'Tổng hợp DT đối tượng ngoại trú', description: 'Tổng hợp doanh thu đối tượng ngoại trú' },
      { id: 'r9_116', code: '9.116', name: 'Doanh thu khoa chi tiết', description: 'Doanh thu khoa phòng chi tiết theo dịch vụ' },
      { id: 'r9_117', code: '9.117', name: 'Chi tiết giao dịch thanh toán bị hủy', description: 'Chi tiết từng giao dịch thanh toán bị hủy' },
      { id: 'r9_123', code: '9.123', name: 'Tổng hợp sử dụng quỹ', description: 'Tổng hợp tình hình sử dụng quỹ' },
      { id: 'r9_132', code: '9.132', name: 'Thu tiền chi tiết', description: 'Chi tiết thu tiền theo phiếu thu' },
      { id: 'r9_135', code: '9.135', name: 'Thu chi theo khoa chỉ định', description: 'Thu chi theo khoa chỉ định dịch vụ' },
      { id: 'r9_136', code: '9.136', name: 'Doanh thu theo dịch vụ', description: 'Doanh thu theo từng dịch vụ cụ thể' },
      { id: 'r9_138', code: '9.138', name: 'Thanh toán VP BN ra viện', description: 'Thanh toán viện phí bệnh nhân ra viện' },
    ],
  },

  // ----------------------------------------------------------------
  // D. Bao cao Duoc/Kho (Pharmacy / Warehouse) - 24 reports
  // ----------------------------------------------------------------
  pharmacy: {
    title: 'D. Dược / Kho',
    icon: <MedicineBoxOutlined />,
    color: '#52c41a',
    reports: [
      { id: 'r9_4',   code: '9.4',  name: 'Chi tiết NXT theo kho', description: 'Chi tiết nhập xuất tồn theo từng kho' },
      { id: 'r9_8',   code: '9.8',  name: 'Lợi nhuận nhà thuốc', description: 'Báo cáo lợi nhuận nhà thuốc bệnh viện' },
      { id: 'r9_9',   code: '9.9',  name: 'NXT tủ trực', description: 'Nhập xuất tồn tủ trực các khoa' },
      { id: 'r9_15',  code: '9.15', name: 'Chi tiết xuất cho khoa theo kho', description: 'Chi tiết xuất thuốc/VT cho khoa theo từng kho' },
      { id: 'r9_28',  code: '9.28', name: 'NXT kho', description: 'Nhập xuất tồn kho tổng hợp' },
      { id: 'r9_45',  code: '9.45', name: 'Bảng kê cấp phát thuốc VT HC khoa', description: 'Bảng kê cấp phát thuốc, vật tư, hóa chất theo khoa' },
      { id: 'r9_47',  code: '9.47', name: 'Chi tiết xuất bán, doanh thu nhà thuốc', description: 'Chi tiết xuất bán và doanh thu nhà thuốc' },
      { id: 'r9_54',  code: '9.54', name: 'Nhập thuốc từ gói thầu', description: 'Nhập thuốc từ gói thầu theo hợp đồng' },
      { id: 'r9_67',  code: '9.67', name: 'So sánh thuốc thầu và tồn kho', description: 'So sánh thuốc trúng thầu với tồn kho thực tế' },
      { id: 'r9_69',  code: '9.69', name: 'Xuất thuốc Khoa Phòng', description: 'Xuất thuốc theo khoa phòng' },
      { id: 'r9_76',  code: '9.76', name: 'Thuốc kê chi tiết theo BS', description: 'Thuốc kê chi tiết theo bác sĩ kê đơn' },
      { id: 'r9_79',  code: '9.79', name: 'DS thuốc VT xuất hao phí khoa phòng', description: 'Danh sách thuốc, VT xuất hao phí theo khoa phòng' },
      { id: 'r9_80',  code: '9.80', name: 'NXT theo các kho', description: 'Nhập xuất tồn theo tất cả các kho' },
      { id: 'r9_84',  code: '9.84', name: 'Thẻ kho thuốc chi tiết', description: 'Thẻ kho thuốc chi tiết theo từng mặt hàng' },
      { id: 'r9_87',  code: '9.87', name: 'Xuất thuốc theo đối tượng', description: 'Xuất thuốc theo đối tượng bệnh nhân' },
      { id: 'r9_93',  code: '9.93', name: 'NXT chi tiết', description: 'Nhập xuất tồn chi tiết từng lô/hạn' },
      { id: 'r9_99',  code: '9.99', name: 'Bảng kê hóa đơn nhập', description: 'Bảng kê hóa đơn nhập kho theo nhà cung cấp' },
      { id: 'r9_101', code: '9.101', name: 'Chi tiết xuất kho theo khoa phòng', description: 'Chi tiết xuất kho thuốc/VT theo khoa phòng' },
      { id: 'r9_106', code: '9.106', name: 'SL thuốc/VT xuất cho khoa', description: 'Số lượng thuốc, vật tư xuất cho từng khoa' },
      { id: 'r9_119', code: '9.119', name: 'Xuất thuốc khoa phòng', description: 'Xuất thuốc theo khoa phòng (mẫu 2)' },
      { id: 'r9_120', code: '9.120', name: 'Nhập từ NCC nhóm theo NCC', description: 'Nhập từ nhà cung cấp nhóm theo NCC' },
      { id: 'r9_137', code: '9.137', name: 'Tổng hợp xuất đơn thuốc theo loại', description: 'Tổng hợp xuất đơn thuốc theo loại thuốc' },
      { id: 'r9_139', code: '9.139', name: 'Chi tiết xuất bán', description: 'Chi tiết xuất bán nhà thuốc' },
      { id: 'r9_140', code: '9.140', name: 'Tổng hợp xuất đơn thuốc theo BN', description: 'Tổng hợp xuất đơn thuốc theo bệnh nhân' },
    ],
  },

  // ----------------------------------------------------------------
  // E. Bao cao CLS (Lab / Imaging) - 19 reports
  // ----------------------------------------------------------------
  paraclinical: {
    title: 'E. Cận lâm sàng',
    icon: <ExperimentOutlined />,
    color: '#eb2f96',
    reports: [
      { id: 'r9_3',   code: '9.3',  name: 'Giao ban khoa CLS', description: 'Báo cáo giao ban khoa cận lâm sàng' },
      { id: 'r9_5',   code: '9.5',  name: 'Tổng hợp hoạt động CLS', description: 'Tổng hợp hoạt động cận lâm sàng toàn viện' },
      { id: 'r9_19',  code: '9.19', name: 'Sổ XN vi sinh', description: 'Sổ xét nghiệm vi sinh theo mẫu' },
      { id: 'r9_20',  code: '9.20', name: 'Sổ XN', description: 'Sổ xét nghiệm tổng hợp' },
      { id: 'r9_22',  code: '9.22', name: 'Sổ siêu âm', description: 'Sổ siêu âm theo phòng' },
      { id: 'r9_25',  code: '9.25', name: 'Sổ nội soi', description: 'Sổ nội soi theo loại thủ thuật' },
      { id: 'r9_30',  code: '9.30', name: 'Sổ XN có chỉ số', description: 'Sổ xét nghiệm có chỉ số kết quả' },
      { id: 'r9_38',  code: '9.38', name: 'Sổ CLS', description: 'Sổ cận lâm sàng tổng hợp' },
      { id: 'r9_39',  code: '9.39', name: 'Sổ CĐHA', description: 'Sổ chẩn đoán hình ảnh' },
      { id: 'r9_51',  code: '9.51', name: 'Sổ XN', description: 'Sổ xét nghiệm (mẫu 2)' },
      { id: 'r9_55',  code: '9.55', name: 'Sổ TDCN', description: 'Sổ thăm dò chức năng' },
      { id: 'r9_64',  code: '9.64', name: 'Tổng hợp khoa CLS', description: 'Tổng hợp hoạt động theo khoa CLS' },
      { id: 'r9_94',  code: '9.94', name: 'Thống kê SL Phim CĐHA', description: 'Thống kê số lượng phim CĐHA theo loại' },
      { id: 'r9_95',  code: '9.95', name: 'Thống kê doanh thu CĐHA', description: 'Thống kê doanh thu chẩn đoán hình ảnh' },
      { id: 'r9_97',  code: '9.97', name: 'Sổ siêu âm theo phòng', description: 'Sổ siêu âm chi tiết theo phòng thực hiện' },
      { id: 'r9_110', code: '9.110', name: 'BS thực hiện CLS theo máy', description: 'Bác sĩ thực hiện CLS theo máy/thiết bị' },
      { id: 'r9_113', code: '9.113', name: 'Thống kê CLS chỉ định, thực làm', description: 'Thống kê CLS chỉ định so với thực hiện' },
      { id: 'r9_121', code: '9.121', name: 'Chỉ định XN vi sinh', description: 'Chỉ định xét nghiệm vi sinh chi tiết' },
      { id: 'r9_134', code: '9.134', name: 'Sổ theo dõi CLS', description: 'Sổ theo dõi cận lâm sàng tổng hợp' },
    ],
  },

  // ----------------------------------------------------------------
  // F. Bao cao PTTT (Surgery / Procedures) - 11 reports
  // ----------------------------------------------------------------
  surgery: {
    title: 'F. Phẫu thuật thủ thuật',
    icon: <ScissorOutlined />,
    color: '#fa541c',
    reports: [
      { id: 'r9_10',  code: '9.10', name: 'Sổ thủ thuật', description: 'Sổ theo dõi thủ thuật' },
      { id: 'r9_18',  code: '9.18', name: 'Sổ phẫu thuật', description: 'Sổ theo dõi phẫu thuật' },
      { id: 'r9_35',  code: '9.35', name: 'Sổ thủ thuật BAĐT', description: 'Sổ thủ thuật bệnh án điều trị nội trú' },
      { id: 'r9_40',  code: '9.40', name: 'Chi phí trên bàn mổ', description: 'Chi phí phát sinh trên bàn mổ' },
      { id: 'r9_56',  code: '9.56', name: 'Sổ thủ thuật các khoa', description: 'Sổ thủ thuật các khoa tổng hợp' },
      { id: 'r9_66',  code: '9.66', name: 'DS BN phẫu thuật', description: 'Danh sách bệnh nhân phẫu thuật' },
      { id: 'r9_73',  code: '9.73', name: 'PTTT', description: 'Báo cáo phẫu thuật thủ thuật tổng hợp' },
      { id: 'r9_75',  code: '9.75', name: 'Sổ thủ thuật', description: 'Sổ thủ thuật (mẫu 2)' },
      { id: 'r9_81',  code: '9.81', name: 'DS phẫu thuật', description: 'Danh sách phẫu thuật theo kỳ' },
      { id: 'r9_82',  code: '9.82', name: 'Hoạt động PTTT', description: 'Báo cáo hoạt động phẫu thuật thủ thuật' },
      { id: 'r9_88',  code: '9.88', name: 'Chi phí bồi dưỡng PTTT GPB', description: 'Chi phí bồi dưỡng PTTT giải phẫu bệnh' },
    ],
  },

  // ----------------------------------------------------------------
  // G. Bao cao BHYT (Insurance) - 20 reports
  // ----------------------------------------------------------------
  insurance: {
    title: 'G. Bảo hiểm y tế',
    icon: <SafetyCertificateOutlined />,
    color: '#13c2c2',
    reports: [
      { id: 'r9_11',  code: '9.11', name: 'C80a Mới', description: 'Mẫu C80a theo QĐ mới nhất' },
      { id: 'r9_17',  code: '9.17', name: 'DS BN hẹn khám', description: 'Danh sách bệnh nhân hẹn khám BHYT' },
      { id: 'r9_26',  code: '9.26', name: 'DS BN ra viện kết toán chưa duyệt', description: 'DS BN ra viện có kết toán BHYT chưa duyệt' },
      { id: 'r9_29',  code: '9.29', name: 'Mẫu 79 QĐ 3360', description: 'Biểu mẫu 79 theo QĐ 3360' },
      { id: 'r9_32',  code: '9.32', name: 'Thống kê DVKT BHYT mẫu 21', description: 'Thống kê dịch vụ kỹ thuật BHYT theo mẫu 21' },
      { id: 'r9_33',  code: '9.33', name: 'Thống kê VTYT BHYT mẫu 19', description: 'Thống kê vật tư y tế BHYT theo mẫu 19' },
      { id: 'r9_36',  code: '9.36', name: 'Thống kê BN chuyển viện', description: 'Thống kê bệnh nhân chuyển viện' },
      { id: 'r9_41',  code: '9.41', name: 'Sổ máu ngoại viện', description: 'Sổ theo dõi sử dụng máu ngoại viện' },
      { id: 'r9_43',  code: '9.43', name: 'C79a Mới', description: 'Mẫu C79a theo QĐ mới nhất' },
      { id: 'r9_49',  code: '9.49', name: 'Mẫu 80 QĐ 3360', description: 'Biểu mẫu 80 theo QĐ 3360' },
      { id: 'r9_52',  code: '9.52', name: 'DS BN chuyển tuyến đến', description: 'Danh sách BN chuyển tuyến đến bệnh viện' },
      { id: 'r9_58',  code: '9.58', name: 'Giảm định dữ liệu nội bộ', description: 'Giảm định dữ liệu BHYT nội bộ' },
      { id: 'r9_59',  code: '9.59', name: 'Tình hình bệnh tật tử vong ICD10', description: 'Tình hình bệnh tật và tử vong theo ICD-10' },
      { id: 'r9_60',  code: '9.60', name: 'Thuốc BHYT mẫu 20 QĐ 3360', description: 'Thuốc BHYT theo mẫu 20 QĐ 3360' },
      { id: 'r9_61',  code: '9.61', name: 'DS BN BHYT đề nghị thanh toán', description: 'DS BN BHYT đề nghị thanh toán với cơ quan BHXH' },
      { id: 'r9_74',  code: '9.74', name: 'Suất ăn dinh dưỡng', description: 'Thống kê suất ăn dinh dưỡng bệnh nhân' },
      { id: 'r9_104', code: '9.104', name: 'BHYT chi tiết', description: 'Báo cáo BHYT chi tiết theo bệnh nhân' },
      { id: 'r9_124', code: '9.124', name: 'BN quốc tịch nước ngoài', description: 'Thống kê bệnh nhân quốc tịch nước ngoài' },
      { id: 'r9_131', code: '9.131', name: 'Sổ lưu trữ HSBA', description: 'Sổ lưu trữ hồ sơ bệnh án' },
      { id: 'r9_133', code: '9.133', name: 'Thống kê ICD CV 2360', description: 'Thống kê ICD theo CV 2360' },
    ],
  },

  // ----------------------------------------------------------------
  // H. Nhan su / Chuyen tuyen (HR / Referral) - 2 reports
  // ----------------------------------------------------------------
  hr_referral: {
    title: 'H. Nhân sự / Chuyển tuyến',
    icon: <TeamOutlined />,
    color: '#597ef7',
    reports: [
      { id: 'r9_12',  code: '9.12', name: 'Tổng hợp thông tin BN chuyển tuyến đi', description: 'Tổng hợp thông tin bệnh nhân chuyển tuyến đi' },
      { id: 'r9_27',  code: '9.27', name: 'Sử dụng máy thận nhân tạo', description: 'Báo cáo sử dụng máy thận nhân tạo' },
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Call the correct export/print API based on report category and output format.
 * Returns a Blob from the server.
 */
const callReportApi = async (
  reportId: string,
  outputFormat: string,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs],
  department: string,
  warehouseId?: string
): Promise<Blob> => {
  const mapping = reportApiMapping[reportId];
  if (!mapping) {
    throw new Error(`Khong tim thay cau hinh API cho bao cao: ${reportId}`);
  }

  const fromDate = dateRange[0].format('YYYY-MM-DD');
  const toDate = dateRange[1].format('YYYY-MM-DD');
  const departmentId = departmentIdMap[department] || department;

  const { apiCategory, reportType } = mapping;

  let response: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  switch (apiCategory) {
    case 'finance': {
      const request: FinancialReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId || undefined,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await financeApi.printFinancialReport(request);
      } else {
        response = await financeApi.exportFinancialReport(request);
      }
      break;
    }
    case 'pharmacy': {
      const request: PharmacyReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId || undefined,
        warehouseId: warehouseId || undefined,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await pharmacyReportApi.printPharmacyReport(request);
      } else {
        response = await pharmacyReportApi.exportPharmacyReport(request);
      }
      break;
    }
    case 'statistics': {
      const request: StatisticsReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId: departmentId || undefined,
        outputFormat,
      };
      if (outputFormat === 'print') {
        response = await statisticsApi.printStatisticsReport(request);
      } else {
        response = await statisticsApi.exportStatisticsReport(request);
      }
      break;
    }
  }

  // response may be AxiosResponse with .data as Blob, or already a Blob
  const blob = response?.data instanceof Blob ? response.data : response?.data;
  if (!(blob instanceof Blob)) {
    throw new Error('Server khong tra ve du lieu bao cao hop le.');
  }
  return blob;
};

/**
 * Find a report name by its ID across all categories.
 */
const findReportName = (reportId: string): string => {
  for (const cat of Object.values(reportCategories)) {
    const found = cat.reports.find((r) => r.id === reportId);
    if (found) return found.name;
  }
  return reportId;
};

/**
 * Trigger a file download from a Blob.
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Format number with thousand separator
const fmtNum = (v: number) => v?.toLocaleString('vi-VN') ?? '0';
const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`;
const fmtMoney = (v: number) => `${fmtNum(Math.round(v ?? 0))} VND`;

// ============================================================================
// Reconciliation Report Definitions (kept from before - 8 reports)
// ============================================================================

type ReconciliationReportId =
  | 'supplier-procurement'
  | 'revenue-by-record'
  | 'dept-cost-vs-fees'
  | 'record-cost-summary'
  | 'fees-vs-standards'
  | 'service-order-doctors'
  | 'dispensing-vs-billing'
  | 'dispensing-vs-standards';

interface ReconciliationReportDef {
  id: ReconciliationReportId;
  name: string;
  description: string;
  icon: React.ReactNode;
  hasSupplierFilter?: boolean;
}

const reconciliationReports: ReconciliationReportDef[] = [
  {
    id: 'supplier-procurement',
    name: 'Theo doi trung thau theo NCC',
    description: 'Doi chieu ket qua trung thau voi giao hang thuc te theo nha cung cap',
    icon: <ShopOutlined />,
    hasSupplierFilter: true,
  },
  {
    id: 'revenue-by-record',
    name: 'Doanh thu chi phi theo HSBA',
    description: 'Tinh doanh thu, chi phi va loi nhuan theo tung ho so benh an',
    icon: <AccountBookOutlined />,
  },
  {
    id: 'dept-cost-vs-fees',
    name: 'Chi phi khoa phong vs vien phi',
    description: 'Doi chieu chi phi khoa phong voi vien phi thu duoc',
    icon: <SwapOutlined />,
  },
  {
    id: 'record-cost-summary',
    name: 'Tong hop chi phi HSBA: SD vs Thu',
    description: 'Doi chieu tong chi phi su dung voi so tien da thu theo HSBA',
    icon: <ReconciliationOutlined />,
  },
  {
    id: 'fees-vs-standards',
    name: 'Vien phi vs dinh muc DVKT',
    description: 'Doi chieu vien phi thuc te voi dinh muc gia dich vu ky thuat',
    icon: <FileSearchOutlined />,
  },
  {
    id: 'service-order-doctors',
    name: 'BS chi dinh vs BS thuc hien',
    description: 'Doi chieu dich vu ky thuat giua bac si chi dinh va bac si thuc hien',
    icon: <TeamOutlined />,
  },
  {
    id: 'dispensing-vs-billing',
    name: 'Xuat kho thuoc/VTYT vs vien phi',
    description: 'Doi chieu xuat kho thuoc, VTYT voi vien phi thu theo khoa',
    icon: <MedicineBoxOutlined />,
  },
  {
    id: 'dispensing-vs-standards',
    name: 'Xuat kho vs dinh muc theo khoa',
    description: 'Doi chieu xuat kho thuc te voi dinh muc su dung theo khoa phong',
    icon: <AuditOutlined />,
  },
];

// ============================================================================
// ReconciliationTab Component (unchanged)
// ============================================================================

const ReconciliationTab: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReconciliationReportId | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [summaryData, setSummaryData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const handleRunReport = useCallback(async () => {
    if (!selectedReport) {
      message.warning('Vui long chon loai bao cao doi chieu');
      return;
    }

    setLoading(true);
    setReportData(null);
    setSummaryData(null);

    const fromDate = dateRange[0].format('YYYY-MM-DD');
    const toDate = dateRange[1].format('YYYY-MM-DD');
    const deptId = departmentFilter || undefined;

    try {
      let response;
      switch (selectedReport) {
        case 'supplier-procurement':
          response = await reconciliationApi.getSupplierProcurement(fromDate, toDate, deptId);
          break;
        case 'revenue-by-record':
          response = await reconciliationApi.getRevenueByRecord(fromDate, toDate, deptId);
          break;
        case 'dept-cost-vs-fees':
          response = await reconciliationApi.getDeptCostVsFees(fromDate, toDate, deptId);
          break;
        case 'record-cost-summary':
          response = await reconciliationApi.getRecordCostSummary(fromDate, toDate, deptId);
          break;
        case 'fees-vs-standards':
          response = await reconciliationApi.getFeesVsStandards(fromDate, toDate, deptId);
          break;
        case 'service-order-doctors':
          response = await reconciliationApi.getServiceOrderDoctors(fromDate, toDate, deptId);
          break;
        case 'dispensing-vs-billing':
          response = await reconciliationApi.getDispensingVsBilling(fromDate, toDate, deptId);
          break;
        case 'dispensing-vs-standards':
          response = await reconciliationApi.getDispensingVsStandards(fromDate, toDate, deptId);
          break;
      }

      const data = response?.data;
      if (data) {
        setSummaryData(data);
        setReportData(data.items || []);
        message.success(`Da tai bao cao: ${reconciliationReports.find(r => r.id === selectedReport)?.name}`);
      }
    } catch (err: unknown) {
      console.warn('Error loading reconciliation report:', err);
      message.warning('Khong the tai bao cao. Vui long thu lai.');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, departmentFilter]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleBack = useCallback(() => {
    setSelectedReport(null);
    setReportData(null);
    setSummaryData(null);
  }, []);

  // Table column definitions for each report type
  const getColumns = (): ColumnsType<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    switch (selectedReport) {
      case 'supplier-procurement':
        return [
          { title: 'Ma NCC', dataIndex: 'supplierCode', key: 'supplierCode', width: 100 },
          { title: 'Ten NCC', dataIndex: 'supplierName', key: 'supplierName', width: 200 },
          { title: 'So mat hang', dataIndex: 'itemCount', key: 'itemCount', width: 100, align: 'right' as const },
          { title: 'So phieu nhap', dataIndex: 'receiptCount', key: 'receiptCount', width: 100, align: 'right' as const },
          { title: 'Gia tri HD', dataIndex: 'contractValue', key: 'contractValue', width: 140, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Gia tri giao', dataIndex: 'deliveredValue', key: 'deliveredValue', width: 140, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Ti le thuc hien', dataIndex: 'fulfillmentRate', key: 'fulfillmentRate', width: 110, align: 'right' as const, render: (v: number) => fmtPct(v) },
          { title: 'Ngay giao cuoi', dataIndex: 'lastDeliveryDate', key: 'lastDeliveryDate', width: 120 },
        ] as ColumnsType<SupplierProcurementItemDto>;

      case 'revenue-by-record':
        return [
          { title: 'Ma HSBA', dataIndex: 'medicalRecordCode', key: 'medicalRecordCode', width: 100 },
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patientName', width: 160 },
          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
          { title: 'DT Dich vu', dataIndex: 'serviceRevenue', key: 'serviceRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'DT Thuoc', dataIndex: 'medicineRevenue', key: 'medicineRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong DT', dataIndex: 'totalRevenue', key: 'totalRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong CP', dataIndex: 'totalCost', key: 'totalCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Loi nhuan', dataIndex: 'profit', key: 'profit', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Ty suat', dataIndex: 'profitMargin', key: 'profitMargin', width: 90, align: 'right' as const, render: (v: number) => fmtPct(v) },
        ] as ColumnsType<RevenueByRecordItemDto>;

      case 'dept-cost-vs-fees':
        return [
          { title: 'Ma khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Ten khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'CP Dich vu', dataIndex: 'serviceCost', key: 'serviceCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'CP Thuoc', dataIndex: 'medicineCost', key: 'medicineCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong CP khoa', dataIndex: 'totalDeptCost', key: 'totalDeptCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong VP thu', dataIndex: 'totalHospitalFees', key: 'totalHospitalFees', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chenh lech', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: '% CL', dataIndex: 'differencePercent', key: 'differencePercent', width: 80, align: 'right' as const, render: (v: number) => fmtPct(v) },
        ] as ColumnsType<DeptCostVsFeesItemDto>;

      case 'record-cost-summary':
        return [
          { title: 'Ma HSBA', dataIndex: 'medicalRecordCode', key: 'medicalRecordCode', width: 100 },
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patientName', width: 160 },
          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
          { title: 'DV su dung', dataIndex: 'serviceUsed', key: 'serviceUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Thuoc su dung', dataIndex: 'medicineUsed', key: 'medicineUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong su dung', dataIndex: 'totalUsed', key: 'totalUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong da thu', dataIndex: 'totalCollected', key: 'totalCollected', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chenh lech', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => {
            const color = s === 'Match' ? 'green' : s === 'Overcharged' ? 'orange' : 'red';
            const text = s === 'Match' ? 'Khop' : s === 'Overcharged' ? 'Thu du' : 'Thu thieu';
            return <Tag color={color}>{text}</Tag>;
          }},
        ] as ColumnsType<RecordCostSummaryItemDto>;

      case 'fees-vs-standards':
        return [
          { title: 'Ma DV', dataIndex: 'serviceCode', key: 'serviceCode', width: 90 },
          { title: 'Ten dich vu', dataIndex: 'serviceName', key: 'serviceName', width: 200 },
          { title: 'So lan', dataIndex: 'usageCount', key: 'usageCount', width: 80, align: 'right' as const },
          { title: 'Gia dinh muc', dataIndex: 'standardPrice', key: 'standardPrice', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Gia TB thuc te', dataIndex: 'actualAvgPrice', key: 'actualAvgPrice', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong dinh muc', dataIndex: 'totalStandardAmount', key: 'totalStandardAmount', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong thuc te', dataIndex: 'totalActualAmount', key: 'totalActualAmount', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chenh lech', dataIndex: 'difference', key: 'difference', width: 110, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={s === 'WithinStandard' ? 'green' : 'red'}>{s === 'WithinStandard' ? 'Dat' : 'Vuot'}</Tag> },
        ] as ColumnsType<FeesVsStandardsItemDto>;

      case 'service-order-doctors':
        return [
          { title: 'Ma phieu', dataIndex: 'requestCode', key: 'requestCode', width: 110 },
          { title: 'Ngay', dataIndex: 'requestDate', key: 'requestDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
          { title: 'Benh nhan', dataIndex: 'patientName', key: 'patientName', width: 140 },
          { title: 'Dich vu', dataIndex: 'serviceName', key: 'serviceName', width: 160 },
          { title: 'BS chi dinh', dataIndex: 'orderingDoctorName', key: 'orderingDoctorName', width: 140 },
          { title: 'Khoa CD', dataIndex: 'orderingDepartmentName', key: 'orderingDepartmentName', width: 120 },
          { title: 'BS thuc hien', dataIndex: 'executingDoctorName', key: 'executingDoctorName', width: 140, render: (v: string) => v || <Text type="secondary">Chua co</Text> },
          { title: 'Khoa TH', dataIndex: 'executingDepartmentName', key: 'executingDepartmentName', width: 120 },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 120, render: (s: string) => {
            const color = s === 'SameDoctor' ? 'green' : s === 'DifferentDoctor' ? 'blue' : 'orange';
            const text = s === 'SameDoctor' ? 'Cung BS' : s === 'DifferentDoctor' ? 'Khac BS' : 'Chua TH';
            return <Tag color={color}>{text}</Tag>;
          }},
        ] as ColumnsType<ServiceOrderDoctorsItemDto>;

      case 'dispensing-vs-billing':
        return [
          { title: 'Ma khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Ten khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'Thuoc xuat', dataIndex: 'medicineDispensed', key: 'medicineDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT xuat', dataIndex: 'supplyDispensed', key: 'supplyDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong xuat', dataIndex: 'totalDispensed', key: 'totalDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Thuoc thu', dataIndex: 'medicineBilled', key: 'medicineBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT thu', dataIndex: 'supplyBilled', key: 'supplyBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong thu', dataIndex: 'totalBilled', key: 'totalBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chenh lech', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
        ] as ColumnsType<DispensingVsBillingItemDto>;

      case 'dispensing-vs-standards':
        return [
          { title: 'Ma khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Ten khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'So BN', dataIndex: 'patientCount', key: 'patientCount', width: 80, align: 'right' as const },
          { title: 'Thuoc xuat', dataIndex: 'medicineDispensed', key: 'medicineDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT xuat', dataIndex: 'supplyDispensed', key: 'supplyDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong xuat', dataIndex: 'totalDispensed', key: 'totalDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'DM/BN', dataIndex: 'standardPerPatient', key: 'standardPerPatient', width: 100, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tong DM', dataIndex: 'totalStandard', key: 'totalStandard', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chenh lech', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={s === 'WithinStandard' ? 'green' : 'red'}>{s === 'WithinStandard' ? 'Dat' : 'Vuot'}</Tag> },
        ] as ColumnsType<DispensingVsStandardsItemDto>;

      default:
        return [];
    }
  };

  // Render summary statistics for the current report
  const renderSummary = () => {
    if (!summaryData || !selectedReport) return null;

    switch (selectedReport) {
      case 'supplier-procurement':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title="Tong NCC" value={summaryData.totalSuppliers} /></Col>
            <Col span={6}><Statistic title="Tong mat hang" value={summaryData.totalItems} /></Col>
            <Col span={6}><Statistic title="Gia tri hop dong" value={fmtMoney(summaryData.totalContractValue)} /></Col>
            <Col span={6}><Statistic title="Ti le thuc hien" value={fmtPct(summaryData.fulfillmentRate)} /></Col>
          </Row>
        );
      case 'revenue-by-record':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={5}><Statistic title="Tong HSBA" value={summaryData.totalRecords} /></Col>
            <Col span={5}><Statistic title="Tong doanh thu" value={fmtMoney(summaryData.totalRevenue)} /></Col>
            <Col span={5}><Statistic title="Tong chi phi" value={fmtMoney(summaryData.totalCost)} /></Col>
            <Col span={5}><Statistic title="Tong loi nhuan" value={fmtMoney(summaryData.totalProfit)} styles={{ content: { color: summaryData.totalProfit >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
            <Col span={4}><Statistic title="TB ty suat LN" value={fmtPct(summaryData.averageProfitMargin)} /></Col>
          </Row>
        );
      case 'dept-cost-vs-fees':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Statistic title="Tong CP khoa phong" value={fmtMoney(summaryData.totalDeptCost)} /></Col>
            <Col span={8}><Statistic title="Tong VP thu" value={fmtMoney(summaryData.totalHospitalFees)} /></Col>
            <Col span={8}><Statistic title="Chenh lech" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'record-cost-summary':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Statistic title="Tong HSBA" value={summaryData.totalRecords} /></Col>
            <Col span={5}><Statistic title="Tong su dung" value={fmtMoney(summaryData.totalUsed)} /></Col>
            <Col span={5}><Statistic title="Tong da thu" value={fmtMoney(summaryData.totalCollected)} /></Col>
            <Col span={4}><Statistic title="Chenh lech" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
            <Col span={3}><Statistic title="Thu du" value={summaryData.overchargedCount} styles={{ content: { color: '#fa8c16' } }} /></Col>
            <Col span={3}><Statistic title="Thu thieu" value={summaryData.underchargedCount} styles={{ content: { color: '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'fees-vs-standards':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Statistic title="Tong DV" value={summaryData.totalServices} /></Col>
            <Col span={5}><Statistic title="Tong thuc te" value={fmtMoney(summaryData.totalActualFees)} /></Col>
            <Col span={5}><Statistic title="Tong dinh muc" value={fmtMoney(summaryData.totalStandardFees)} /></Col>
            <Col span={5}><Statistic title="Dat dinh muc" value={summaryData.withinStandardCount} styles={{ content: { color: '#52c41a' } }} /></Col>
            <Col span={5}><Statistic title="Vuot dinh muc" value={summaryData.exceedStandardCount} styles={{ content: { color: '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'service-order-doctors':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title="Tong chi dinh" value={summaryData.totalOrders} /></Col>
            <Col span={6}><Statistic title="Cung BS" value={summaryData.sameDoctorCount} styles={{ content: { color: '#52c41a' } }} /></Col>
            <Col span={6}><Statistic title="Khac BS" value={summaryData.differentDoctorCount} styles={{ content: { color: '#1890ff' } }} /></Col>
            <Col span={6}><Statistic title="Chua TH" value={summaryData.noExecutorCount} styles={{ content: { color: '#fa8c16' } }} /></Col>
          </Row>
        );
      case 'dispensing-vs-billing':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Statistic title="Tong xuat kho" value={fmtMoney(summaryData.totalDispensed)} /></Col>
            <Col span={8}><Statistic title="Tong vien phi thu" value={fmtMoney(summaryData.totalBilled)} /></Col>
            <Col span={8}><Statistic title="Chenh lech" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'dispensing-vs-standards':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title="Tong khoa" value={summaryData.totalDepartments} /></Col>
            <Col span={6}><Statistic title="Tong xuat kho" value={fmtMoney(summaryData.totalDispensed)} /></Col>
            <Col span={6}><Statistic title="Tong dinh muc" value={fmtMoney(summaryData.totalStandard)} /></Col>
            <Col span={6}><Statistic title="Chenh lech" value={fmtMoney(summaryData.totalDispensed - summaryData.totalStandard)} styles={{ content: { color: (summaryData.totalDispensed - summaryData.totalStandard) <= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
          </Row>
        );
      default:
        return null;
    }
  };

  // Report selection cards (when no report is selected)
  if (!selectedReport) {
    return (
      <div>
        <Alert
          title="Doi chieu Level 6 - Theo TT 54/2017/TT-BYT, TT 32/2023/TT-BYT"
          description="8 bao cao doi chieu danh cho benh vien hang 6. Chon loai bao cao de bat dau."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          {reconciliationReports.map((report) => (
            <Col key={report.id} span={6}>
              <Card
                hoverable
                size="small"
                onClick={() => setSelectedReport(report.id)}
                style={{ height: '100%' }}
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Space>
                    {report.icon}
                    <Text strong>{report.name}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {report.description}
                  </Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  // Report detail view (when a report is selected)
  const currentReport = reconciliationReports.find(r => r.id === selectedReport);

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={handleBack} />
            {currentReport?.icon}
            <span>{currentReport?.name}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={!reportData}>
              In
            </Button>
          </Space>
        }
      >
        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Text strong>Thoi gian:</Text>
            <br />
            <RangePicker
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: 8 }}
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!, dates[1]!]);
                }
              }}
            />
          </Col>
          <Col span={8}>
            <Text strong>{currentReport?.hasSupplierFilter ? 'NCC:' : 'Khoa/Phong:'}</Text>
            <br />
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              allowClear
              placeholder={currentReport?.hasSupplierFilter ? 'Tat ca NCC' : 'Tat ca khoa/phong'}
            >
              {!currentReport?.hasSupplierFilter && (
                <>
                  <Select.Option value="noi">Khoa Noi</Select.Option>
                  <Select.Option value="ngoai">Khoa Ngoai</Select.Option>
                  <Select.Option value="san">Khoa San</Select.Option>
                  <Select.Option value="nhi">Khoa Nhi</Select.Option>
                  <Select.Option value="xn">Khoa Xet nghiem</Select.Option>
                  <Select.Option value="cdha">Khoa CDHA</Select.Option>
                  <Select.Option value="duoc">Khoa Duoc</Select.Option>
                </>
              )}
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>&nbsp;</Text>
            <br />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleRunReport}
              loading={loading}
              style={{ marginTop: 8 }}
            >
              Chay bao cao
            </Button>
          </Col>
        </Row>

        <Divider />

        <Spin spinning={loading} tip="Dang tai du lieu...">
          {/* Summary Statistics */}
          {renderSummary()}

          {/* Data Table */}
          {reportData ? (
            <Table
              columns={getColumns()}
              dataSource={reportData}
              rowKey={(record: any, index?: number) => record.supplierId || record.medicalRecordId || record.departmentId || record.serviceId || record.serviceRequestId || record.departmentCode || `row-${index}`} // eslint-disable-line @typescript-eslint/no-explicit-any
              size="small"
              scroll={{ x: 1200 }}
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tong: ${total} dong` }}
              bordered
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <FileSearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <br />
              <Text type="secondary">Chon thoi gian va nhan "Chay bao cao" de xem du lieu</Text>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

// ============================================================================
// BV Full Reports Content (140 Reports in 8 Categories)
// ============================================================================

const FullReportsContent: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('clinical');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [department, setDepartment] = useState<string>('all');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // Flatten all reports for search
  const allReports = useMemo(() => {
    return Object.entries(reportCategories).flatMap(([catKey, cat]) =>
      cat.reports.map(r => ({ ...r, categoryKey: catKey, categoryTitle: cat.title, categoryColor: cat.color }))
    );
  }, []);

  // Total report count
  const totalReportCount = allReports.length;

  // Handle export to Excel, PDF, or Print
  const handleExport = useCallback(async (format: 'excel' | 'pdf' | 'print') => {
    if (!selectedReport) {
      message.warning('Vui long chon bao cao');
      return;
    }

    const formatName = format === 'excel' ? 'Excel' : format === 'pdf' ? 'PDF' : 'may in';
    const reportName = findReportName(selectedReport);

    setExporting(true);
    try {
      const outputFormat = format === 'print' ? 'html' : format;
      const blob = await callReportApi(selectedReport, outputFormat, dateRange, department, warehouseId || undefined);

      if (format === 'print') {
        const htmlContent = await blob.text();
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        } else {
          message.error('Trinh duyet da chan cua so pop-up. Vui long cho phep pop-up de in bao cao.');
        }
      } else {
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.${extension}`;
        downloadBlob(blob, filename);
        message.success(`Da xuat bao cao ra ${formatName} thanh cong`);
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error exporting report:', error);
      message.error(`Xuat bao cao ra ${formatName} that bai. Vui long thu lai.`);
    } finally {
      setExporting(false);
    }
  }, [selectedReport, dateRange, department, warehouseId]);

  // Handle preview: loads HTML and shows in a modal
  const handlePreview = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'html', dateRange, department, warehouseId || undefined);
      const htmlContent = await blob.text();
      setPreviewTitle(reportName);
      setPreviewContent(htmlContent);
      setPreviewVisible(true);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error previewing report:', error);
      message.error('Xem truoc bao cao that bai. Vui long thu lai.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // Handle download: downloads as Excel by default
  const handleDownload = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'excel', dateRange, department, warehouseId || undefined);
      const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`;
      downloadBlob(blob, filename);
      message.success(`Da tai xuong: ${reportName}`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error downloading report:', error);
      message.error('Tai xuong bao cao that bai. Vui long thu lai.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // Filter reports by search
  const filteredReports = useMemo(() => {
    if (!searchText) return null;
    const lower = searchText.toLowerCase();
    return allReports.filter(
      r =>
        r.name.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower) ||
        r.code.toLowerCase().includes(lower) ||
        r.id.toLowerCase().includes(lower)
    );
  }, [searchText, allReports]);

  const currentCategory = reportCategories[activeCategory];

  // Determine if the current category is pharmacy (to show warehouse filter)
  const isPharmacyCategory = activeCategory === 'pharmacy';

  return (
    <>
      <Spin spinning={exporting} tip="Dang xu ly bao cao...">
        <Row gutter={16}>
          {/* Left panel - Report categories + search */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <FolderOpenOutlined />
                  <span>Danh muc ({totalReportCount} bao cao)</span>
                </Space>
              }
              size="small"
            >
              <Search
                placeholder="Tim bao cao (ten, ma 9.xx)..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              {filteredReports ? (
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Tim thay {filteredReports.length} bao cao
                  </Text>
                  {filteredReports.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedReport === item.id ? '#e6f7ff' : 'transparent',
                        padding: '6px 8px',
                        borderRadius: 4,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                      onClick={() => {
                        setActiveCategory(item.categoryKey);
                        setSelectedReport(item.id);
                        setSearchText('');
                      }}
                    >
                      <Space>
                        <Tag color={item.categoryColor} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {item.code}
                        </Tag>
                        <Text strong={selectedReport === item.id} style={{ fontSize: 13 }}>
                          {item.name}
                        </Text>
                      </Space>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11, paddingLeft: 4 }}>
                        {item.categoryTitle}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {Object.entries(reportCategories).map(([key, cat]) => (
                    <div
                      key={key}
                      style={{
                        cursor: 'pointer',
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: activeCategory === key ? '#e6f7ff' : 'transparent',
                        borderLeft: activeCategory === key ? `3px solid ${cat.color}` : '3px solid transparent',
                        marginBottom: 2,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => {
                        setActiveCategory(key);
                        setSelectedReport(null);
                      }}
                    >
                      <Space>
                        {cat.icon}
                        <Text strong={activeCategory === key} style={{ fontSize: 13 }}>
                          {cat.title}
                        </Text>
                        <Badge
                          count={cat.reports.length}
                          style={{
                            backgroundColor: activeCategory === key ? cat.color : '#d9d9d9',
                            fontSize: 10,
                          }}
                          size="small"
                        />
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>

          {/* Right panel - Report list and options */}
          <Col span={18}>
            <Card
              title={
                <Space>
                  <span style={{ color: currentCategory?.color }}>{currentCategory?.icon}</span>
                  <span>{currentCategory?.title}</span>
                  <Badge count={currentCategory?.reports.length} style={{ backgroundColor: currentCategory?.color }} size="small" />
                </Space>
              }
            >
              {/* Filters row */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={isPharmacyCategory ? 6 : 8}>
                  <Text strong>Thoi gian:</Text>
                  <br />
                  <RangePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%', marginTop: 8 }}
                    onChange={(dates) => {
                      if (dates) {
                        setDateRange([dates[0]!, dates[1]!]);
                      }
                    }}
                    defaultValue={[dayjs().startOf('month'), dayjs()]}
                  />
                </Col>
                <Col span={isPharmacyCategory ? 5 : 8}>
                  <Text strong>Khoa/Phong:</Text>
                  <br />
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    defaultValue="all"
                    onChange={(value) => setDepartment(value)}
                  >
                    <Select.Option value="all">Tat ca khoa/phong</Select.Option>
                    <Select.Option value="noi">Khoa Noi</Select.Option>
                    <Select.Option value="ngoai">Khoa Ngoai</Select.Option>
                    <Select.Option value="san">Khoa San</Select.Option>
                    <Select.Option value="nhi">Khoa Nhi</Select.Option>
                    <Select.Option value="xn">Khoa Xet nghiem</Select.Option>
                    <Select.Option value="cdha">Khoa CDHA</Select.Option>
                    <Select.Option value="duoc">Khoa Duoc</Select.Option>
                    <Select.Option value="cap_cuu">Khoa Cap cuu</Select.Option>
                    <Select.Option value="hscc">HSCC</Select.Option>
                    <Select.Option value="phcn">Khoa PHCN</Select.Option>
                    <Select.Option value="tmh">Khoa TMH</Select.Option>
                    <Select.Option value="mat">Khoa Mat</Select.Option>
                    <Select.Option value="rhm">Khoa RHM</Select.Option>
                    <Select.Option value="da_lieu">Khoa Da lieu</Select.Option>
                  </Select>
                </Col>
                {isPharmacyCategory && (
                  <Col span={5}>
                    <Text strong>Kho:</Text>
                    <br />
                    <Select
                      style={{ width: '100%', marginTop: 8 }}
                      value={warehouseId || undefined}
                      onChange={(value) => setWarehouseId(value || '')}
                      allowClear
                      placeholder="Tat ca kho"
                    >
                      <Select.Option value="kho_thuoc">Kho Thuoc</Select.Option>
                      <Select.Option value="kho_vtyt">Kho VTYT</Select.Option>
                      <Select.Option value="kho_hc">Kho Hoa chat</Select.Option>
                      <Select.Option value="tu_truc">Tu truc</Select.Option>
                      <Select.Option value="nha_thuoc">Nha thuoc</Select.Option>
                    </Select>
                  </Col>
                )}
                <Col span={isPharmacyCategory ? 8 : 8}>
                  <Text strong>Xuat bao cao:</Text>
                  <br />
                  <Space style={{ marginTop: 8 }}>
                    <Tooltip title="Xuat Excel">
                      <Button
                        icon={<FileExcelOutlined />}
                        onClick={() => handleExport('excel')}
                        loading={exporting}
                        style={{ backgroundColor: '#52c41a', color: 'white' }}
                      >
                        Excel
                      </Button>
                    </Tooltip>
                    <Tooltip title="Xuat PDF">
                      <Button
                        icon={<FilePdfOutlined />}
                        onClick={() => handleExport('pdf')}
                        loading={exporting}
                        danger
                      >
                        PDF
                      </Button>
                    </Tooltip>
                    <Tooltip title="In bao cao">
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={() => handleExport('print')}
                        loading={exporting}
                      >
                        In
                      </Button>
                    </Tooltip>
                  </Space>
                </Col>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              {/* Report list grid */}
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <Row gutter={[12, 12]}>
                  {(currentCategory?.reports || []).map((item) => (
                    <Col key={item.id} span={12}>
                      <Card
                        hoverable
                        size="small"
                        style={{
                          borderColor: selectedReport === item.id ? currentCategory?.color : undefined,
                          backgroundColor: selectedReport === item.id ? '#e6f7ff' : undefined,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedReport(item.id)}
                      >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Tag
                              color={currentCategory?.color}
                              style={{ fontSize: 11, fontWeight: 600 }}
                            >
                              {item.code}
                            </Tag>
                            <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.description}
                          </Text>
                          {selectedReport === item.id && (
                            <Space style={{ marginTop: 4 }}>
                              <Button
                                type="primary"
                                size="small"
                                icon={<EyeOutlined />}
                                loading={exporting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreview(item.id, `[${item.code}] ${item.name}`);
                                }}
                              >
                                Xem truoc
                              </Button>
                              <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                loading={exporting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(item.id, item.name);
                                }}
                              >
                                Tai xuong
                              </Button>
                            </Space>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </Card>

            {/* Quick access to common reports */}
            <Card title="Bao cao thuong dung" size="small" style={{ marginTop: 12 }}>
              <Row gutter={[12, 12]}>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<BarChartOutlined />}
                    onClick={() => { setActiveCategory('clinical'); setSelectedReport('r9_7'); }}
                  >
                    HĐ kham benh
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<HomeOutlined />}
                    onClick={() => { setActiveCategory('inpatient'); setSelectedReport('r9_6'); }}
                  >
                    Giao ban giuong
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={() => { setActiveCategory('finance'); setSelectedReport('r9_42'); }}
                  >
                    TH vien phi
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => { setActiveCategory('pharmacy'); setSelectedReport('r9_28'); }}
                  >
                    NXT kho
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<ExperimentOutlined />}
                    onClick={() => { setActiveCategory('paraclinical'); setSelectedReport('r9_5'); }}
                  >
                    TH hoat dong CLS
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<SafetyCertificateOutlined />}
                    onClick={() => { setActiveCategory('insurance'); setSelectedReport('r9_11'); }}
                  >
                    C80a BHYT
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Preview Modal */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Dong
          </Button>,
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => {
              const iframe = document.getElementById('report-preview-iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              }
            }}
          >
            In
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (selectedReport) {
                handleDownload(selectedReport, previewTitle);
              }
            }}
          >
            Tai xuong Excel
          </Button>,
        ]}
        width={900}
        styles={{ body: { height: 600, padding: 0, overflow: 'hidden' } }}
      >
        <iframe
          id="report-preview-iframe"
          srcDoc={previewContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={previewTitle}
        />
      </Modal>
    </>
  );
};

// ============================================================================
// Main Reports Component with Tabs
// ============================================================================

const Reports: React.FC = () => {
  return (
    <div>
      <Title level={4}>Ho so benh an & Bao cao thong ke</Title>

      <Tabs
        items={[
          {
            key: 'hospital-reports',
            label: (
              <Space>
                <FileTextOutlined />
                <span>140 Báo cáo bệnh viện</span>
                <Badge count={140} style={{ backgroundColor: '#1890ff' }} size="small" />
              </Space>
            ),
            children: <FullReportsContent />,
          },
          {
            key: 'reconciliation',
            label: (
              <Space>
                <AuditOutlined />
                <span>Doi chieu Level 6</span>
                <Badge count={8} style={{ backgroundColor: '#722ed1' }} size="small" />
              </Space>
            ),
            children: <ReconciliationTab />,
          },
        ]}
      />
    </div>
  );
};

export default Reports;
