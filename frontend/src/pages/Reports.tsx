import React, { useState, useCallback } from 'react';
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

// Map report IDs to their API category so we know which API to call
type ApiCategory = 'finance' | 'pharmacy' | 'statistics';

const reportApiMapping: Record<string, { apiCategory: ApiCategory; reportType: string }> = {
  // General / statistics
  bc_giao_ban:   { apiCategory: 'statistics', reportType: 'DailyBriefing' },
  bc_hoat_dong:  { apiCategory: 'statistics', reportType: 'HospitalActivity' },
  bc_benh_tat:   { apiCategory: 'statistics', reportType: 'DiseaseStatistics' },
  bc_kham_benh:  { apiCategory: 'statistics', reportType: 'ExaminationActivity' },
  bc_dieu_tri:   { apiCategory: 'statistics', reportType: 'TreatmentActivity' },
  bc_pttt:       { apiCategory: 'statistics', reportType: 'SurgeryActivity' },
  bc_cls:        { apiCategory: 'statistics', reportType: 'ParaclinicalActivity' },
  // Pharmacy
  bc_duoc_khoa:       { apiCategory: 'pharmacy', reportType: 'PharmacyDepartment' },
  bc_su_dung_thuoc:   { apiCategory: 'pharmacy', reportType: 'MedicineUsage' },
  bc_khang_sinh:      { apiCategory: 'pharmacy', reportType: 'AntibioticUsage' },
  bc_hoa_chat:        { apiCategory: 'pharmacy', reportType: 'ChemicalUsage' },
  bc_vtyt:            { apiCategory: 'pharmacy', reportType: 'MedicalSupplyUsage' },
  so_gay_nghien:      { apiCategory: 'pharmacy', reportType: 'NarcoticRegister' },
  bc_nxt:             { apiCategory: 'pharmacy', reportType: 'StockMovement' },
  bc_ton_kho:         { apiCategory: 'pharmacy', reportType: 'InventoryAll' },
  bc_15_ngay:         { apiCategory: 'pharmacy', reportType: 'Usage15Days' },
  kiem_ke_thuoc:      { apiCategory: 'pharmacy', reportType: 'DrugInventory' },
  kiem_ke_hc:         { apiCategory: 'pharmacy', reportType: 'ChemicalInventory' },
  kiem_ke_vtyt:       { apiCategory: 'pharmacy', reportType: 'SupplyInventory' },
  // Finance
  bc_doanh_thu: { apiCategory: 'finance', reportType: 'Revenue' },
  bc_chi_phi:   { apiCategory: 'finance', reportType: 'Cost' },
  bc_loi_nhuan: { apiCategory: 'finance', reportType: 'Profit' },
  bc_bhyt:      { apiCategory: 'finance', reportType: 'InsuranceClaim' },
  bc_vien_phi:  { apiCategory: 'finance', reportType: 'HospitalFee' },
  bc_tam_ung:   { apiCategory: 'finance', reportType: 'Deposit' },
  bc_hoan_ung:  { apiCategory: 'finance', reportType: 'Refund' },
  bc_cong_no:   { apiCategory: 'finance', reportType: 'Debt' },
  // Laboratory
  so_xn_sinh_hoa:  { apiCategory: 'statistics', reportType: 'LabBiochemistry' },
  so_xn_vi_sinh:   { apiCategory: 'statistics', reportType: 'LabMicrobiology' },
  so_xn_huyet_hoc: { apiCategory: 'statistics', reportType: 'LabHematology' },
  so_xn_nuoc_tieu: { apiCategory: 'statistics', reportType: 'LabUrinalysis' },
  bc_thong_ke_xn:  { apiCategory: 'statistics', reportType: 'LabStatistics' },
  bc_doanh_thu_xn: { apiCategory: 'finance',    reportType: 'LabRevenue' },
  // Imaging
  so_sieu_am:        { apiCategory: 'statistics', reportType: 'Ultrasound' },
  so_cdha:           { apiCategory: 'statistics', reportType: 'Imaging' },
  so_tdcn:           { apiCategory: 'statistics', reportType: 'FunctionalTest' },
  bc_doanh_thu_cdha: { apiCategory: 'finance',    reportType: 'ImagingRevenue' },
  // Medical records
  ds_hsba:     { apiCategory: 'statistics', reportType: 'MedicalRecordList' },
  bc_luu_tru:  { apiCategory: 'statistics', reportType: 'ArchiveStatus' },
  bc_muon_tra: { apiCategory: 'statistics', reportType: 'BorrowReturn' },
  so_vao_vien: { apiCategory: 'statistics', reportType: 'Admission' },
  so_ra_vien:  { apiCategory: 'statistics', reportType: 'Discharge' },
  // HR
  ds_nhan_vien: { apiCategory: 'statistics', reportType: 'EmployeeList' },
  bc_cham_cong: { apiCategory: 'statistics', reportType: 'Attendance' },
  bc_truc:      { apiCategory: 'statistics', reportType: 'DutySchedule' },
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
};

// Report categories
const reportCategories = {
  general: {
    title: 'Bao cao chung',
    icon: <BarChartOutlined />,
    reports: [
      { id: 'bc_giao_ban', name: 'Bao cao giao ban', description: 'Bao cao hoat dong toan vien theo ngay' },
      { id: 'bc_hoat_dong', name: 'Bao cao hoat dong BV', description: 'Thong ke hoat dong benh vien theo TT27/BYT' },
      { id: 'bc_benh_tat', name: 'Tinh hinh benh tat tu vong', description: 'Bao cao theo QD 4069/2001/QD-BYT' },
      { id: 'bc_kham_benh', name: 'Bao cao hoat dong kham benh', description: 'Thong ke kham benh ngoai tru' },
      { id: 'bc_dieu_tri', name: 'Bao cao hoat dong dieu tri', description: 'Thong ke dieu tri noi tru' },
      { id: 'bc_pttt', name: 'Bao cao hoat dong PTTT', description: 'Thong ke phau thuat thu thuat' },
      { id: 'bc_cls', name: 'Bao cao hoat dong CLS', description: 'Thong ke can lam sang' },
    ],
  },
  pharmacy: {
    title: 'Bao cao Duoc',
    icon: <MedicineBoxOutlined />,
    reports: [
      { id: 'bc_duoc_khoa', name: 'Bao cao cong tac khoa Duoc', description: 'Mau 10D/BV-01/TT22' },
      { id: 'bc_su_dung_thuoc', name: 'Bao cao su dung thuoc', description: 'Mau 05D/BV-01/TT22' },
      { id: 'bc_khang_sinh', name: 'Bao cao su dung khang sinh', description: 'Mau 06D/BV-01/TT22' },
      { id: 'bc_hoa_chat', name: 'Bao cao su dung hoa chat', description: 'Mau 08D/BV-01/TT22' },
      { id: 'bc_vtyt', name: 'Bao cao su dung VTYT tieu hao', description: 'Mau 09D/BV-01/TT22' },
      { id: 'so_gay_nghien', name: 'So thuoc gay nghien, huong than', description: 'Phu luc VIII - TT20/2017' },
      { id: 'bc_nxt', name: 'Bao cao xuat nhap ton', description: 'Bao cao NXT kho thuoc, vat tu' },
      { id: 'bc_ton_kho', name: 'Bao cao ton kho toan vien', description: 'Thong ke ton kho tat ca cac kho' },
      { id: 'bc_15_ngay', name: 'Thong ke 15 ngay su dung', description: 'Mau 16D/BV-01/TT23' },
      { id: 'kiem_ke_thuoc', name: 'Bien ban kiem ke thuoc', description: 'Mau 11D/BV-01/TT22' },
      { id: 'kiem_ke_hc', name: 'Bien ban kiem ke hoa chat', description: 'Mau 12D/BV-01/TT22' },
      { id: 'kiem_ke_vtyt', name: 'Bien ban kiem ke VTYT', description: 'Mau 13D/BV-01/TT22' },
    ],
  },
  finance: {
    title: 'Bao cao Tai chinh',
    icon: <DollarOutlined />,
    reports: [
      { id: 'bc_doanh_thu', name: 'Bao cao doanh thu', description: 'Doanh thu theo khoa/phong' },
      { id: 'bc_chi_phi', name: 'Bao cao chi phi', description: 'Chi phi theo danh muc' },
      { id: 'bc_loi_nhuan', name: 'Bao cao loi nhuan', description: 'Bao cao loi nhuan tong hop' },
      { id: 'bc_bhyt', name: 'Bao cao thanh toan BHYT', description: 'Mau 6556/QD-BYT' },
      { id: 'bc_vien_phi', name: 'Bao cao vien phi', description: 'Bao cao thu vien phi' },
      { id: 'bc_tam_ung', name: 'Bao cao tam ung', description: 'Bao cao thu tam ung' },
      { id: 'bc_hoan_ung', name: 'Bao cao hoan ung', description: 'Bao cao hoan ung benh nhan' },
      { id: 'bc_cong_no', name: 'Bao cao cong no', description: 'Bao cao cong no nha cung cap' },
    ],
  },
  laboratory: {
    title: 'Bao cao Xet nghiem',
    icon: <ExperimentOutlined />,
    reports: [
      { id: 'so_xn_sinh_hoa', name: 'So xet nghiem sinh hoa', description: 'Theo QD 4069' },
      { id: 'so_xn_vi_sinh', name: 'So xet nghiem vi sinh', description: 'Theo QD 4069' },
      { id: 'so_xn_huyet_hoc', name: 'So xet nghiem huyet hoc', description: 'Theo QD 4069' },
      { id: 'so_xn_nuoc_tieu', name: 'So xet nghiem nuoc tieu', description: 'Theo QD 4069' },
      { id: 'bc_thong_ke_xn', name: 'Bao cao thong ke xet nghiem', description: 'Theo loai/ngay/khoa' },
      { id: 'bc_doanh_thu_xn', name: 'Bao cao doanh thu xet nghiem', description: 'Doanh thu khoa XN' },
    ],
  },
  imaging: {
    title: 'Bao cao CDHA',
    icon: <FileTextOutlined />,
    reports: [
      { id: 'so_sieu_am', name: 'So sieu am', description: 'Theo QD 4069' },
      { id: 'so_cdha', name: 'So chan doan hinh anh', description: 'Theo QD 4069' },
      { id: 'so_tdcn', name: 'So tham do chuc nang', description: 'Theo QD 4069' },
      { id: 'bc_doanh_thu_cdha', name: 'Bao cao doanh thu CDHA', description: 'Doanh thu theo chi phi goc' },
    ],
  },
  medical_records: {
    title: 'Quan ly Ho so benh an',
    icon: <FolderOpenOutlined />,
    reports: [
      { id: 'ds_hsba', name: 'Danh sach ho so benh an', description: 'Danh sach HSBA theo thoi gian' },
      { id: 'bc_luu_tru', name: 'Bao cao luu tru benh an', description: 'Thong ke HSBA da/chua luu tru' },
      { id: 'bc_muon_tra', name: 'Bao cao muon/tra ho so', description: 'Theo doi muon tra HSBA' },
      { id: 'so_vao_vien', name: 'So vao vien', description: 'Danh sach benh nhan vao vien' },
      { id: 'so_ra_vien', name: 'So ra vien', description: 'Danh sach benh nhan ra vien' },
    ],
  },
  hr: {
    title: 'Bao cao Nhan su',
    icon: <UserOutlined />,
    reports: [
      { id: 'ds_nhan_vien', name: 'Danh sach nhan vien', description: 'Thong tin nhan vien theo khoa/phong' },
      { id: 'bc_cham_cong', name: 'Bao cao cham cong', description: 'Thong ke cham cong theo thang' },
      { id: 'bc_truc', name: 'Bao cao lich truc', description: 'Lich truc theo khoa/phong' },
    ],
  },
};

/**
 * Helper: call the correct export/print API based on report category and output format.
 * Returns a Blob from the server.
 */
const callReportApi = async (
  reportId: string,
  outputFormat: string,
  dateRange: [dayjs.Dayjs, dayjs.Dayjs],
  department: string
): Promise<Blob> => {
  const mapping = reportApiMapping[reportId];
  if (!mapping) {
    throw new Error(`Khong tim thay cau hinh API cho bao cao: ${reportId}`);
  }

  const fromDate = dateRange[0].format('YYYY-MM-DD');
  const toDate = dateRange[1].format('YYYY-MM-DD');
  const departmentId = departmentIdMap[department];

  const { apiCategory, reportType } = mapping;

  let response: any;

  switch (apiCategory) {
    case 'finance': {
      const request: FinancialReportRequest = {
        reportType,
        fromDate,
        toDate,
        departmentId,
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
        departmentId,
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
        departmentId,
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
 * Helper: find a report name by its ID across all categories.
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
// Reconciliation Report Type Definitions
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
// ReconciliationTab Component
// ============================================================================

const ReconciliationTab: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReconciliationReportId | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summaryData, setSummaryData] = useState<any>(null);

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
          { title: 'Gia tri HĐ', dataIndex: 'contractValue', key: 'contractValue', width: 140, align: 'right' as const, render: (v: number) => fmtNum(Math.round(v)) },
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
              rowKey={(record: any) => record.supplierId || record.medicalRecordId || record.departmentId || record.serviceId || record.serviceRequestId || record.departmentCode || Math.random().toString()} // eslint-disable-line @typescript-eslint/no-explicit-any
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
// Main Reports Component with Tabs
// ============================================================================

const ExistingReportsContent: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [department, setDepartment] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');

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
      const blob = await callReportApi(selectedReport, outputFormat, dateRange, department);

      if (format === 'print') {
        // Open a print window with the HTML content
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
        // Download as file
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
  }, [selectedReport, dateRange, department]);

  // Handle preview: loads HTML and shows in a modal
  const handlePreview = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'html', dateRange, department);
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
  }, [dateRange, department]);

  // Handle download: downloads as Excel by default
  const handleDownload = useCallback(async (reportId: string, reportName: string) => {
    setExporting(true);
    try {
      const blob = await callReportApi(reportId, 'excel', dateRange, department);
      const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`;
      downloadBlob(blob, filename);
      message.success(`Da tai xuong: ${reportName}`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error downloading report:', error);
      message.error('Tai xuong bao cao that bai. Vui long thu lai.');
    } finally {
      setExporting(false);
    }
  }, [dateRange, department]);

  // Get all reports for search
  const allReports = Object.values(reportCategories).flatMap(cat =>
    cat.reports.map(r => ({ ...r, category: cat.title }))
  );

  // Filter reports by search
  const filteredReports = searchText
    ? allReports.filter(
        r =>
          r.name.toLowerCase().includes(searchText.toLowerCase()) ||
          r.description.toLowerCase().includes(searchText.toLowerCase())
      )
    : null;

  const currentCategory = reportCategories[activeCategory as keyof typeof reportCategories];

  return (
    <>
      <Spin spinning={exporting} tip="Dang xu ly bao cao...">
        <Row gutter={16}>
          {/* Left panel - Report categories */}
          <Col span={6}>
            <Card title="Danh muc bao cao" size="small">
              <Search
                placeholder="Tim bao cao..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 16 }}
              />

              {filteredReports ? (
                <div>
                  {filteredReports.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedReport === item.id ? '#e6f7ff' : 'transparent',
                        padding: '8px',
                        borderRadius: 4,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                      onClick={() => setSelectedReport(item.id)}
                    >
                      <Text strong={selectedReport === item.id}>{item.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.category}</Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Tabs
                  tabPlacement="left"
                  activeKey={activeCategory}
                  onChange={setActiveCategory}
                  items={Object.entries(reportCategories).map(([key, value]) => ({
                    key,
                    label: (
                      <Space>
                        {value.icon}
                        <span>{value.title}</span>
                      </Space>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>

          {/* Right panel - Report list and options */}
          <Col span={18}>
            <Card
              title={
                <Space>
                  {currentCategory?.icon}
                  <span>{currentCategory?.title}</span>
                </Space>
              }
            >
              {/* Report options */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
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
                <Col span={8}>
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
                  </Select>
                </Col>
                <Col span={8}>
                  <Text strong>Xuat bao cao:</Text>
                  <br />
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={() => handleExport('excel')}
                      loading={exporting}
                      style={{ backgroundColor: '#52c41a', color: 'white' }}
                    >
                      Excel
                    </Button>
                    <Button
                      icon={<FilePdfOutlined />}
                      onClick={() => handleExport('pdf')}
                      loading={exporting}
                      danger
                    >
                      PDF
                    </Button>
                    <Button
                      icon={<PrinterOutlined />}
                      onClick={() => handleExport('print')}
                      loading={exporting}
                    >
                      In
                    </Button>
                  </Space>
                </Col>
              </Row>

              <Divider />

              {/* Report list */}
              <Row gutter={[16, 16]}>
                {(currentCategory?.reports || []).map((item) => (
                  <Col key={item.id} span={12}>
                    <Card
                      hoverable
                      size="small"
                      style={{
                        borderColor: selectedReport === item.id ? '#1890ff' : undefined,
                        backgroundColor: selectedReport === item.id ? '#e6f7ff' : undefined,
                      }}
                      onClick={() => setSelectedReport(item.id)}
                    >
                      <Space orientation="vertical" style={{ width: '100%' }}>
                        <Space>
                          <FileTextOutlined style={{ color: '#1890ff' }} />
                          <Text strong>{item.name}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                        {selectedReport === item.id && (
                          <Space style={{ marginTop: 8 }}>
                            <Button
                              type="primary"
                              size="small"
                              icon={<EyeOutlined />}
                              loading={exporting}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(item.id, item.name);
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
            </Card>

            {/* Quick access to common reports */}
            <Card title="Bao cao thuong dung" style={{ marginTop: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Button
                    block
                    icon={<BarChartOutlined />}
                    onClick={() => {
                      setActiveCategory('general');
                      setSelectedReport('bc_giao_ban');
                    }}
                  >
                    Bao cao giao ban
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    block
                    icon={<DollarOutlined />}
                    onClick={() => {
                      setActiveCategory('finance');
                      setSelectedReport('bc_doanh_thu');
                    }}
                  >
                    Bao cao doanh thu
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    block
                    icon={<MedicineBoxOutlined />}
                    onClick={() => {
                      setActiveCategory('pharmacy');
                      setSelectedReport('bc_nxt');
                    }}
                  >
                    Bao cao NXT kho
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    block
                    icon={<FileTextOutlined />}
                    onClick={() => {
                      setActiveCategory('finance');
                      setSelectedReport('bc_bhyt');
                    }}
                  >
                    Bang ke BHYT
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

const Reports: React.FC = () => {
  return (
    <div>
      <Title level={4}>Ho so benh an & Bao cao thong ke</Title>

      <Tabs
        items={[
          {
            key: 'reports',
            label: (
              <Space>
                <BarChartOutlined />
                <span>Bao cao</span>
              </Space>
            ),
            children: <ExistingReportsContent />,
          },
          {
            key: 'reconciliation',
            label: (
              <Space>
                <AuditOutlined />
                <span>Doi chieu Level 6</span>
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
