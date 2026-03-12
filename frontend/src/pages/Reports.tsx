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
    title: 'Báo cáo chung',
    icon: <BarChartOutlined />,
    reports: [
      { id: 'bc_giao_ban', name: 'Báo cáo giao ban', description: 'Báo cáo hoạt động toàn viện theo ngày' },
      { id: 'bc_hoat_dong', name: 'Báo cáo hoạt động BV', description: 'Thống kê hoạt động bệnh viện theo TT27/BYT' },
      { id: 'bc_benh_tat', name: 'Tình hình bệnh tật tử vong', description: 'Báo cáo theo QĐ 4069/2001/QĐ-BYT' },
      { id: 'bc_kham_benh', name: 'Báo cáo hoạt động khám bệnh', description: 'Thống kê khám bệnh ngoại trú' },
      { id: 'bc_dieu_tri', name: 'Báo cáo hoạt động điều trị', description: 'Thống kê điều trị nội trú' },
      { id: 'bc_pttt', name: 'Báo cáo hoạt động PTTT', description: 'Thống kê phẫu thuật thủ thuật' },
      { id: 'bc_cls', name: 'Báo cáo hoạt động CLS', description: 'Thống kê cận lâm sàng' },
    ],
  },
  pharmacy: {
    title: 'Báo cáo Dược',
    icon: <MedicineBoxOutlined />,
    reports: [
      { id: 'bc_duoc_khoa', name: 'Báo cáo công tác khoa Dược', description: 'Mẫu 10D/BV-01/TT22' },
      { id: 'bc_su_dung_thuoc', name: 'Báo cáo sử dụng thuốc', description: 'Mẫu 05D/BV-01/TT22' },
      { id: 'bc_khang_sinh', name: 'Báo cáo sử dụng kháng sinh', description: 'Mẫu 06D/BV-01/TT22' },
      { id: 'bc_hoa_chat', name: 'Báo cáo sử dụng hóa chất', description: 'Mẫu 08D/BV-01/TT22' },
      { id: 'bc_vtyt', name: 'Báo cáo sử dụng VTYT tiêu hao', description: 'Mẫu 09D/BV-01/TT22' },
      { id: 'so_gay_nghien', name: 'Sổ thuốc gây nghiện, hướng thần', description: 'Phụ lục VIII - TT20/2017' },
      { id: 'bc_nxt', name: 'Báo cáo xuất nhập tồn', description: 'Báo cáo NXT kho thuốc, vật tư' },
      { id: 'bc_ton_kho', name: 'Báo cáo tồn kho toàn viện', description: 'Thống kê tồn kho tất cả các kho' },
      { id: 'bc_15_ngay', name: 'Thống kê 15 ngày sử dụng', description: 'Mẫu 16D/BV-01/TT23' },
      { id: 'kiem_ke_thuoc', name: 'Biên bản kiểm kê thuốc', description: 'Mẫu 11D/BV-01/TT22' },
      { id: 'kiem_ke_hc', name: 'Biên bản kiểm kê hóa chất', description: 'Mẫu 12D/BV-01/TT22' },
      { id: 'kiem_ke_vtyt', name: 'Biên bản kiểm kê VTYT', description: 'Mẫu 13D/BV-01/TT22' },
    ],
  },
  finance: {
    title: 'Báo cáo Tài chính',
    icon: <DollarOutlined />,
    reports: [
      { id: 'bc_doanh_thu', name: 'Báo cáo doanh thu', description: 'Doanh thu theo khoa/phòng' },
      { id: 'bc_chi_phi', name: 'Báo cáo chi phí', description: 'Chi phí theo danh mục' },
      { id: 'bc_loi_nhuan', name: 'Báo cáo lợi nhuận', description: 'Báo cáo lợi nhuận tổng hợp' },
      { id: 'bc_bhyt', name: 'Báo cáo thanh toán BHYT', description: 'Mẫu 6556/QĐ-BYT' },
      { id: 'bc_vien_phi', name: 'Báo cáo viện phí', description: 'Báo cáo thu viện phí' },
      { id: 'bc_tam_ung', name: 'Báo cáo tạm ứng', description: 'Báo cáo thu tạm ứng' },
      { id: 'bc_hoan_ung', name: 'Báo cáo hoàn ứng', description: 'Báo cáo hoàn ứng bệnh nhân' },
      { id: 'bc_cong_no', name: 'Báo cáo công nợ', description: 'Báo cáo công nợ nhà cung cấp' },
    ],
  },
  laboratory: {
    title: 'Báo cáo Xét nghiệm',
    icon: <ExperimentOutlined />,
    reports: [
      { id: 'so_xn_sinh_hoa', name: 'Sổ xét nghiệm sinh hóa', description: 'Theo QĐ 4069' },
      { id: 'so_xn_vi_sinh', name: 'Sổ xét nghiệm vi sinh', description: 'Theo QĐ 4069' },
      { id: 'so_xn_huyet_hoc', name: 'Sổ xét nghiệm huyết học', description: 'Theo QĐ 4069' },
      { id: 'so_xn_nuoc_tieu', name: 'Sổ xét nghiệm nước tiểu', description: 'Theo QĐ 4069' },
      { id: 'bc_thong_ke_xn', name: 'Báo cáo thống kê xét nghiệm', description: 'Theo loại/ngày/khoa' },
      { id: 'bc_doanh_thu_xn', name: 'Báo cáo doanh thu xét nghiệm', description: 'Doanh thu khoa XN' },
    ],
  },
  imaging: {
    title: 'Báo cáo CĐHA',
    icon: <FileTextOutlined />,
    reports: [
      { id: 'so_sieu_am', name: 'Sổ siêu âm', description: 'Theo QĐ 4069' },
      { id: 'so_cdha', name: 'Sổ chẩn đoán hình ảnh', description: 'Theo QĐ 4069' },
      { id: 'so_tdcn', name: 'Sổ thăm dò chức năng', description: 'Theo QĐ 4069' },
      { id: 'bc_doanh_thu_cdha', name: 'Báo cáo doanh thu CĐHA', description: 'Doanh thu theo chi phí gốc' },
    ],
  },
  medical_records: {
    title: 'Quản lý Hồ sơ bệnh án',
    icon: <FolderOpenOutlined />,
    reports: [
      { id: 'ds_hsba', name: 'Danh sách hồ sơ bệnh án', description: 'Danh sách HSBA theo thời gian' },
      { id: 'bc_luu_tru', name: 'Báo cáo lưu trữ bệnh án', description: 'Thống kê HSBA đã/chưa lưu trữ' },
      { id: 'bc_muon_tra', name: 'Báo cáo mượn/trả hồ sơ', description: 'Theo dõi mượn trả HSBA' },
      { id: 'so_vao_vien', name: 'Sổ vào viện', description: 'Danh sách bệnh nhân vào viện' },
      { id: 'so_ra_vien', name: 'Sổ ra viện', description: 'Danh sách bệnh nhân ra viện' },
    ],
  },
  hr: {
    title: 'Báo cáo Nhân sự',
    icon: <UserOutlined />,
    reports: [
      { id: 'ds_nhan_vien', name: 'Danh sách nhân viên', description: 'Thông tin nhân viên theo khoa/phòng' },
      { id: 'bc_cham_cong', name: 'Báo cáo chấm công', description: 'Thống kê chấm công theo tháng' },
      { id: 'bc_truc', name: 'Báo cáo lịch trực', description: 'Lịch trực theo khoa/phòng' },
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
    throw new Error(`Không tìm thấy cấu hình API cho báo cáo: ${reportId}`);
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
    throw new Error('Server không trả về dữ liệu báo cáo hợp lệ.');
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
          { title: 'Tỉ lệ thực hiện', dataIndex: 'fulfillmentRate', key: 'fulfillmentRate', width: 110, align: 'right' as const, render: (v: number) => fmtPct(v) },
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
            <Col span={6}><Statistic title="Tỉ lệ thực hiện" value={fmtPct(summaryData.fulfillmentRate)} /></Col>
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
      message.warning('Vui lòng chọn báo cáo');
      return;
    }

    const formatName = format === 'excel' ? 'Excel' : format === 'pdf' ? 'PDF' : 'máy in';
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
          message.error('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up để in báo cáo.');
        }
      } else {
        // Download as file
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportName}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.${extension}`;
        downloadBlob(blob, filename);
        message.success(`Đã xuất báo cáo ra ${formatName} thành công`);
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error exporting report:', error);
      message.error(`Xuất báo cáo ra ${formatName} thất bại. Vui lòng thử lại.`);
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
      message.error('Xem trước báo cáo thất bại. Vui lòng thử lại.');
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
      message.success(`Đã tải xuống: ${reportName}`);
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn('Error downloading report:', error);
      message.error('Tải xuống báo cáo thất bại. Vui lòng thử lại.');
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
      <Spin spinning={exporting} tip="Đang xử lý báo cáo...">
        <Row gutter={16}>
          {/* Left panel - Report categories */}
          <Col span={6}>
            <Card title="Danh mục báo cáo" size="small">
              <Search
                placeholder="Tìm báo cáo..."
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
                  tabPlacement="start"
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
                <Col span={8}>
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
                  </Select>
                </Col>
                <Col span={8}>
                  <Text strong>Xuất báo cáo:</Text>
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
                              Xem trước
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
            </Card>

            {/* Quick access to common reports */}
            <Card title="Báo cáo thường dùng" style={{ marginTop: 16 }}>
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
                    Báo cáo giao ban
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
                    Báo cáo doanh thu
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
                    Báo cáo NXT kho
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
                    Bảng kê BHYT
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
            Đóng
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
    </>
  );
};

const Reports: React.FC = () => {
  return (
    <div>
      <Title level={4}>Hồ sơ bệnh án & Báo cáo thống kê</Title>

      <Tabs
        items={[
          {
            key: 'reports',
            label: (
              <Space>
                <BarChartOutlined />
                <span>Báo cáo</span>
              </Space>
            ),
            children: <ExistingReportsContent />,
          },
          {
            key: 'reconciliation',
            label: (
              <Space>
                <AuditOutlined />
                <span>Đối chiếu Level 6</span>
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
