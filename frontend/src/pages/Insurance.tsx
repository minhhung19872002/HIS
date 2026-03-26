import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  Button,
  Input,
  Tag,
  Modal,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Select,
  Tooltip,
  Spin,
  Form
} from 'antd';
import {
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  CloudUploadOutlined,
  SyncOutlined,
  FileDoneOutlined,
  LockOutlined,
  ExportOutlined,
  FileSearchOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  EyeOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as insuranceApi from '../api/insurance';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Search } = Input;
const { RangePicker } = DatePicker;

// Interfaces
interface InsuranceClaim {
  id: string;
  claimCode: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  visitDate: string;
  dischargeDate?: string;
  department: string;
  diagnosis: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  status: number; // 0: Draft, 1: Pending, 2: Submitted, 3: Approved, 4: Rejected, 5: Locked
  xmlStatus?: string;
  submittedDate?: string;
  approvedDate?: string;
  rejectReason?: string;
}

interface XmlBatch {
  id: string;
  batchCode: string;
  period: string;
  claimCount: number;
  totalAmount: number;
  createdDate: string;
  submittedDate?: string;
  status: number; // 0: Draft, 1: Ready, 2: Submitted, 3: Confirmed
  xmlType: string;
}

const Insurance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('claims');
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<InsuranceClaim[]>([]);
  const [xmlBatches, setXmlBatches] = useState<XmlBatch[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimSearchText, setClaimSearchText] = useState('');
  const [claimDateRange, setClaimDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState<string | null>(null);

  // XML Export workflow state
  const [exportDateRange, setExportDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [exportDepartmentId, setExportDepartmentId] = useState<string | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportPreview, setExportPreview] = useState<insuranceApi.XmlExportPreviewDto | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<insuranceApi.XmlExportResultDto | null>(null);
  const [signLoading, setSignLoading] = useState(false);
  const [signResult, setSignResult] = useState<{ success: boolean; message: string } | null>(null);

  // Card verification state
  const [verifyForm] = Form.useForm();
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cardVerification, setCardVerification] = useState<insuranceApi.InsuranceCardVerificationDto | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [insuranceHistory, setInsuranceHistory] = useState<insuranceApi.InsuranceHistoryDto | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchClaims();
    fetchXmlBatches();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const result = await insuranceApi.searchInsuranceClaims({
        pageNumber: 1,
        pageSize: 100,
      });
      const mappedClaims: InsuranceClaim[] = ((result as any).data?.items || []).map((item: any) => ({
        id: item.id,
        claimCode: item.maLk,
        patientCode: item.patientCode,
        patientName: item.patientName,
        insuranceNumber: item.insuranceNumber,
        visitDate: item.admissionDate,
        dischargeDate: item.dischargeDate,
        department: '',
        diagnosis: `${item.diagnosisCode} - ${item.diagnosisName}`,
        totalAmount: item.totalAmount,
        insuranceAmount: item.insuranceAmount,
        patientAmount: item.patientAmount,
        status: item.status,
        submittedDate: item.submitDate,
        rejectReason: item.rejectReason,
      }));
      setClaims(mappedClaims);
      setFilteredClaims(mappedClaims);
    } catch (error) {
      message.warning('Không thể tải danh sách hồ sơ giám định');
      console.warn('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter claims based on search text and date range
  const applyClaimFilters = (allClaims: InsuranceClaim[], search: string, dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    let filtered = [...allClaims];
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.claimCode.toLowerCase().includes(lower) ||
        c.patientCode.toLowerCase().includes(lower) ||
        c.patientName.toLowerCase().includes(lower) ||
        c.insuranceNumber.toLowerCase().includes(lower)
      );
    }
    if (dates) {
      const [from, to] = dates;
      filtered = filtered.filter(c => {
        const visitDate = dayjs(c.visitDate);
        return visitDate.isAfter(from.startOf('day').subtract(1, 'ms')) && visitDate.isBefore(to.endOf('day').add(1, 'ms'));
      });
    }
    setFilteredClaims(filtered);
  };

  const fetchXmlBatches = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const batches = await insuranceApi.getSettlementBatches(currentYear);
      const mappedBatches: XmlBatch[] = ((batches as any).data || []).map((batch: any) => ({
        id: batch.id,
        batchCode: batch.batchCode,
        period: `${batch.month.toString().padStart(2, '0')}/${batch.year}`,
        claimCount: batch.totalRecords,
        totalAmount: batch.totalAmount,
        createdDate: batch.createdAt,
        submittedDate: batch.submitDate,
        status: batch.status,
        xmlType: 'QD 4210',
      }));
      setXmlBatches(mappedBatches);
    } catch (error) {
      message.warning('Không thể tải danh sách lô XML');
      console.warn('Failed to fetch XML batches:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  // Get status tag
  const getClaimStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Nháp</Tag>;
      case 1:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ giám định</Tag>;
      case 2:
        return <Tag color="blue" icon={<CloudUploadOutlined />}>Đã gửi BHXH</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      case 4:
        return <Tag color="red" icon={<WarningOutlined />}>Từ chối</Tag>;
      case 5:
        return <Tag color="purple" icon={<LockOutlined />}>Đã khóa</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Get XML batch status tag
  const getXmlStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Nháp</Tag>;
      case 1:
        return <Tag color="blue">Sẵn sàng</Tag>;
      case 2:
        return <Tag color="orange" icon={<CloudUploadOutlined />}>Đã gửi</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Xác nhận</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  // Handle approve claims
  const handleApproveClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần duyệt');
      return;
    }
    Modal.confirm({
      title: 'Xác nhận duyệt giám định',
      content: `Bạn có chắc chắn muốn duyệt ${selectedRowKeys.length} hồ sơ đã chọn?`,
      onOk: async () => {
        try {
          const claimIds = selectedRowKeys.map(key => {
            const claim = claims.find(c => c.id === key);
            return claim?.claimCode || '';
          }).filter(Boolean);
          await insuranceApi.validateClaimsBatch(claimIds);
          message.success(`Đã duyệt ${selectedRowKeys.length} hồ sơ`);
          setSelectedRowKeys([]);
          await fetchClaims();
        } catch (error) {
          message.warning('Lỗi khi duyệt hồ sơ giám định');
          console.warn('Error approving claims:', error);
        }
      },
    });
  };

  // Handle lock claims
  const handleLockClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần khóa');
      return;
    }
    Modal.confirm({
      title: 'Xác nhận khóa giám định',
      content: `Bạn có chắc chắn muốn khóa ${selectedRowKeys.length} hồ sơ đã chọn? Hồ sơ sau khi khóa không thể chỉnh sửa.`,
      onOk: async () => {
        try {
          const lockPromises = selectedRowKeys.map(key => {
            const claim = claims.find(c => c.id === key);
            if (claim?.claimCode) {
              return insuranceApi.lockInsuranceClaim(claim.claimCode);
            }
            return Promise.resolve();
          });
          await Promise.all(lockPromises);
          message.success(`Đã khóa ${selectedRowKeys.length} hồ sơ`);
          setSelectedRowKeys([]);
          await fetchClaims();
        } catch (error) {
          message.warning('Lỗi khi khóa hồ sơ giám định');
          console.warn('Error locking claims:', error);
        }
      },
    });
  };

  // =============================================
  // XML Export workflow handlers
  // =============================================

  const buildExportConfig = (): insuranceApi.XmlExportConfigDto => {
    const [from, to] = exportDateRange;
    return {
      month: from.month() + 1,
      year: from.year(),
      fromDate: from.format('YYYY-MM-DD'),
      toDate: to.format('YYYY-MM-DD'),
      departmentId: exportDepartmentId,
      includeXml1: true,
      includeXml2: true,
      includeXml3: true,
      includeXml4: true,
      includeXml5: true,
      includeXml7: true,
      validateBeforeExport: true,
      compressOutput: true,
    };
  };

  const handlePreviewExport = async () => {
    setPreviewLoading(true);
    setExportPreview(null);
    setExportResult(null);
    setSignResult(null);
    try {
      const config = buildExportConfig();
      const result = await insuranceApi.previewExport(config);
      const data = (result as any).data || result;
      setExportPreview(data);
    } catch (error) {
      // Fallback: if preview endpoint not yet available, build preview from individual generators
      console.warn('Preview endpoint not available, using fallback:', error);
      try {
        const config = buildExportConfig();
        const [xml1Res, xml2Res, xml3Res, xml4Res, xml5Res, xml7Res] = await Promise.allSettled([
          insuranceApi.generateXml1Data(config),
          insuranceApi.generateXml2Data(config),
          insuranceApi.generateXml3Data(config),
          insuranceApi.generateXml4Data(config),
          insuranceApi.generateXml5Data(config),
          insuranceApi.generateXml7Data(config),
        ]);

        const getCount = (res: PromiseSettledResult<any>) =>
          res.status === 'fulfilled' ? ((res.value as any).data?.length || 0) : 0;

        const xml1Count = getCount(xml1Res);
        const xml2Count = getCount(xml2Res);
        const xml3Count = getCount(xml3Res);
        const xml4Count = getCount(xml4Res);
        const xml5Count = getCount(xml5Res);
        const xml7Count = getCount(xml7Res);

        // Calculate totals from XML1 data
        const xml1Data = xml1Res.status === 'fulfilled' ? ((xml1Res.value as any).data || []) : [];
        const totalCost = xml1Data.reduce((sum: number, r: any) =>
          sum + (r.tienKham || 0) + (r.tienGiuong || 0) + (r.tienNgoaitruth || 0), 0);
        const totalInsurance = xml1Data.reduce((sum: number, r: any) => sum + (r.tienBhyt || 0), 0);
        const totalPatient = xml1Data.reduce((sum: number, r: any) => sum + (r.tienNguoibenh || 0), 0);

        // Also run validation
        let validationErrors: insuranceApi.InsuranceValidationResultDto[] = [];
        let hasBlockingErrors = false;
        try {
          const validationResult = await insuranceApi.validateBeforeExport(config);
          validationErrors = (validationResult as any).data || [];
          hasBlockingErrors = validationErrors.some(v => !v.isValid && v.errors.length > 0);
        } catch {
          // validation endpoint may fail, that's ok
        }

        const preview: insuranceApi.XmlExportPreviewDto = {
          totalRecords: xml1Count,
          dateRangeFrom: exportDateRange[0].format('YYYY-MM-DD'),
          dateRangeTo: exportDateRange[1].format('YYYY-MM-DD'),
          departmentName: exportDepartmentId || undefined,
          totalCostAmount: totalCost,
          totalInsuranceAmount: totalInsurance,
          totalPatientAmount: totalPatient,
          tables: [
            { tableName: 'XML1', description: 'Thông tin chung hồ sơ KCB', recordCount: xml1Count },
            { tableName: 'XML2', description: 'Chi tiết thuốc', recordCount: xml2Count },
            { tableName: 'XML3', description: 'Dịch vụ kỹ thuật', recordCount: xml3Count },
            { tableName: 'XML4', description: 'Chi phí ngoài danh mục', recordCount: xml4Count },
            { tableName: 'XML5', description: 'Chỉ định thuốc', recordCount: xml5Count },
            { tableName: 'XML7', description: 'Giấy chuyển tuyến', recordCount: xml7Count },
          ],
          validationErrors,
          hasBlockingErrors,
        };
        setExportPreview(preview);
      } catch (fallbackError) {
        message.warning('Không thể tạo xem trước. Vui lòng thử lại.');
        console.warn('Preview fallback failed:', fallbackError);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmExport = async () => {
    setExportLoading(true);
    setExportResult(null);
    setSignResult(null);
    try {
      const config = buildExportConfig();
      const result = await insuranceApi.exportXml(config);
      const data = (result as any).data || result;
      setExportResult(data);
      message.success(`Xuất XML thành công! Mã lô: ${data.batchCode || data.batchId}`);
      await fetchXmlBatches();
    } catch (error) {
      message.warning('Lỗi khi xuất XML');
      console.warn('Error exporting XML:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!exportResult?.batchId) return;
    try {
      const response = await insuranceApi.downloadXmlFile(exportResult.batchId);
      const blob = new Blob([(response as any).data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `XML-BHYT-${exportResult.batchCode || exportResult.batchId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('Đã tải xuống file XML');
    } catch (error) {
      message.warning('Lỗi khi tải file XML');
      console.warn('Error downloading XML:', error);
    }
  };

  const handleSignExport = async () => {
    if (!exportResult?.batchId) return;
    setSignLoading(true);
    setSignResult(null);
    try {
      const result = await insuranceApi.signXmlBatch(exportResult.batchId);
      const data = (result as any).data || result;
      setSignResult(data);
      if (data.success) {
        message.success('Ký số XML thành công!');
      } else {
        message.warning(`Ký số không thành công: ${data.message || 'Lỗi không xác định'}`);
      }
    } catch (error) {
      message.warning('Lỗi khi ký số XML. Có thể chưa cấu hình USB Token.');
      console.warn('Error signing XML:', error);
      setSignResult({ success: false, message: 'Lỗi kết nối dịch vụ ký số' });
    } finally {
      setSignLoading(false);
    }
  };

  // =============================================
  // Card verification handlers
  // =============================================

  const handleVerifyCard = async () => {
    try {
      const values = await verifyForm.validateFields();
      setVerifyLoading(true);
      setCardVerification(null);
      setInsuranceHistory(null);

      const result = await insuranceApi.verifyInsuranceCard({
        insuranceNumber: values.insuranceNumber,
        patientName: values.patientName || '',
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : '',
      });
      const data = (result as any).data || result;
      setCardVerification(data);

      if (data.duDkKcb) {
        message.success('Thẻ BHYT hợp lệ - Đủ điều kiện KCB');
      } else {
        message.warning(data.lyDoKhongDuDk || 'Thẻ BHYT không đủ điều kiện');
      }
    } catch (error) {
      message.warning('Không kết nối được cổng BHXH. Vui lòng thử lại sau.');
      console.warn('Card verification error:', error);
      // Set a fallback for gateway error display
      setCardVerification(null);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!cardVerification?.maThe) return;
    setHistoryLoading(true);
    setIsHistoryModalOpen(true);
    try {
      const result = await insuranceApi.getInsuranceHistory(cardVerification.maThe);
      const data = (result as any).data || result;
      setInsuranceHistory(data);
    } catch (error) {
      message.warning('Không thể tải lịch sử KCB');
      console.warn('Error fetching insurance history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle sync with BHXH portal
  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await insuranceApi.testPortalConnection();
      const data = (result as any).data;
      if (data?.isConnected) {
        message.success(`Đồng bộ thành công (${data.responseTimeMs}ms)`);
        await fetchClaims();
      } else {
        message.warning(`Không thể kết nối cổng BHXH: ${data?.errorMessage || 'Không xác định'}`);
      }
    } catch (error) {
      message.warning('Lỗi khi đồng bộ với cổng BHXH');
      console.warn('Error syncing:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle download XML batch
  const handleDownloadBatch = async (batch: XmlBatch) => {
    try {
      const response = await insuranceApi.downloadXmlFile(batch.id);
      const blob = new Blob([(response as any).data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batch.batchCode}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success(`Đã tải xuống lô ${batch.batchCode}`);
    } catch (error) {
      message.warning('Lỗi khi tải xuống');
      console.warn('Error downloading batch:', error);
    }
  };

  // Handle submit batch to BHXH
  const handleSubmitBatch = async (batch: XmlBatch) => {
    try {
      setLoading(true);
      const portalConfig = await insuranceApi.getPortalConfig();
      const config = (portalConfig as any).data;
      const result = await insuranceApi.submitToInsurancePortal({
        batchId: batch.id,
        username: config?.username || '',
        password: config?.password || '',
        certificatePath: config?.certificatePath || '',
        testMode: config?.testMode ?? true,
      });
      const submitData = (result as any).data;
      if (submitData?.success) {
        message.success(`Đã gửi lô ${batch.batchCode} thành công`);
        await fetchXmlBatches();
      } else {
        message.warning(`Gửi không thành công: ${submitData?.message || 'Lỗi không xác định'}`);
      }
    } catch (error) {
      message.warning(`Lỗi khi gửi lô ${batch.batchCode}`);
      console.warn('Error submitting batch:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle report card clicks
  const handleReportClick = async (reportType: string, reportName: string) => {
    setReportLoading(reportType);
    try {
      const now = dayjs();
      const month = now.month() + 1;
      const year = now.year();

      switch (reportType) {
        case 'mau19':
          await insuranceApi.getMonthlyInsuranceReport(month, year);
          break;
        case 'mau20':
          await insuranceApi.getDepartmentReport(month, year);
          break;
        case 'mau21':
          await insuranceApi.getTreatmentTypeReport(month, year);
          break;
        case 'mau79':
          await insuranceApi.getReportC79a(month, year);
          break;
        case 'mau80':
          await insuranceApi.getReport80a(month, year);
          break;
        case 'tt102':
          await insuranceApi.getMonthlyInsuranceReport(month, year);
          break;
      }

      // Try to export
      try {
        let response: any;
        if (reportType === 'mau79') {
          response = await insuranceApi.exportReportC79aToExcel(month, year);
        } else if (reportType === 'mau80') {
          response = await insuranceApi.exportReport80aToExcel(month, year);
        }
        if (response) {
          const blob = new Blob([(response as any).data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportType}-${month}-${year}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } catch {
        // Export not available for all report types
      }

      message.success(`Đã tải ${reportName}`);
    } catch (error) {
      message.warning(`Lỗi khi tải ${reportName}`);
      console.warn(`Error loading report ${reportType}:`, error);
    } finally {
      setReportLoading(null);
    }
  };

  // Stats
  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => c.status === 1).length;
  const approvedClaims = claims.filter(c => c.status === 3).length;
  const rejectedClaims = claims.filter(c => c.status === 4).length;
  const totalInsuranceAmount = claims.reduce((sum, c) => sum + c.insuranceAmount, 0);

  // Claim columns
  const claimColumns: ColumnsType<InsuranceClaim> = [
    {
      title: 'Mã giám định',
      dataIndex: 'claimCode',
      key: 'claimCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Họ tên BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 160,
      render: (num) => <code className="bg-gray-100 px-1 rounded text-sm">{num}</code>,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 110,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      width: 250,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 140,
      align: 'right',
      render: (amount) => <span className="text-green-600">{formatCurrency(amount)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getClaimStatusTag(status),
      filters: [
        { text: 'Chờ giám định', value: 1 },
        { text: 'Đã gửi BHXH', value: 2 },
        { text: 'Đã duyệt', value: 3 },
        { text: 'Từ chối', value: 4 },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => {
              setSelectedClaim(record);
              setIsDetailModalOpen(true);
            }}
          >
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  // XML batch columns
  const xmlColumns: ColumnsType<XmlBatch> = [
    {
      title: 'Mã lô',
      dataIndex: 'batchCode',
      key: 'batchCode',
      width: 150,
    },
    {
      title: 'Loại XML',
      dataIndex: 'xmlType',
      key: 'xmlType',
      width: 130,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Kỳ',
      dataIndex: 'period',
      key: 'period',
      width: 100,
    },
    {
      title: 'Số hồ sơ',
      dataIndex: 'claimCount',
      key: 'claimCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 180,
      align: 'right',
      render: (amount) => <span className="font-semibold">{formatCurrency(amount)}</span>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getXmlStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" icon={<ExportOutlined />} onClick={() => handleDownloadBatch(record)}>
            Tải xuống
          </Button>
          {record.status === 1 && (
            <Button size="small" type="primary" icon={<CloudUploadOutlined />} onClick={() => handleSubmitBatch(record)}>
              Gửi BHXH
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Preview table columns
  const previewTableColumns: ColumnsType<insuranceApi.XmlTablePreview> = [
    {
      title: 'Bảng',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 100,
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Số bản ghi',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 120,
      align: 'right',
      render: (count) => <span className="font-semibold">{new Intl.NumberFormat('vi-VN').format(count)}</span>,
    },
  ];

  // Validation errors columns
  const validationErrorColumns: ColumnsType<any> = [
    {
      title: 'MaLk',
      dataIndex: 'maLk',
      key: 'maLk',
      width: 140,
    },
    {
      title: 'Trường',
      key: 'field',
      width: 120,
      render: (_: any, record: any) => record.errors?.[0]?.field || '-',
    },
    {
      title: 'Mã lỗi',
      key: 'errorCode',
      width: 100,
      render: (_: any, record: any) => record.errors?.[0]?.errorCode || '-',
    },
    {
      title: 'Mô tả lỗi',
      key: 'message',
      render: (_: any, record: any) => (
        <span className="text-red-500">{record.errors?.map((e: any) => e.message).join('; ') || '-'}</span>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: InsuranceClaim) => ({
      disabled: record.status === 5,
    }),
  };

  // =============================================
  // XML Export tab content - 4-step workflow
  // =============================================
  const renderXmlExportTab = () => (
    <div className="flex flex-col gap-2">
      {/* Step 1: Configure export */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Bước 1: Cấu hình xuất XML</h4>
        <div className="flex gap-4 flex-wrap">
          <div>
            <span className="font-semibold">Khoảng thời gian: </span>
            <RangePicker
              format="DD/MM/YYYY"
              value={exportDateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setExportDateRange([dates[0], dates[1]]);
                }
              }}
              style={{ marginLeft: 8 }}
            />
          </div>
          <div className="w-full lg:w-1/3">
            <span className="font-semibold">Khoa: </span>
            <Select
              placeholder="Tất cả các khoa"
              allowClear
              style={{ width: 200, marginLeft: 8 }}
              value={exportDepartmentId}
              onChange={(value) => setExportDepartmentId(value)}
            >
              <Select.Option value="">Tất cả các khoa</Select.Option>
            </Select>
          </div>
          <div>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={handlePreviewExport}
              loading={previewLoading}
              size="large"
            >
              Xem trước
            </Button>
          </div>
        </div>
      </div>

      {/* Step 2: Preview results */}
      {exportPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Bước 2: Kết quả xem trước</h4>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="w-full lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div><div className="text-xs text-gray-500 font-semibold">Tổng hồ sơ</div><div className="text-2xl font-bold">{exportPreview.totalRecords}</div></div>
              </div>
            </div>
            <div className="w-full lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div><div className="text-xs text-gray-500 font-semibold">Tổng chi phí</div><div className="text-2xl font-bold">{exportPreview.totalCostAmount}</div></div>
              </div>
            </div>
            <div className="w-full lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div><div className="text-xs text-gray-500 font-semibold">BHYT chi trả</div><div className="text-2xl font-bold">{exportPreview.totalInsuranceAmount}</div></div>
              </div>
            </div>
            <div className="w-full lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div><div className="text-xs text-gray-500 font-semibold">Người bệnh trả</div><div className="text-2xl font-bold">{exportPreview.totalPatientAmount}</div></div>
              </div>
            </div>
          </div>

          {/* Table listing all XML tables with record counts */}
          <Table
            columns={previewTableColumns}
            dataSource={exportPreview.tables}
            rowKey="tableName"
            size="small"
            pagination={false}
            style={{ marginBottom: 16 }}
          />

          {/* Blocking errors or success */}
          {exportPreview.hasBlockingErrors ? (
            <>
              <Alert
                title="Dữ liệu chưa đầy đủ - Không thể xuất XML"
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={validationErrorColumns}
                dataSource={exportPreview.validationErrors.filter(v => !v.isValid)}
                rowKey="maLk"
                size="small"
                pagination={{ pageSize: 10 }}
                style={{ marginBottom: 16 }}
              />
              <Button type="primary" disabled size="large">
                Xác nhận xuất XML
              </Button>
            </>
          ) : (
            <>
              <Alert
                title="Dữ liệu hợp lệ - Sẵn sàng xuất XML"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleConfirmExport}
                loading={exportLoading}
                size="large"
              >
                Xác nhận xuất XML
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 3: Export result */}
      {exportResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Bước 3: Kết quả xuất XML</h4>
          <Alert
            title={`Xuất XML thành công! Mã lô: ${exportResult.batchCode || exportResult.batchId}`}
            description={`Tổng: ${exportResult.totalRecords} hồ sơ, Thành công: ${exportResult.successRecords}, Thất bại: ${exportResult.failedRecords}`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {exportResult.errors && exportResult.errors.length > 0 && (
            <Alert
              title={`Có ${exportResult.errors.length} hồ sơ lỗi`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadExport}
              size="large"
            >
              Tải XML
            </Button>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={handleSignExport}
              loading={signLoading}
              size="large"
            >
              Ký số XML
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Sign result */}
      {signResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Bước 4: Kết quả ký số</h4>
          <Alert
            title={signResult.success ? 'Ký số XML thành công!' : 'Ký số XML không thành công'}
            description={signResult.message}
            type={signResult.success ? 'success' : 'error'}
            showIcon
          />
        </div>
      )}

      {/* Existing batches table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Lịch sử xuất XML</h4>
        <Table
          columns={xmlColumns}
          dataSource={xmlBatches}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng: ${total} lô`,
          }}
        />
      </div>
    </div>
  );

  // =============================================
  // Card verification tab content
  // =============================================
  const renderCardVerificationTab = () => (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h4 className="text-sm font-semibold text-gray-700 mb-3">Tra cứu thẻ BHYT</h4>
        <Form form={verifyForm} layout="vertical">
          <div className="flex gap-4 flex-wrap">
            <div className="w-full lg:w-1/3">
              <Form.Item
                name="insuranceNumber"
                label="Số thẻ BHYT"
                rules={[{ required: true, message: 'Vui lòng nhập số thẻ BHYT' }]}
              >
                <Input placeholder="Nhập số thẻ BHYT (15 ký tự)" maxLength={15} />
              </Form.Item>
            </div>
            <div className="w-full lg:w-1/3">
              <Form.Item name="patientName" label="Họ tên bệnh nhân">
                <Input placeholder="Nhập họ tên (không bắt buộc)" />
              </Form.Item>
            </div>
            <div>
              <Form.Item name="dateOfBirth" label="Ngày sinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <div>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleVerifyCard}
                  loading={verifyLoading}
                  block
                >
                  Xác minh
                </Button>
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {cardVerification && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Ket qua xac minh</h4>
            <Button
              onClick={handleViewHistory}
              loading={historyLoading}
            >
              Xem lich su KCB
            </Button>
          </div>
          <Alert
            title={cardVerification.duDkKcb ? 'Đủ điều kiện KCB' : 'Không đủ điều kiện KCB'}
            description={cardVerification.duDkKcb
              ? `Mức hưởng: ${cardVerification.mucHuong}% | Hiệu lực: ${cardVerification.gtTheTu ? dayjs(cardVerification.gtTheTu).format('DD/MM/YYYY') : ''} - ${cardVerification.gtTheDen ? dayjs(cardVerification.gtTheDen).format('DD/MM/YYYY') : ''}`
              : cardVerification.lyDoKhongDuDk || 'Không có thông tin'}
            type={cardVerification.duDkKcb ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã thẻ" span={2}>
              <code className="font-semibold bg-gray-100 px-1 rounded text-sm">{cardVerification.maThe}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên">
              {cardVerification.hoTen}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {cardVerification.ngaySinh ? dayjs(cardVerification.ngaySinh).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Giới tính">
              {cardVerification.gioiTinh === 1 ? 'Nam' : cardVerification.gioiTinh === 2 ? 'Nữ' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {cardVerification.diaChi || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="GT thẻ từ">
              {cardVerification.gtTheTu ? dayjs(cardVerification.gtTheTu).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="GT thẻ đến">
              {cardVerification.gtTheDen ? dayjs(cardVerification.gtTheDen).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Nơi ĐKKCB BĐ" span={2}>
              {cardVerification.tenDkbd || '-'} ({cardVerification.maDkbd || '-'})
            </Descriptions.Item>
            <Descriptions.Item label="Mức hưởng">
              <span className="font-semibold" style={{color: '#1890ff'}}>{cardVerification.mucHuong}%</span>
            </Descriptions.Item>
            <Descriptions.Item label="Đủ ĐK KCB">
              {cardVerification.duDkKcb ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Đủ điều kiện</Tag>
              ) : (
                <Tag color="red" icon={<WarningOutlined />}>Không đủ ĐK</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Miễn cùng CT">
              {cardVerification.mienCungCt ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Loại thẻ">
              {cardVerification.loaiThe || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Mã khu vực">
              {cardVerification.maKv || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Trả trước">
              {cardVerification.isTraTruoc ? <Tag color="orange">Có</Tag> : <Tag>Không</Tag>}
            </Descriptions.Item>
            {cardVerification.lyDoKhongDuDk && (
              <Descriptions.Item label="Lý do không đủ ĐK" span={2}>
                <span className="text-red-500">{cardVerification.lyDoKhongDuDk}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Thời gian xác minh" span={2}>
              {cardVerification.verificationTime ? dayjs(cardVerification.verificationTime).format('DD/MM/YYYY HH:mm:ss') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Gradient mesh background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 m-0">Giám định BHYT</h2>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchClaims(); fetchXmlBatches(); }} size="small">Làm mới</Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Tổng hồ sơ</div><div className="text-2xl font-bold">{totalClaims}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Chờ giám định</div><div className="text-2xl font-bold">{pendingClaims}</div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Đã duyệt / Từ chối</div><div className="text-2xl font-bold">{approvedClaims}</div></div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full" style={{width: Math.round((approvedClaims / (approvedClaims + rejectedClaims || 1)) * 100)+'%', backgroundColor: '#52c41a'}}></div></div>
          </div>
        </div>
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div><div className="text-xs text-gray-500 font-semibold">Tổng BHYT chi trả</div><div className="text-2xl font-bold">{totalInsuranceAmount}</div></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'claims',
              label: (
                <span>
                  <FileDoneOutlined />
                  Hồ sơ giám định
                  {pendingClaims > 0 && <Badge count={pendingClaims} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Search
                          placeholder="Tìm theo mã giám định, mã BN, số thẻ BHYT..."
                          allowClear
                          enterButton={<SearchOutlined />}
                          style={{ width: 400 }}
                          value={claimSearchText}
                          onChange={(e) => {
                            const value = e.target.value;
                            setClaimSearchText(value);
                            applyClaimFilters(claims, value, claimDateRange);
                          }}
                          onSearch={(value) => {
                            setClaimSearchText(value);
                            applyClaimFilters(claims, value, claimDateRange);
                          }}
                        />
                        <RangePicker
                          format="DD/MM/YYYY"
                          value={claimDateRange}
                          onChange={(dates) => {
                            const range = dates ? [dates[0]!, dates[1]!] as [dayjs.Dayjs, dayjs.Dayjs] : null;
                            setClaimDateRange(range);
                            applyClaimFilters(claims, claimSearchText, range);
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleApproveClaims}
                          disabled={selectedRowKeys.length === 0}
                        >
                          Duyệt giám định
                        </Button>
                        <Button
                          icon={<LockOutlined />}
                          onClick={handleLockClaims}
                          disabled={selectedRowKeys.length === 0}
                        >
                          Khóa giám định
                        </Button>
                        <Button icon={<SyncOutlined />} onClick={handleSync} loading={syncLoading}>
                          Đồng bộ
                        </Button>
                      </div>
                    </div>
                  </div>

                  {rejectedClaims > 0 && (
                    <Alert
                      title={`Có ${rejectedClaims} hồ sơ bị từ chối cần xử lý`}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      action={
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            const firstRejected = claims.find(c => c.status === 4);
                            if (firstRejected) {
                              setSelectedClaim(firstRejected);
                              setIsDetailModalOpen(true);
                            }
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      }
                    />
                  )}

                  <Table
                    rowSelection={rowSelection}
                    columns={claimColumns}
                    dataSource={filteredClaims}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    scroll={{ x: 1600 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} hồ sơ`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        setSelectedClaim(record);
                        setIsDetailModalOpen(true);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </>
              ),
            },
            {
              key: 'xml',
              label: (
                <span>
                  <CloudUploadOutlined />
                  Xuất XML
                </span>
              ),
              children: renderXmlExportTab(),
            },
            {
              key: 'verify',
              label: (
                <span>
                  <IdcardOutlined />
                  Tra cứu thẻ
                </span>
              ),
              children: renderCardVerificationTab(),
            },
            {
              key: 'reports',
              label: (
                <span>
                  <PrinterOutlined />
                  Báo cáo BHYT
                </span>
              ),
              children: (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'mau19'}
                      onClick={() => handleReportClick('mau19', 'Báo cáo mẫu 19')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                          <span className="font-semibold">Báo cáo mẫu 19</span>
                          <br />
                          <span className="text-gray-500 text-sm">Báo cáo tổng hợp KCB BHYT</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'mau20'}
                      onClick={() => handleReportClick('mau20', 'Báo cáo mẫu 20')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        <div>
                          <span className="font-semibold">Báo cáo mẫu 20</span>
                          <br />
                          <span className="text-gray-500 text-sm">Chi tiết chi phí KCB BHYT</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'mau21'}
                      onClick={() => handleReportClick('mau21', 'Báo cáo mẫu 21')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        <div>
                          <span className="font-semibold">Báo cáo mẫu 21</span>
                          <br />
                          <span className="text-gray-500 text-sm">Báo cáo chi tiết theo đối tượng</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'mau79'}
                      onClick={() => handleReportClick('mau79', 'Báo cáo mẫu 79')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                        <div>
                          <span className="font-semibold">Báo cáo mẫu 79</span>
                          <br />
                          <span className="text-gray-500 text-sm">Báo cáo chi tiết PTTT</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'mau80'}
                      onClick={() => handleReportClick('mau80', 'Báo cáo mẫu 80')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#faad14' }} />
                        <div>
                          <span className="font-semibold">Báo cáo mẫu 80</span>
                          <br />
                          <span className="text-gray-500 text-sm">Tổng hợp chi phí thuốc BHYT</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
  loading={reportLoading === 'tt102'}
                      onClick={() => handleReportClick('tt102', 'Báo cáo TT 102/2018')}
                    >
                      <div className="flex items-center gap-2">
                        <PrinterOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                        <div>
                          <span className="font-semibold">Báo cáo TT 102/2018</span>
                          <br />
                          <span className="text-gray-500 text-sm">Báo cáo theo Thông tư 102/2018/TT-BTC</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết hồ sơ giám định"
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedClaim(null);
        }}
        footer={[
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (!selectedClaim) { message.warning('Vui lòng chọn hồ sơ cần in'); return; }
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                message.warning('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
                return;
              }
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Bảng kê giám định BHYT - ${selectedClaim.claimCode}</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
                    .header-left { width: 50%; }
                    .title { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
                    .info-row { margin: 6px 0; }
                    .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    table th, table td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
                    table th { background-color: #f0f0f0; font-weight: bold; }
                    .text-right { text-align: right; }
                    .total-row { font-weight: bold; background-color: #f0f5ff; }
                    .signature-row { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
                    .signature-col { width: 30%; }
                    .reject-box { border: 1px solid #ff4d4f; background: #fff2f0; padding: 10px; margin: 10px 0; }
                    @media print { body { padding: 10px; } }
                  </style>
                </head>
                <body>
                  <div className="header">
                    <div className="header-left">
                      <div><strong>${HOSPITAL_NAME}</strong></div>
                      <div>Phòng Tài chính - Kế toán</div>
                    </div>
                    <div style="text-align: right;">
                      <div><strong>Mẫu: BHYT-BK</strong></div>
                      <div>Số: ${selectedClaim.claimCode}</div>
                    </div>
                  </div>

                  <div className="title">BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH BHYT</div>
                  <div style="text-align: center; margin-bottom: 15px;">
                    Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}
                  </div>

                  <div className="info-row">Mã giám định: <span className="field"><strong>${selectedClaim.claimCode}</strong></span></div>
                  <div className="info-row">Mã BN: <span className="field">${selectedClaim.patientCode}</span> Họ tên BN: <span className="field" style="width: 250px;"><strong>${selectedClaim.patientName}</strong></span></div>
                  <div className="info-row">Số thẻ BHYT: <span className="field">${selectedClaim.insuranceNumber}</span></div>
                  <div className="info-row">Ngày khám: <span className="field">${dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}</span> Ngày ra viện: <span className="field">${selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '---'}</span></div>
                  <div className="info-row">Khoa/Phòng: <span className="field">${selectedClaim.department || '---'}</span></div>
                  <div className="info-row">Chẩn đoán: <span className="field" style="width: 400px;">${selectedClaim.diagnosis}</span></div>

                  <table>
                    <thead>
                      <tr>
                        <th>Nội dung</th>
                        <th className="text-right" style="width: 180px;">Số tiền (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Tổng chi phí KCB</td>
                        <td className="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                      <tr>
                        <td>BHYT chi trả</td>
                        <td className="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.insuranceAmount)}</td>
                      </tr>
                      <tr>
                        <td>Người bệnh chi trả</td>
                        <td className="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.patientAmount)}</td>
                      </tr>
                      <tr className="total-row">
                        <td>Tổng cộng</td>
                        <td className="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  ${selectedClaim.status === 4 && selectedClaim.rejectReason ? `
                    <div className="reject-box">
                      <strong>Lý do từ chối:</strong> ${selectedClaim.rejectReason}
                    </div>
                  ` : ''}

                  ${selectedClaim.submittedDate ? `<div className="info-row">Ngày gửi BHXH: <span className="field">${dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}</span></div>` : ''}

                  <div className="signature-row">
                    <div className="signature-col">
                      <div><strong>NGƯỜI LẬP BẢNG KÊ</strong></div>
                      <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div className="signature-col">
                      <div><strong>KẾ TOÁN VIỆN PHÍ</strong></div>
                      <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div className="signature-col">
                      <div><strong>GIÁM ĐỐC BỆNH VIỆN</strong></div>
                      <div>(Ký tên, đóng dấu)</div>
                    </div>
                  </div>
                </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
            }}
          >
            In bảng kê
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {selectedClaim && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã giám định">{selectedClaim.claimCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{getClaimStatusTag(selectedClaim.status)}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedClaim.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{selectedClaim.patientName}</Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT" span={2}>
                <code className="bg-gray-100 px-1 rounded text-sm">{selectedClaim.insuranceNumber}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày khám">
                {dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày ra viện">
                {selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Khoa/Phòng">{selectedClaim.department}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>{selectedClaim.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="Tổng chi phí">
                <span className="font-semibold">{formatCurrency(selectedClaim.totalAmount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="BHYT chi trả">
                <span className="text-green-600 text-sm">{formatCurrency(selectedClaim.insuranceAmount)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="BN chi trả">
                {formatCurrency(selectedClaim.patientAmount)}
              </Descriptions.Item>
              {selectedClaim.submittedDate && (
                <Descriptions.Item label="Ngày gửi BHXH">
                  {dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.approvedDate && (
                <Descriptions.Item label="Ngày duyệt">
                  {dayjs(selectedClaim.approvedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.rejectReason && (
                <Descriptions.Item label="Lý do từ chối" span={2}>
                  <span className="text-red-500">{selectedClaim.rejectReason}</span>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedClaim.status === 4 && (
              <Alert
                title="Hồ sơ bị từ chối"
                description={`Lý do: ${selectedClaim.rejectReason}. Vui lòng kiểm tra và cập nhật hồ sơ.`}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}
      </Modal>

      {/* Insurance History Modal */}
      <Modal
        title="Lịch sử khám chữa bệnh BHYT"
        open={isHistoryModalOpen}
        onCancel={() => {
          setIsHistoryModalOpen(false);
          setInsuranceHistory(null);
        }}
        footer={null}
        width={800}
      >
        <Spin spinning={historyLoading}>
          {insuranceHistory && (
            <>
              <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Mã thẻ BHYT">
                  <code className="bg-gray-100 px-1 rounded text-sm">{insuranceHistory.maThe}</code>
                </Descriptions.Item>
              </Descriptions>
              <Table
                size="small"
                columns={[
                  {
                    title: 'Ngày KCB',
                    dataIndex: 'ngayKcb',
                    key: 'ngayKcb',
                    width: 110,
                    render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
                  {
                    title: 'Tên CSKCB',
                    dataIndex: 'tenCsKcb',
                    key: 'tenCsKcb',
                  },
                  {
                    title: 'Mã bệnh chính',
                    dataIndex: 'maBenhChinh',
                    key: 'maBenhChinh',
                    width: 120,
                  },
                  {
                    title: 'Tên bệnh chính',
                    dataIndex: 'tenBenhChinh',
                    key: 'tenBenhChinh',
                  },
                  {
                    title: 'Tiền BHYT',
                    dataIndex: 'tienBhyt',
                    key: 'tienBhyt',
                    width: 130,
                    align: 'right',
                    render: (amount: number) => formatVND(amount),
                  },
                ]}
                dataSource={(insuranceHistory.visits || []).map((v, idx) => ({ ...v, key: idx }))}
                pagination={false}
              />
            </>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default Insurance;
