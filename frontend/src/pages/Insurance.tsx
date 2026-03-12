import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Row,
  Col,
  Modal,
  Typography,
  message,
  Tabs,
  Badge,
  Descriptions,
  DatePicker,
  Alert,
  Statistic,
  Progress,
  Select,
  Tooltip,
  Spin,
  Form,
  Divider,
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as insuranceApi from '../api/insurance';
import { HOSPITAL_NAME } from '../constants/hospital';

const { Title, Text } = Typography;
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
      render: (num) => <Text code>{num}</Text>,
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
      render: (amount) => <Text type="success">{formatCurrency(amount)}</Text>,
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
        <Space>
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
        </Space>
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
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
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
        <Space>
          <Button size="small" icon={<ExportOutlined />} onClick={() => handleDownloadBatch(record)}>
            Tải xuống
          </Button>
          {record.status === 1 && (
            <Button size="small" type="primary" icon={<CloudUploadOutlined />} onClick={() => handleSubmitBatch(record)}>
              Gửi BHXH
            </Button>
          )}
        </Space>
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
      render: (count) => <Text strong>{new Intl.NumberFormat('vi-VN').format(count)}</Text>,
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
        <Text type="danger">{record.errors?.map((e: any) => e.message).join('; ') || '-'}</Text>
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
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      {/* Step 1: Configure export */}
      <Card title="Bước 1: Cấu hình xuất XML" size="small">
        <Row gutter={16} align="middle">
          <Col span={10}>
            <Text strong>Khoảng thời gian: </Text>
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
          </Col>
          <Col span={8}>
            <Text strong>Khoa: </Text>
            <Select
              placeholder="Tất cả các khoa"
              allowClear
              style={{ width: 200, marginLeft: 8 }}
              value={exportDepartmentId}
              onChange={(value) => setExportDepartmentId(value)}
            >
              <Select.Option value="">Tất cả các khoa</Select.Option>
            </Select>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={handlePreviewExport}
              loading={previewLoading}
              size="large"
            >
              Xem trước
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Step 2: Preview results */}
      {exportPreview && (
        <Card title="Bước 2: Kết quả xem trước" size="small">
          {/* Summary cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Tổng hồ sơ"
                  value={exportPreview.totalRecords}
                  prefix={<FileDoneOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Tổng chi phí"
                  value={exportPreview.totalCostAmount}
                  formatter={(value) => formatVND(value as number)}
                  styles={{ content: { color: '#1890ff', fontSize: 16 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="BHYT chi trả"
                  value={exportPreview.totalInsuranceAmount}
                  formatter={(value) => formatVND(value as number)}
                  styles={{ content: { color: '#52c41a', fontSize: 16 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Người bệnh trả"
                  value={exportPreview.totalPatientAmount}
                  formatter={(value) => formatVND(value as number)}
                  styles={{ content: { color: '#faad14', fontSize: 16 } }}
                />
              </Card>
            </Col>
          </Row>

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
        </Card>
      )}

      {/* Step 3: Export result */}
      {exportResult && (
        <Card title="Bước 3: Kết quả xuất XML" size="small">
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

          <Space>
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
          </Space>
        </Card>
      )}

      {/* Step 4: Sign result */}
      {signResult && (
        <Card title="Bước 4: Kết quả ký số" size="small">
          <Alert
            title={signResult.success ? 'Ký số XML thành công!' : 'Ký số XML không thành công'}
            description={signResult.message}
            type={signResult.success ? 'success' : 'error'}
            showIcon
          />
        </Card>
      )}

      {/* Existing batches table */}
      <Card title="Lịch sử xuất XML" size="small">
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
      </Card>
    </Space>
  );

  // =============================================
  // Card verification tab content
  // =============================================
  const renderCardVerificationTab = () => (
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      <Card title="Tra cứu thẻ BHYT" size="small">
        <Form form={verifyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="insuranceNumber"
                label="Số thẻ BHYT"
                rules={[{ required: true, message: 'Vui lòng nhập số thẻ BHYT' }]}
              >
                <Input placeholder="Nhập số thẻ BHYT (15 ký tự)" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="patientName" label="Họ tên bệnh nhân">
                <Input placeholder="Nhập họ tên (không bắt buộc)" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="dateOfBirth" label="Ngày sinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={3}>
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
            </Col>
          </Row>
        </Form>
      </Card>

      {cardVerification && (
        <Card
          title="Kết quả xác minh"
          size="small"
          extra={
            <Button
              icon={<HistoryOutlined />}
              onClick={handleViewHistory}
              loading={historyLoading}
            >
              Xem lịch sử KCB
            </Button>
          }
        >
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
              <Text code strong>{cardVerification.maThe}</Text>
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
              <Text strong style={{ color: '#1890ff' }}>{cardVerification.mucHuong}%</Text>
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
                <Text type="danger">{cardVerification.lyDoKhongDuDk}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Thời gian xác minh" span={2}>
              {cardVerification.verificationTime ? dayjs(cardVerification.verificationTime).format('DD/MM/YYYY HH:mm:ss') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );

  return (
    <div>
      <Title level={4}>Giám định BHYT</Title>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng hồ sơ"
              value={totalClaims}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Chờ giám định"
              value={pendingClaims}
              styles={{ content: { color: pendingClaims > 0 ? '#faad14' : '#52c41a' } }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đã duyệt / Từ chối"
              value={approvedClaims}
              suffix={`/ ${rejectedClaims}`}
              styles={{ content: { color: '#52c41a' } }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={Math.round((approvedClaims / (approvedClaims + rejectedClaims || 1)) * 100)}
              size="small"
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng BHYT chi trả"
              value={totalInsuranceAmount}
              precision={0}
              styles={{ content: { color: '#1890ff' } }}
              suffix="VND"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
            />
          </Card>
        </Col>
      </Row>

      <Card>
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
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
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
                      </Space>
                    </Col>
                    <Col>
                      <Space>
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
                      </Space>
                    </Col>
                  </Row>

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
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau19'}
                      onClick={() => handleReportClick('mau19', 'Báo cáo mẫu 19')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 19</Text>
                          <br />
                          <Text type="secondary">Báo cáo tổng hợp KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau20'}
                      onClick={() => handleReportClick('mau20', 'Báo cáo mẫu 20')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 20</Text>
                          <br />
                          <Text type="secondary">Chi tiết chi phí KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau21'}
                      onClick={() => handleReportClick('mau21', 'Báo cáo mẫu 21')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 21</Text>
                          <br />
                          <Text type="secondary">Báo cáo chi tiết theo đối tượng</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau79'}
                      onClick={() => handleReportClick('mau79', 'Báo cáo mẫu 79')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 79</Text>
                          <br />
                          <Text type="secondary">Báo cáo chi tiết PTTT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau80'}
                      onClick={() => handleReportClick('mau80', 'Báo cáo mẫu 80')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#faad14' }} />
                        <div>
                          <Text strong>Báo cáo mẫu 80</Text>
                          <br />
                          <Text type="secondary">Tổng hợp chi phí thuốc BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'tt102'}
                      onClick={() => handleReportClick('tt102', 'Báo cáo TT 102/2018')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                        <div>
                          <Text strong>Báo cáo TT 102/2018</Text>
                          <br />
                          <Text type="secondary">Báo cáo theo Thông tư 102/2018/TT-BTC</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

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
                  <div class="header">
                    <div class="header-left">
                      <div><strong>${HOSPITAL_NAME}</strong></div>
                      <div>Phòng Tài chính - Kế toán</div>
                    </div>
                    <div style="text-align: right;">
                      <div><strong>Mẫu: BHYT-BK</strong></div>
                      <div>Số: ${selectedClaim.claimCode}</div>
                    </div>
                  </div>

                  <div class="title">BẢNG KÊ CHI PHÍ KHÁM CHỮA BỆNH BHYT</div>
                  <div style="text-align: center; margin-bottom: 15px;">
                    Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}
                  </div>

                  <div class="info-row">Mã giám định: <span class="field"><strong>${selectedClaim.claimCode}</strong></span></div>
                  <div class="info-row">Mã BN: <span class="field">${selectedClaim.patientCode}</span> Họ tên BN: <span class="field" style="width: 250px;"><strong>${selectedClaim.patientName}</strong></span></div>
                  <div class="info-row">Số thẻ BHYT: <span class="field">${selectedClaim.insuranceNumber}</span></div>
                  <div class="info-row">Ngày khám: <span class="field">${dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}</span> Ngày ra viện: <span class="field">${selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '---'}</span></div>
                  <div class="info-row">Khoa/Phòng: <span class="field">${selectedClaim.department || '---'}</span></div>
                  <div class="info-row">Chẩn đoán: <span class="field" style="width: 400px;">${selectedClaim.diagnosis}</span></div>

                  <table>
                    <thead>
                      <tr>
                        <th>Nội dung</th>
                        <th class="text-right" style="width: 180px;">Số tiền (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Tổng chi phí KCB</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                      <tr>
                        <td>BHYT chi trả</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.insuranceAmount)}</td>
                      </tr>
                      <tr>
                        <td>Người bệnh chi trả</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.patientAmount)}</td>
                      </tr>
                      <tr class="total-row">
                        <td>Tổng cộng</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  ${selectedClaim.status === 4 && selectedClaim.rejectReason ? `
                    <div class="reject-box">
                      <strong>Lý do từ chối:</strong> ${selectedClaim.rejectReason}
                    </div>
                  ` : ''}

                  ${selectedClaim.submittedDate ? `<div class="info-row">Ngày gửi BHXH: <span class="field">${dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}</span></div>` : ''}

                  <div class="signature-row">
                    <div class="signature-col">
                      <div><strong>NGƯỜI LẬP BẢNG KÊ</strong></div>
                      <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div class="signature-col">
                      <div><strong>KẾ TOÁN VIỆN PHÍ</strong></div>
                      <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div class="signature-col">
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
                <Text code>{selectedClaim.insuranceNumber}</Text>
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
                <Text strong>{formatCurrency(selectedClaim.totalAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BHYT chi trả">
                <Text type="success" strong>{formatCurrency(selectedClaim.insuranceAmount)}</Text>
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
                  <Text type="danger">{selectedClaim.rejectReason}</Text>
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
                  <Text code>{insuranceHistory.maThe}</Text>
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
