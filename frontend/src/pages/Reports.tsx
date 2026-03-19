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
  Drawer,
  Empty,
  Form,
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
  ReloadOutlined,
  BuildOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlayCircleOutlined,
  ContainerOutlined,
  SolutionOutlined,
  DatabaseOutlined,
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
import { getBhytReport, getAdminReport, getPharmacyReport } from '../api/bhytReports';
import { hospitalReportApi, type HospitalReportResult } from '../api/hospitalReport';
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
    throw new Error(`Không tìm thấy cấu hình API cho báo cáo: ${reportId}`);
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
    throw new Error('Server không trả về dữ liệu báo cáo hợp lệ.');
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
const fmtMoney = (v: number) => `${fmtNum(Math.round(v ?? 0))} đ`;

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
    name: 'Theo dõi trúng thầu theo NCC',
    description: 'Đối chiếu kết quả trúng thầu với giao hàng thực tế theo nhà cung cấp',
    icon: <ShopOutlined />,
    hasSupplierFilter: true,
  },
  {
    id: 'revenue-by-record',
    name: 'Doanh thu chi phí theo HSBA',
    description: 'Tính doanh thu, chi phí và lợi nhuận theo từng hồ sơ bệnh án',
    icon: <AccountBookOutlined />,
  },
  {
    id: 'dept-cost-vs-fees',
    name: 'Chi phí khoa phòng vs viện phí',
    description: 'Đối chiếu chi phí khoa phòng với viện phí thu được',
    icon: <SwapOutlined />,
  },
  {
    id: 'record-cost-summary',
    name: 'Tổng hợp chi phí HSBA: SD vs Thu',
    description: 'Đối chiếu tổng chi phí sử dụng với số tiền đã thu theo HSBA',
    icon: <ReconciliationOutlined />,
  },
  {
    id: 'fees-vs-standards',
    name: 'Viện phí vs định mức DVKT',
    description: 'Đối chiếu viện phí thực tế với định mức giá dịch vụ kỹ thuật',
    icon: <FileSearchOutlined />,
  },
  {
    id: 'service-order-doctors',
    name: 'BS chỉ định vs BS thực hiện',
    description: 'Đối chiếu dịch vụ kỹ thuật giữa bác sĩ chỉ định và bác sĩ thực hiện',
    icon: <TeamOutlined />,
  },
  {
    id: 'dispensing-vs-billing',
    name: 'Xuất kho thuốc/VTYT vs viện phí',
    description: 'Đối chiếu xuất kho thuốc, VTYT với viện phí thu theo khoa',
    icon: <MedicineBoxOutlined />,
  },
  {
    id: 'dispensing-vs-standards',
    name: 'Xuất kho vs định mức theo khoa',
    description: 'Đối chiếu xuất kho thực tế với định mức sử dụng theo khoa phòng',
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
      message.warning('Vui lòng chọn loại báo cáo đối chiếu');
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
        message.success(`Đã tải báo cáo: ${reconciliationReports.find(r => r.id === selectedReport)?.name}`);
      }
    } catch (err: unknown) {
      console.warn('Error loading reconciliation report:', err);
      message.warning('Không thể tải báo cáo. Vui lòng thử lại.');
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
          { title: 'Mã NCC', dataIndex: 'supplierCode', key: 'supplierCode', width: 100 },
          { title: 'Tên NCC', dataIndex: 'supplierName', key: 'supplierName', width: 200 },
          { title: 'Số mặt hàng', dataIndex: 'itemCount', key: 'itemCount', width: 100, align: 'right' as const },
          { title: 'Số phiếu nhập', dataIndex: 'receiptCount', key: 'receiptCount', width: 100, align: 'right' as const },
          { title: 'Giá trị HĐ', dataIndex: 'contractValue', key: 'contractValue', width: 140, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Giá trị giao', dataIndex: 'deliveredValue', key: 'deliveredValue', width: 140, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tỷ lệ thực hiện', dataIndex: 'fulfillmentRate', key: 'fulfillmentRate', width: 110, align: 'right' as const, render: (v: number) => fmtPct(v) },
          { title: 'Ngày giao cuối', dataIndex: 'lastDeliveryDate', key: 'lastDeliveryDate', width: 120 },
        ] as ColumnsType<SupplierProcurementItemDto>;

      case 'revenue-by-record':
        return [
          { title: 'Mã HSBA', dataIndex: 'medicalRecordCode', key: 'medicalRecordCode', width: 100 },
          { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
          { title: 'DT Dịch vụ', dataIndex: 'serviceRevenue', key: 'serviceRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'DT Thuốc', dataIndex: 'medicineRevenue', key: 'medicineRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng DT', dataIndex: 'totalRevenue', key: 'totalRevenue', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng CP', dataIndex: 'totalCost', key: 'totalCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Lợi nhuận', dataIndex: 'profit', key: 'profit', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Tỷ suất', dataIndex: 'profitMargin', key: 'profitMargin', width: 90, align: 'right' as const, render: (v: number) => fmtPct(v) },
        ] as ColumnsType<RevenueByRecordItemDto>;

      case 'dept-cost-vs-fees':
        return [
          { title: 'Mã khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Tên khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'CP Dịch vụ', dataIndex: 'serviceCost', key: 'serviceCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'CP Thuốc', dataIndex: 'medicineCost', key: 'medicineCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng CP khoa', dataIndex: 'totalDeptCost', key: 'totalDeptCost', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng VP thu', dataIndex: 'totalHospitalFees', key: 'totalHospitalFees', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: '% CL', dataIndex: 'differencePercent', key: 'differencePercent', width: 80, align: 'right' as const, render: (v: number) => fmtPct(v) },
        ] as ColumnsType<DeptCostVsFeesItemDto>;

      case 'record-cost-summary':
        return [
          { title: 'Mã HSBA', dataIndex: 'medicalRecordCode', key: 'medicalRecordCode', width: 100 },
          { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
          { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 120 },
          { title: 'DV sử dụng', dataIndex: 'serviceUsed', key: 'serviceUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Thuốc sử dụng', dataIndex: 'medicineUsed', key: 'medicineUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng sử dụng', dataIndex: 'totalUsed', key: 'totalUsed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng đã thu', dataIndex: 'totalCollected', key: 'totalCollected', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => {
            const color = s === 'Match' ? 'green' : s === 'Overcharged' ? 'orange' : 'red';
            const text = s === 'Match' ? 'Khớp' : s === 'Overcharged' ? 'Thu đủ' : 'Thu thiếu';
            return <Tag color={color}>{text}</Tag>;
          }},
        ] as ColumnsType<RecordCostSummaryItemDto>;

      case 'fees-vs-standards':
        return [
          { title: 'Mã DV', dataIndex: 'serviceCode', key: 'serviceCode', width: 90 },
          { title: 'Tên dịch vụ', dataIndex: 'serviceName', key: 'serviceName', width: 200 },
          { title: 'Số lần', dataIndex: 'usageCount', key: 'usageCount', width: 80, align: 'right' as const },
          { title: 'Giá định mức', dataIndex: 'standardPrice', key: 'standardPrice', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Giá TB thực tế', dataIndex: 'actualAvgPrice', key: 'actualAvgPrice', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng định mức', dataIndex: 'totalStandardAmount', key: 'totalStandardAmount', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng thực tế', dataIndex: 'totalActualAmount', key: 'totalActualAmount', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', width: 110, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={s === 'WithinStandard' ? 'green' : 'red'}>{s === 'WithinStandard' ? 'Đạt' : 'Vượt'}</Tag> },
        ] as ColumnsType<FeesVsStandardsItemDto>;

      case 'service-order-doctors':
        return [
          { title: 'Mã phiếu', dataIndex: 'requestCode', key: 'requestCode', width: 110 },
          { title: 'Ngày', dataIndex: 'requestDate', key: 'requestDate', width: 100, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '' },
          { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 140 },
          { title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName', width: 160 },
          { title: 'BS chỉ định', dataIndex: 'orderingDoctorName', key: 'orderingDoctorName', width: 140 },
          { title: 'Khoa CĐ', dataIndex: 'orderingDepartmentName', key: 'orderingDepartmentName', width: 120 },
          { title: 'BS thực hiện', dataIndex: 'executingDoctorName', key: 'executingDoctorName', width: 140, render: (v: string) => v || <Text type="secondary">Chưa có</Text> },
          { title: 'Khoa TH', dataIndex: 'executingDepartmentName', key: 'executingDepartmentName', width: 120 },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120, render: (s: string) => {
            const color = s === 'SameDoctor' ? 'green' : s === 'DifferentDoctor' ? 'blue' : 'orange';
            const text = s === 'SameDoctor' ? 'Cùng BS' : s === 'DifferentDoctor' ? 'Khác BS' : 'Chưa TH';
            return <Tag color={color}>{text}</Tag>;
          }},
        ] as ColumnsType<ServiceOrderDoctorsItemDto>;

      case 'dispensing-vs-billing':
        return [
          { title: 'Mã khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Tên khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'Thuốc xuất', dataIndex: 'medicineDispensed', key: 'medicineDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT xuất', dataIndex: 'supplyDispensed', key: 'supplyDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng xuất', dataIndex: 'totalDispensed', key: 'totalDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Thuốc thu', dataIndex: 'medicineBilled', key: 'medicineBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT thu', dataIndex: 'supplyBilled', key: 'supplyBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng thu', dataIndex: 'totalBilled', key: 'totalBilled', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
        ] as ColumnsType<DispensingVsBillingItemDto>;

      case 'dispensing-vs-standards':
        return [
          { title: 'Mã khoa', dataIndex: 'departmentCode', key: 'departmentCode', width: 90 },
          { title: 'Tên khoa', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
          { title: 'Số BN', dataIndex: 'patientCount', key: 'patientCount', width: 80, align: 'right' as const },
          { title: 'Thuốc xuất', dataIndex: 'medicineDispensed', key: 'medicineDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'VT xuất', dataIndex: 'supplyDispensed', key: 'supplyDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng xuất', dataIndex: 'totalDispensed', key: 'totalDispensed', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'ĐM/BN', dataIndex: 'standardPerPatient', key: 'standardPerPatient', width: 100, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Tổng ĐM', dataIndex: 'totalStandard', key: 'totalStandard', width: 120, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
          { title: 'Chênh lệch', dataIndex: 'difference', key: 'difference', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: Math.abs(v) < 1 ? '#52c41a' : '#ff4d4f' }}>{fmtNum(Math.round(v))}</span> },
          { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <Tag color={s === 'WithinStandard' ? 'green' : 'red'}>{s === 'WithinStandard' ? 'Đạt' : 'Vượt'}</Tag> },
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
            <Col span={6}><Statistic title="Tổng NCC" value={summaryData.totalSuppliers} /></Col>
            <Col span={6}><Statistic title="Tổng mặt hàng" value={summaryData.totalItems} /></Col>
            <Col span={6}><Statistic title="Giá trị hợp đồng" value={fmtMoney(summaryData.totalContractValue)} /></Col>
            <Col span={6}><Statistic title="Tỷ lệ thực hiện" value={fmtPct(summaryData.fulfillmentRate)} /></Col>
          </Row>
        );
      case 'revenue-by-record':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={5}><Statistic title="Tổng HSBA" value={summaryData.totalRecords} /></Col>
            <Col span={5}><Statistic title="Tổng doanh thu" value={fmtMoney(summaryData.totalRevenue)} /></Col>
            <Col span={5}><Statistic title="Tổng chi phí" value={fmtMoney(summaryData.totalCost)} /></Col>
            <Col span={5}><Statistic title="Tổng lợi nhuận" value={fmtMoney(summaryData.totalProfit)} styles={{ content: { color: summaryData.totalProfit >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
            <Col span={4}><Statistic title="TB tỷ suất LN" value={fmtPct(summaryData.averageProfitMargin)} /></Col>
          </Row>
        );
      case 'dept-cost-vs-fees':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Statistic title="Tổng CP khoa phòng" value={fmtMoney(summaryData.totalDeptCost)} /></Col>
            <Col span={8}><Statistic title="Tổng VP thu" value={fmtMoney(summaryData.totalHospitalFees)} /></Col>
            <Col span={8}><Statistic title="Chênh lệch" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'record-cost-summary':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Statistic title="Tổng HSBA" value={summaryData.totalRecords} /></Col>
            <Col span={5}><Statistic title="Tổng sử dụng" value={fmtMoney(summaryData.totalUsed)} /></Col>
            <Col span={5}><Statistic title="Tổng đã thu" value={fmtMoney(summaryData.totalCollected)} /></Col>
            <Col span={4}><Statistic title="Chênh lệch" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
            <Col span={3}><Statistic title="Thu đủ" value={summaryData.overchargedCount} styles={{ content: { color: '#fa8c16' } }} /></Col>
            <Col span={3}><Statistic title="Thu thiếu" value={summaryData.underchargedCount} styles={{ content: { color: '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'fees-vs-standards':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}><Statistic title="Tổng DV" value={summaryData.totalServices} /></Col>
            <Col span={5}><Statistic title="Tổng thực tế" value={fmtMoney(summaryData.totalActualFees)} /></Col>
            <Col span={5}><Statistic title="Tổng định mức" value={fmtMoney(summaryData.totalStandardFees)} /></Col>
            <Col span={5}><Statistic title="Đạt định mức" value={summaryData.withinStandardCount} styles={{ content: { color: '#52c41a' } }} /></Col>
            <Col span={5}><Statistic title="Vượt định mức" value={summaryData.exceedStandardCount} styles={{ content: { color: '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'service-order-doctors':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title="Tổng chỉ định" value={summaryData.totalOrders} /></Col>
            <Col span={6}><Statistic title="Cùng BS" value={summaryData.sameDoctorCount} styles={{ content: { color: '#52c41a' } }} /></Col>
            <Col span={6}><Statistic title="Khác BS" value={summaryData.differentDoctorCount} styles={{ content: { color: '#1890ff' } }} /></Col>
            <Col span={6}><Statistic title="Chưa TH" value={summaryData.noExecutorCount} styles={{ content: { color: '#fa8c16' } }} /></Col>
          </Row>
        );
      case 'dispensing-vs-billing':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Statistic title="Tổng xuất kho" value={fmtMoney(summaryData.totalDispensed)} /></Col>
            <Col span={8}><Statistic title="Tổng viện phí thu" value={fmtMoney(summaryData.totalBilled)} /></Col>
            <Col span={8}><Statistic title="Chênh lệch" value={fmtMoney(summaryData.totalDifference)} styles={{ content: { color: summaryData.totalDifference >= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
          </Row>
        );
      case 'dispensing-vs-standards':
        return (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title="Tổng khoa" value={summaryData.totalDepartments} /></Col>
            <Col span={6}><Statistic title="Tổng xuất kho" value={fmtMoney(summaryData.totalDispensed)} /></Col>
            <Col span={6}><Statistic title="Tổng định mức" value={fmtMoney(summaryData.totalStandard)} /></Col>
            <Col span={6}><Statistic title="Chênh lệch" value={fmtMoney(summaryData.totalDispensed - summaryData.totalStandard)} styles={{ content: { color: (summaryData.totalDispensed - summaryData.totalStandard) <= 0 ? '#52c41a' : '#ff4d4f' } }} /></Col>
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
          title="Đối chiếu Level 6 - Theo TT 54/2017/TT-BYT, TT 32/2023/TT-BYT"
          description="8 báo cáo đối chiếu dành cho bệnh viện hạng 6. Chọn loại báo cáo để bắt đầu."
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
            <Text strong>Thời gian:</Text>
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
            <Text strong>{currentReport?.hasSupplierFilter ? 'NCC:' : 'Khoa/Phòng:'}</Text>
            <br />
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              allowClear
              placeholder={currentReport?.hasSupplierFilter ? 'Tất cả NCC' : 'Tất cả khoa/phòng'}
            >
              {!currentReport?.hasSupplierFilter && (
                <>
                  <Select.Option value="noi">Khoa Nội</Select.Option>
                  <Select.Option value="ngoai">Khoa Ngoại</Select.Option>
                  <Select.Option value="san">Khoa Sản</Select.Option>
                  <Select.Option value="nhi">Khoa Nhi</Select.Option>
                  <Select.Option value="xn">Khoa Xét nghiệm</Select.Option>
                  <Select.Option value="cdha">Khoa CĐHA</Select.Option>
                  <Select.Option value="duoc">Khoa Dược</Select.Option>
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
              Chạy báo cáo
            </Button>
          </Col>
        </Row>

        <Divider />

        <Spin spinning={loading} tip="Đang tải dữ liệu...">
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
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} dòng` }}
              bordered
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <FileSearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <br />
              <Text type="secondary">Chọn thời gian và nhấn "Chạy báo cáo" để xem dữ liệu</Text>
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
  const [dataViewVisible, setDataViewVisible] = useState(false);
  const [dataViewResult, setDataViewResult] = useState<HospitalReportResult | null>(null);

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
      message.warning('Vui lòng chọn báo cáo');
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
          message.warning('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để in báo cáo.');
        }
      } else {
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.${extension}`;
        downloadBlob(blob, filename);
        message.success(`Đã xuất báo cáo ra ${formatName} thành công`);
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error exporting report:', error);
      message.warning(`Xuất báo cáo ra ${formatName} thất bại. Vui lòng thử lại.`);
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
      message.warning('Xem trước báo cáo thất bại. Vui lòng thử lại.');
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
      message.success(`Đã tải xuống: ${reportName}`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error downloading report:', error);
      message.warning('Tải xuống báo cáo thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department, warehouseId]);

  // View data via unified HospitalReportController
  const handleViewData = useCallback(async (reportId: string, reportName: string) => {
    const mapping = reportApiMapping[reportId];
    if (!mapping) return;
    setExporting(true);
    try {
      const fromDate = dateRange[0].format('YYYY-MM-DD');
      const toDate = dateRange[1].format('YYYY-MM-DD');
      const deptId = departmentIdMap[department] || undefined;
      const whId = warehouseId || undefined;
      const res = await hospitalReportApi.getReport(mapping.reportType, fromDate, toDate, deptId, whId);
      const data = res.data as unknown as HospitalReportResult;
      setDataViewResult(data);
      setDataViewVisible(true);
    } catch {
      console.warn('Error viewing report data');
      message.warning('Không thể tải dữ liệu báo cáo');
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
      <Spin spinning={exporting} tip="Đang xử lý báo cáo...">
        <Row gutter={16}>
          {/* Left panel - Report categories + search */}
          <Col span={6}>
            <Card
              title={
                <Space>
                  <FolderOpenOutlined />
                  <span>Danh mục ({totalReportCount} báo cáo)</span>
                </Space>
              }
              size="small"
            >
              <Search
                placeholder="Tìm báo cáo (tên, mã 9.xx)..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              {filteredReports ? (
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Tìm thấy {filteredReports.length} báo cáo
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
                  <Text strong>Thời gian:</Text>
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
                  <Text strong>Khoa/Phòng:</Text>
                  <br />
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    defaultValue="all"
                    onChange={(value) => setDepartment(value)}
                  >
                    <Select.Option value="all">Tất cả khoa/phòng</Select.Option>
                    <Select.Option value="noi">Khoa Nội</Select.Option>
                    <Select.Option value="ngoai">Khoa Ngoại</Select.Option>
                    <Select.Option value="san">Khoa Sản</Select.Option>
                    <Select.Option value="nhi">Khoa Nhi</Select.Option>
                    <Select.Option value="xn">Khoa Xét nghiệm</Select.Option>
                    <Select.Option value="cdha">Khoa CĐHA</Select.Option>
                    <Select.Option value="duoc">Khoa Dược</Select.Option>
                    <Select.Option value="cap_cuu">Khoa Cấp cứu</Select.Option>
                    <Select.Option value="hscc">HSCC</Select.Option>
                    <Select.Option value="phcn">Khoa PHCN</Select.Option>
                    <Select.Option value="tmh">Khoa TMH</Select.Option>
                    <Select.Option value="mat">Khoa Mắt</Select.Option>
                    <Select.Option value="rhm">Khoa RHM</Select.Option>
                    <Select.Option value="da_lieu">Khoa Da liễu</Select.Option>
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
                      placeholder="Tất cả kho"
                    >
                      <Select.Option value="kho_thuoc">Kho Thuốc</Select.Option>
                      <Select.Option value="kho_vtyt">Kho VTYT</Select.Option>
                      <Select.Option value="kho_hc">Kho Hóa chất</Select.Option>
                      <Select.Option value="tu_truc">Tủ trực</Select.Option>
                      <Select.Option value="nha_thuoc">Nhà thuốc</Select.Option>
                    </Select>
                  </Col>
                )}
                <Col span={isPharmacyCategory ? 8 : 8}>
                  <Text strong>Xuất báo cáo:</Text>
                  <br />
                  <Space style={{ marginTop: 8 }}>
                    <Tooltip title="Xuất Excel">
                      <Button
                        icon={<FileExcelOutlined />}
                        onClick={() => handleExport('excel')}
                        loading={exporting}
                        style={{ backgroundColor: '#52c41a', color: 'white' }}
                      >
                        Excel
                      </Button>
                    </Tooltip>
                    <Tooltip title="Xuất PDF">
                      <Button
                        icon={<FilePdfOutlined />}
                        onClick={() => handleExport('pdf')}
                        loading={exporting}
                        danger
                      >
                        PDF
                      </Button>
                    </Tooltip>
                    <Tooltip title="In báo cáo">
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
                                Xem trước
                              </Button>
                              <Button
                                size="small"
                                icon={<BarChartOutlined />}
                                loading={exporting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewData(item.id, item.name);
                                }}
                              >
                                Dữ liệu
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
                                Tải xuống
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
            <Card title="Báo cáo thường dùng" size="small" style={{ marginTop: 12 }}>
              <Row gutter={[12, 12]}>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<BarChartOutlined />}
                    onClick={() => { setActiveCategory('clinical'); setSelectedReport('r9_7'); }}
                  >
                    HĐ khám bệnh
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<HomeOutlined />}
                    onClick={() => { setActiveCategory('inpatient'); setSelectedReport('r9_6'); }}
                  >
                    Giao ban giường
                  </Button>
                </Col>
                <Col span={4}>
                  <Button
                    block
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={() => { setActiveCategory('finance'); setSelectedReport('r9_42'); }}
                  >
                    TH viện phí
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
                    TH hoạt động CLS
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
            Tải xuống Excel
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

      {/* Data View Modal - unified HospitalReportController */}
      <Modal
        title={dataViewResult ? `${dataViewResult.reportName} [${dataViewResult.reportCode}]` : 'Dữ liệu báo cáo'}
        open={dataViewVisible}
        onCancel={() => setDataViewVisible(false)}
        footer={<Button onClick={() => setDataViewVisible(false)}>Đóng</Button>}
        width={1000}
        styles={{ body: { maxHeight: 500, overflow: 'auto' } }}
      >
        {dataViewResult && (
          <>
            {Object.keys(dataViewResult.summary).length > 0 && (
              <Card size="small" style={{ marginBottom: 12 }}>
                <Row gutter={16}>
                  {Object.entries(dataViewResult.summary).map(([key, val]) => (
                    <Col span={6} key={key}>
                      <Statistic title={key} value={typeof val === 'number' ? val : String(val ?? '')} />
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
            <Table
              dataSource={dataViewResult.data.map((row, i) => ({ ...row, _key: i }))}
              rowKey="_key"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
              columns={dataViewResult.columns.filter(c => c !== '_key').map(col => ({
                title: col,
                dataIndex: col,
                key: col,
                width: 150,
                render: (v: unknown) => typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? ''),
              }))}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Tạo lúc: {dayjs(dataViewResult.generatedAt).format('DD/MM/YYYY HH:mm:ss')} | {dataViewResult.data.length} dòng
            </Text>
          </>
        )}
      </Modal>
    </>
  );
};

// ============================================================================
// Dynamic Report Builder (NangCap4 8.4)
// ============================================================================

interface ReportField {
  id: string; name: string; source: string; formula?: string; format?: string; width?: number;
}

interface CustomReportDef {
  id: string; name: string; description: string; dataSource: string;
  fields: ReportField[]; filters: { field: string; operator: string; value: string }[];
  groupBy?: string; sortBy?: string; sortDir?: string; createdAt: string;
}

const DATA_SOURCES = [
  { value: 'patients', label: 'Bệnh nhân', fields: ['patientCode', 'fullName', 'dateOfBirth', 'gender', 'phoneNumber', 'address', 'insuranceNumber', 'patientType'] },
  { value: 'examinations', label: 'Khám bệnh', fields: ['examDate', 'patientName', 'doctorName', 'departmentName', 'mainIcdCode', 'mainIcdName', 'status', 'queueNumber'] },
  { value: 'prescriptions', label: 'Đơn thuốc', fields: ['prescriptionDate', 'patientName', 'doctorName', 'medicineName', 'dosage', 'quantity', 'unit', 'totalAmount'] },
  { value: 'labRequests', label: 'Xét nghiệm', fields: ['requestDate', 'patientName', 'testName', 'result', 'unit', 'referenceRange', 'abnormalFlag', 'status'] },
  { value: 'admissions', label: 'Nội trú', fields: ['admissionDate', 'patientName', 'departmentName', 'bedNumber', 'diagnosisName', 'attendingDoctor', 'status', 'dischargeDate'] },
  { value: 'billing', label: 'Thu ngân', fields: ['receiptDate', 'patientName', 'totalAmount', 'paidAmount', 'discountAmount', 'insuranceCovered', 'paymentMethod', 'status'] },
  { value: 'pharmacy', label: 'Dược', fields: ['medicineName', 'batchNumber', 'expiryDate', 'stockQuantity', 'unit', 'unitPrice', 'supplier', 'warehouseName'] },
  { value: 'services', label: 'Dịch vụ', fields: ['serviceCode', 'serviceName', 'departmentName', 'price', 'insurancePrice', 'category', 'isActive'] },
];

const OPERATORS = [
  { value: 'eq', label: '=' }, { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' }, { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' },
  { value: 'contains', label: 'Chứa' }, { value: 'startsWith', label: 'Bắt đầu' },
];

const FORMATS: { value: string; label: string }[] = [
  { value: 'text', label: 'Văn bản' }, { value: 'number', label: 'Số' },
  { value: 'currency', label: 'Tiền tệ (VNĐ)' }, { value: 'date', label: 'Ngày (DD/MM/YYYY)' },
  { value: 'datetime', label: 'Ngày giờ' }, { value: 'percent', label: 'Phần trăm (%)' },
];

const STORAGE_KEY = 'his_custom_reports';

const ReportBuilderTab: React.FC = () => {
  const [reports, setReports] = useState<CustomReportDef[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [editing, setEditing] = useState<CustomReportDef | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<CustomReportDef | null>(null);
  const [form] = Form.useForm();
  const [fields, setFields] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');

  const saveReports = useCallback((updated: CustomReportDef[]) => {
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const availableFields = useMemo(() => {
    const src = DATA_SOURCES.find(s => s.value === selectedSource);
    return src?.fields || [];
  }, [selectedSource]);

  const handleNewReport = () => {
    setEditing(null);
    setFields([]);
    setFilters([]);
    setSelectedSource('');
    form.resetFields();
    setModalOpen(true);
  };

  const handleEditReport = (r: CustomReportDef) => {
    setEditing(r);
    setFields(r.fields);
    setFilters(r.filters);
    setSelectedSource(r.dataSource);
    form.setFieldsValue({ name: r.name, description: r.description, dataSource: r.dataSource, groupBy: r.groupBy, sortBy: r.sortBy, sortDir: r.sortDir });
    setModalOpen(true);
  };

  const handleDuplicateReport = (r: CustomReportDef) => {
    const copy: CustomReportDef = {
      ...r, id: Date.now().toString(), name: `${r.name} (bản sao)`, createdAt: new Date().toISOString()
    };
    saveReports([...reports, copy]);
    message.success('Đã sao chép báo cáo');
  };

  const handleDeleteReport = (id: string) => {
    saveReports(reports.filter(r => r.id !== id));
    message.success('Đã xóa báo cáo');
  };

  const handleSaveReport = () => {
    form.validateFields().then(values => {
      if (fields.length === 0) { message.warning('Vui lòng thêm ít nhất 1 cột'); return; }
      const report: CustomReportDef = {
        id: editing?.id || Date.now().toString(),
        name: values.name, description: values.description || '',
        dataSource: values.dataSource, fields, filters,
        groupBy: values.groupBy, sortBy: values.sortBy, sortDir: values.sortDir || 'asc',
        createdAt: editing?.createdAt || new Date().toISOString(),
      };
      if (editing) {
        saveReports(reports.map(r => r.id === editing.id ? report : r));
      } else {
        saveReports([...reports, report]);
      }
      message.success(editing ? 'Đã cập nhật báo cáo' : 'Đã tạo báo cáo mới');
      setModalOpen(false);
    });
  };

  const addField = (fieldName: string) => {
    if (fields.find(f => f.source === fieldName)) return;
    setFields([...fields, { id: Date.now().toString(), name: fieldName, source: fieldName, format: 'text', width: 150 }]);
  };

  const removeField = (id: string) => setFields(fields.filter(f => f.id !== id));

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const copy = [...fields];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setFields(copy);
  };

  const updateField = (id: string, key: keyof ReportField, value: string | number) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const addFilter = () => {
    setFilters([...filters, { field: availableFields[0] || '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (idx: number) => setFilters(filters.filter((_, i) => i !== idx));

  const updateFilter = (idx: number, key: string, value: string) => {
    setFilters(filters.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };

  const handlePreview = (r: CustomReportDef) => {
    setPreviewReport(r);
    setPreviewOpen(true);
  };

  const reportColumns: ColumnsType<CustomReportDef> = [
    { title: 'Tên báo cáo', dataIndex: 'name', width: 200 },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    { title: 'Nguồn dữ liệu', dataIndex: 'dataSource', width: 130,
      render: (v: string) => <Tag color="blue">{DATA_SOURCES.find(s => s.value === v)?.label || v}</Tag> },
    { title: 'Số cột', width: 80, render: (_: unknown, r: CustomReportDef) => r.fields.length },
    { title: 'Số bộ lọc', width: 90, render: (_: unknown, r: CustomReportDef) => r.filters.length },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 130, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: '', width: 180, render: (_: unknown, r: CustomReportDef) => (
      <Space>
        <Tooltip title="Xem trước"><Button size="small" icon={<PlayCircleOutlined />} onClick={() => handlePreview(r)} /></Tooltip>
        <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => handleEditReport(r)} /></Tooltip>
        <Tooltip title="Sao chép"><Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicateReport(r)} /></Tooltip>
        <Tooltip title="Xóa"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteReport(r.id)} /></Tooltip>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNewReport}>Tạo báo cáo mới</Button>
          <Text type="secondary">{reports.length} báo cáo tùy chỉnh</Text>
        </Space>
      </div>

      {reports.length === 0 ? (
        <Alert title="Chưa có báo cáo tùy chỉnh" description="Nhấn 'Tạo báo cáo mới' để bắt đầu thiết kế báo cáo với nguồn dữ liệu, cột hiển thị, bộ lọc và công thức tùy chỉnh." type="info" showIcon />
      ) : (
        <Table columns={reportColumns} dataSource={reports} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      )}

      {/* Report Builder Modal */}
      <Modal title={editing ? 'Sửa báo cáo' : 'Tạo báo cáo tùy chỉnh'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={handleSaveReport}
        width={900} okText={<><SaveOutlined /> Lưu</>} destroyOnHidden>
        <Form form={form} layout="vertical" size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="name" label="Tên báo cáo" rules={[{ required: true }]}>
                <Input placeholder="VD: Báo cáo khám bệnh theo khoa" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dataSource" label="Nguồn dữ liệu" rules={[{ required: true }]}>
                <Select options={DATA_SOURCES.map(s => ({ value: s.value, label: s.label }))}
                  onChange={(v) => { setSelectedSource(v); setFields([]); setFilters([]); }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="description" label="Mô tả">
                <Input placeholder="Mô tả ngắn gọn" />
              </Form.Item>
            </Col>
          </Row>

          {/* Column Selection - Drag and Drop Style */}
          <Divider style={{ margin: '8px 0' }}>Cột hiển thị ({fields.length})</Divider>

          {selectedSource && (
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Nhấn để thêm cột:</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {availableFields.map(f => (
                  <Tag key={f} color={fields.find(sf => sf.source === f) ? 'green' : 'default'}
                    style={{ cursor: 'pointer' }} onClick={() => addField(f)}>
                    {fields.find(sf => sf.source === f) ? '✓ ' : '+ '}{f}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <Table size="small" pagination={false} dataSource={fields} rowKey="id"
              columns={[
                { title: '#', width: 60, render: (_: unknown, __: ReportField, idx: number) => (
                  <Space>
                    <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveField(idx, -1)} />
                    <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === fields.length - 1} onClick={() => moveField(idx, 1)} />
                  </Space>
                )},
                { title: 'Trường nguồn', dataIndex: 'source', width: 140 },
                { title: 'Tên hiển thị', width: 140, render: (_: unknown, r: ReportField) => (
                  <Input size="small" value={r.name} onChange={e => updateField(r.id, 'name', e.target.value)} />
                )},
                { title: 'Định dạng', width: 130, render: (_: unknown, r: ReportField) => (
                  <Select size="small" value={r.format} options={FORMATS} style={{ width: '100%' }}
                    onChange={v => updateField(r.id, 'format', v)} />
                )},
                { title: 'Công thức', width: 140, render: (_: unknown, r: ReportField) => (
                  <Input size="small" value={r.formula} placeholder="VD: SUM, COUNT..."
                    onChange={e => updateField(r.id, 'formula', e.target.value)} />
                )},
                { title: 'Độ rộng', width: 80, render: (_: unknown, r: ReportField) => (
                  <Input size="small" type="number" value={r.width}
                    onChange={e => updateField(r.id, 'width', parseInt(e.target.value) || 150)} style={{ width: 70 }} />
                )},
                { title: '', width: 40, render: (_: unknown, r: ReportField) => (
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeField(r.id)} />
                )},
              ]} />
          )}

          {/* Filters */}
          <Divider style={{ margin: '8px 0' }}>Bộ lọc ({filters.length})</Divider>
          {filters.map((f, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 4 }}>
              <Col span={7}>
                <Select size="small" value={f.field} style={{ width: '100%' }}
                  options={availableFields.map(af => ({ value: af, label: af }))}
                  onChange={v => updateFilter(idx, 'field', v)} />
              </Col>
              <Col span={5}>
                <Select size="small" value={f.operator} style={{ width: '100%' }}
                  options={OPERATORS} onChange={v => updateFilter(idx, 'operator', v)} />
              </Col>
              <Col span={9}>
                <Input size="small" value={f.value} placeholder="Giá trị"
                  onChange={e => updateFilter(idx, 'value', e.target.value)} />
              </Col>
              <Col span={3}>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeFilter(idx)} />
              </Col>
            </Row>
          ))}
          {selectedSource && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addFilter}>Thêm bộ lọc</Button>}

          {/* Group/Sort */}
          <Divider style={{ margin: '8px 0' }}>Nhóm &amp; Sắp xếp</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="groupBy" label="Nhóm theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortBy" label="Sắp xếp theo">
                <Select allowClear options={availableFields.map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortDir" label="Chiều sắp xếp" initialValue="asc">
                <Select options={[{ value: 'asc', label: 'Tăng dần' }, { value: 'desc', label: 'Giảm dần' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal title={previewReport?.name || 'Xem trước'} open={previewOpen}
        onCancel={() => setPreviewOpen(false)} footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>In</Button>,
          <Button key="close" onClick={() => setPreviewOpen(false)}>Đóng</Button>,
        ]} width={1000}>
        {previewReport && (
          <div>
            <Alert title={`Nguồn: ${DATA_SOURCES.find(s => s.value === previewReport.dataSource)?.label}`}
              description={`${previewReport.fields.length} cột | ${previewReport.filters.length} bộ lọc | ${previewReport.groupBy ? 'Nhóm: ' + previewReport.groupBy : 'Không nhóm'}`}
              type="info" showIcon style={{ marginBottom: 12 }} />
            <Table size="small" pagination={{ pageSize: 20 }} dataSource={[]}
              columns={previewReport.fields.map(f => ({
                title: f.name, dataIndex: f.source, key: f.id, width: f.width || 150,
                render: (v: unknown) => {
                  if (f.format === 'currency') return `${(v as number || 0).toLocaleString('vi-VN')} đ`;
                  if (f.format === 'date') return v ? dayjs(v as string).format('DD/MM/YYYY') : '';
                  if (f.format === 'datetime') return v ? dayjs(v as string).format('DD/MM/YYYY HH:mm') : '';
                  if (f.format === 'percent') return `${v}%`;
                  return String(v ?? '');
                }
              }))}
              locale={{ emptyText: 'Kết nối API để xem dữ liệu thực. Bảng này hiển thị cấu trúc cột đã thiết kế.' }}
            />
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Cấu trúc: {previewReport.fields.map(f => f.name).join(' | ')}
                {previewReport.filters.length > 0 && ` | Lọc: ${previewReport.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}`}
                {previewReport.sortBy && ` | Sắp xếp: ${previewReport.sortBy} ${previewReport.sortDir}`}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// NangCap10 Report Definitions (Items 376-415)
// ============================================================================

interface Nc10ReportDef {
  id: string;
  name: string;
  description: string;
}

// Tab 1 - BC Chi phi KCB (BHYT Cost Reports) - 10 reports (items 376-385)
const bhytCostReports: Nc10ReportDef[] = [
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

// Tab 2 - BC Hanh chinh & CLS (Administrative & CLS Reports) - 18 reports (items 386-403)
const adminClsReports: Nc10ReportDef[] = [
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

// Tab 3 - BC Duoc (Pharmacy Reports) - 12 reports (items 404-415)
const pharmacyExtReports: Nc10ReportDef[] = [
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

// ============================================================================
// Shared NangCap10 Report Tab Component
// ============================================================================

interface Nc10ReportTabProps {
  reports: Nc10ReportDef[];
  tabColor: string;
  tabIcon: React.ReactNode;
  tabTitle: string;
  tabDescription: string;
  apiFn: (reportId: string, params?: Record<string, unknown>) => Promise<unknown>;
}

const Nc10ReportTab: React.FC<Nc10ReportTabProps> = ({
  reports,
  tabColor,
  tabIcon,
  tabTitle,
  tabDescription,
  apiFn,
}) => {
  const [selectedReport, setSelectedReport] = useState<Nc10ReportDef | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [patientTypeFilter, setPatientTypeFilter] = useState<string | undefined>(undefined);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportColumns, setReportColumns] = useState<ColumnsType<any>>([]);

  const handleOpenReport = useCallback((report: Nc10ReportDef) => {
    setSelectedReport(report);
    setReportData([]);
    setReportColumns([]);
    setDrawerOpen(true);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        fromDate: dateRange[0].format('YYYY-MM-DD'),
        toDate: dateRange[1].format('YYYY-MM-DD'),
      };
      if (departmentFilter) params.departmentId = departmentFilter;
      if (patientTypeFilter) params.patientType = patientTypeFilter;

      const response = await apiFn(selectedReport.id, params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (response as any)?.data;
      if (data && Array.isArray(data.items)) {
        setReportData(data.items);
        if (data.items.length > 0) {
          const cols = Object.keys(data.items[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            width: 150,
            render: (v: unknown) =>
              typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? ''),
          }));
          setReportColumns(cols);
        }
        message.success(`Da tai bao cao: ${selectedReport.name}`);
      } else if (data && Array.isArray(data)) {
        setReportData(data);
        if (data.length > 0) {
          const cols = Object.keys(data[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            width: 150,
            render: (v: unknown) =>
              typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v ?? ''),
          }));
          setReportColumns(cols);
        }
        message.success(`Da tai bao cao: ${selectedReport.name}`);
      } else {
        setReportData([]);
        setReportColumns([]);
        message.warning('Khong co du lieu cho ky bao cao nay');
      }
    } catch {
      console.warn(`Error loading report ${selectedReport.id}`);
      setReportData([]);
      setReportColumns([]);
      message.warning('Bao cao chua co du lieu. He thong se cap nhat sau.');
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, departmentFilter, patientTypeFilter, apiFn]);

  const handleExportExcel = useCallback(() => {
    message.info('Chuc nang xuat Excel dang duoc phat trien. Vui long thu lai sau.');
  }, []);

  return (
    <div>
      <Alert
        title={tabTitle}
        description={tabDescription}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        {reports.map((report) => (
          <Col key={report.id} xs={24} sm={12} md={8}>
            <Card
              hoverable
              size="small"
              style={{ height: '100%', borderLeft: `3px solid ${tabColor}` }}
              onClick={() => handleOpenReport(report)}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Space>
                  {tabIcon}
                  <Text strong style={{ fontSize: 13 }}>{report.name}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {report.description}
                </Text>
                <Button
                  type="primary"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenReport(report);
                  }}
                  style={{ marginTop: 4 }}
                >
                  Xem bao cao
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer
        title={
          <Space>
            {tabIcon}
            <span>{selectedReport?.name || 'Bao cao'}</span>
          </Space>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        destroyOnHidden
      >
        {selectedReport && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Text type="secondary">{selectedReport.description}</Text>
            </Card>

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
                    if (dates) setDateRange([dates[0]!, dates[1]!]);
                  }}
                />
              </Col>
              <Col span={6}>
                <Text strong>Khoa/Phong:</Text>
                <br />
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  allowClear
                  placeholder="Tat ca khoa/phong"
                >
                  <Select.Option value="noi">Khoa Noi</Select.Option>
                  <Select.Option value="ngoai">Khoa Ngoai</Select.Option>
                  <Select.Option value="san">Khoa San</Select.Option>
                  <Select.Option value="nhi">Khoa Nhi</Select.Option>
                  <Select.Option value="xn">Khoa Xet nghiem</Select.Option>
                  <Select.Option value="cdha">Khoa CDHA</Select.Option>
                  <Select.Option value="duoc">Khoa Duoc</Select.Option>
                  <Select.Option value="cap_cuu">Khoa Cap cuu</Select.Option>
                </Select>
              </Col>
              <Col span={5}>
                <Text strong>Doi tuong:</Text>
                <br />
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={patientTypeFilter}
                  onChange={setPatientTypeFilter}
                  allowClear
                  placeholder="Tat ca"
                >
                  <Select.Option value="bhyt">BHYT</Select.Option>
                  <Select.Option value="vp">Vien phi</Select.Option>
                  <Select.Option value="yc">Dich vu</Select.Option>
                </Select>
              </Col>
              <Col span={5}>
                <Text strong>&nbsp;</Text>
                <br />
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleGenerateReport}
                    loading={loading}
                  >
                    Tao bao cao
                  </Button>
                  <Tooltip title="Xuat Excel">
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={handleExportExcel}
                      style={{ backgroundColor: '#52c41a', color: 'white' }}
                    >
                      Excel
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            {/* Report Data Table */}
            <Spin spinning={loading} tip="Dang tai du lieu...">
              {reportData.length > 0 ? (
                <Table
                  columns={reportColumns}
                  dataSource={reportData}
                  rowKey={(_record, index) => `row-${index}`}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Tong: ${total} dong`,
                  }}
                  bordered
                />
              ) : (
                <Empty
                  description={
                    <Text type="secondary">
                      Chon thoi gian va nhan &quot;Tao bao cao&quot; de xem du lieu
                    </Text>
                  }
                  style={{ padding: '40px 0' }}
                />
              )}
            </Spin>
          </div>
        )}
      </Drawer>
    </div>
  );
};

// ============================================================================
// BHYT Cost Reports Tab (Items 376-385)
// ============================================================================

const BhytCostReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={bhytCostReports}
    tabColor="#13c2c2"
    tabIcon={<SafetyCertificateOutlined style={{ color: '#13c2c2' }} />}
    tabTitle="Bao cao Chi phi KCB BHYT (10 bao cao)"
    tabDescription="Cac bieu mau bao cao chi phi kham chua benh BHYT theo quy dinh: mau 16-21/BHYT, C79a-HD, C80a-HD, C79B/C80B-HD, va mau 21/BHYT theo CV 285 BHXH."
    apiFn={getBhytReport}
  />
);

// ============================================================================
// Administrative & CLS Reports Tab (Items 386-403)
// ============================================================================

const AdminClsReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={adminClsReports}
    tabColor="#722ed1"
    tabIcon={<SolutionOutlined style={{ color: '#722ed1' }} />}
    tabTitle="Bao cao Hanh chinh & Can lam sang (18 bao cao)"
    tabDescription="So kham benh, so vao/ra vien, so phau thuat/thu thuat, so xet nghiem/CDHA/noi soi/vi sinh, so luu tru HSBA, bao cao hoat dong kham benh/dieu tri/PTTT/CLS va tai nan thuong tich."
    apiFn={getAdminReport}
  />
);

// ============================================================================
// Pharmacy Reports Tab (Items 404-415)
// ============================================================================

const PharmacyExtReportsTab: React.FC = () => (
  <Nc10ReportTab
    reports={pharmacyExtReports}
    tabColor="#52c41a"
    tabIcon={<ContainerOutlined style={{ color: '#52c41a' }} />}
    tabTitle="Bao cao Duoc (12 bao cao)"
    tabDescription="The kho, bao cao cong tac duoc/su dung thuoc/khang sinh/hoa chat/VTYT, bien ban kiem ke thuoc/hoa chat/VTYT, bien ban xac nhan mat-hong, thanh ly thuoc va so kiem nhap."
    apiFn={getPharmacyReport}
  />
);

// ============================================================================
// Main Reports Component with Tabs
// ============================================================================

const Reports: React.FC = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Hồ sơ bệnh án &amp; Báo cáo thống kê</Title>
        <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()} size="small">Làm mới</Button>
      </div>

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
                <span>Đối chiếu Level 6</span>
                <Badge count={8} style={{ backgroundColor: '#722ed1' }} size="small" />
              </Space>
            ),
            children: <ReconciliationTab />,
          },
          {
            key: 'report-builder',
            label: (
              <Space>
                <BuildOutlined />
                <span>Báo cáo động</span>
              </Space>
            ),
            children: <ReportBuilderTab />,
          },
          {
            key: 'bhyt-cost',
            label: (
              <Space>
                <SafetyCertificateOutlined />
                <span>BC Chi phí KCB</span>
                <Badge count={10} style={{ backgroundColor: '#13c2c2' }} size="small" />
              </Space>
            ),
            children: <BhytCostReportsTab />,
          },
          {
            key: 'admin-cls',
            label: (
              <Space>
                <SolutionOutlined />
                <span>BC Hành chính &amp; CLS</span>
                <Badge count={18} style={{ backgroundColor: '#722ed1' }} size="small" />
              </Space>
            ),
            children: <AdminClsReportsTab />,
          },
          {
            key: 'pharmacy-ext',
            label: (
              <Space>
                <ContainerOutlined />
                <span>BC Dược</span>
                <Badge count={12} style={{ backgroundColor: '#52c41a' }} size="small" />
              </Space>
            ),
            children: <PharmacyExtReportsTab />,
          },
        ]}
      />
    </div>
  );
};

export default Reports;
