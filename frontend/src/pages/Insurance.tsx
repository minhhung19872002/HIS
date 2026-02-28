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
      message.warning('Khong the tai danh sach ho so giam dinh');
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
      message.warning('Khong the tai danh sach lo XML');
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
        return <Tag color="default">Nhap</Tag>;
      case 1:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>Cho giam dinh</Tag>;
      case 2:
        return <Tag color="blue" icon={<CloudUploadOutlined />}>Da gui BHXH</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Da duyet</Tag>;
      case 4:
        return <Tag color="red" icon={<WarningOutlined />}>Tu choi</Tag>;
      case 5:
        return <Tag color="purple" icon={<LockOutlined />}>Da khoa</Tag>;
      default:
        return <Tag>Khong xac dinh</Tag>;
    }
  };

  // Get XML batch status tag
  const getXmlStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Nhap</Tag>;
      case 1:
        return <Tag color="blue">San sang</Tag>;
      case 2:
        return <Tag color="orange" icon={<CloudUploadOutlined />}>Da gui</Tag>;
      case 3:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Xac nhan</Tag>;
      default:
        return <Tag>Khong xac dinh</Tag>;
    }
  };

  // Handle approve claims
  const handleApproveClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui long chon ho so can duyet');
      return;
    }
    Modal.confirm({
      title: 'Xac nhan duyet giam dinh',
      content: `Ban co chac chan muon duyet ${selectedRowKeys.length} ho so da chon?`,
      onOk: async () => {
        try {
          const claimIds = selectedRowKeys.map(key => {
            const claim = claims.find(c => c.id === key);
            return claim?.claimCode || '';
          }).filter(Boolean);
          await insuranceApi.validateClaimsBatch(claimIds);
          message.success(`Da duyet ${selectedRowKeys.length} ho so`);
          setSelectedRowKeys([]);
          await fetchClaims();
        } catch (error) {
          message.warning('Loi khi duyet ho so giam dinh');
          console.warn('Error approving claims:', error);
        }
      },
    });
  };

  // Handle lock claims
  const handleLockClaims = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui long chon ho so can khoa');
      return;
    }
    Modal.confirm({
      title: 'Xac nhan khoa giam dinh',
      content: `Ban co chac chan muon khoa ${selectedRowKeys.length} ho so da chon? Ho so sau khi khoa khong the chinh sua.`,
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
          message.success(`Da khoa ${selectedRowKeys.length} ho so`);
          setSelectedRowKeys([]);
          await fetchClaims();
        } catch (error) {
          message.warning('Loi khi khoa ho so giam dinh');
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
            { tableName: 'XML1', description: 'Thong tin chung ho so KCB', recordCount: xml1Count },
            { tableName: 'XML2', description: 'Chi tiet thuoc', recordCount: xml2Count },
            { tableName: 'XML3', description: 'Dich vu ky thuat', recordCount: xml3Count },
            { tableName: 'XML4', description: 'Chi phi ngoai danh muc', recordCount: xml4Count },
            { tableName: 'XML5', description: 'Chi dinh thuoc', recordCount: xml5Count },
            { tableName: 'XML7', description: 'Giay chuyen tuyen', recordCount: xml7Count },
          ],
          validationErrors,
          hasBlockingErrors,
        };
        setExportPreview(preview);
      } catch (fallbackError) {
        message.warning('Khong the tao xem truoc. Vui long thu lai.');
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
      message.success(`Xuat XML thanh cong! Ma lo: ${data.batchCode || data.batchId}`);
      await fetchXmlBatches();
    } catch (error) {
      message.warning('Loi khi xuat XML');
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
      message.success('Da tai xuong file XML');
    } catch (error) {
      message.warning('Loi khi tai file XML');
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
        message.success('Ky so XML thanh cong!');
      } else {
        message.warning(`Ky so khong thanh cong: ${data.message || 'Loi khong xac dinh'}`);
      }
    } catch (error) {
      message.warning('Loi khi ky so XML. Co the chua cau hinh USB Token.');
      console.warn('Error signing XML:', error);
      setSignResult({ success: false, message: 'Loi ket noi dich vu ky so' });
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
        message.success('The BHYT hop le - Du dieu kien KCB');
      } else {
        message.warning(data.lyDoKhongDuDk || 'The BHYT khong du dieu kien');
      }
    } catch (error) {
      message.warning('Khong ket noi duoc cong BHXH. Vui long thu lai sau.');
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
      message.warning('Khong the tai lich su KCB');
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
        message.success(`Dong bo thanh cong (${data.responseTimeMs}ms)`);
        await fetchClaims();
      } else {
        message.warning(`Khong the ket noi cong BHXH: ${data?.errorMessage || 'Khong xac dinh'}`);
      }
    } catch (error) {
      message.warning('Loi khi dong bo voi cong BHXH');
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
      message.success(`Da tai xuong lo ${batch.batchCode}`);
    } catch (error) {
      message.warning('Loi khi tai xuong');
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
        message.success(`Da gui lo ${batch.batchCode} thanh cong`);
        await fetchXmlBatches();
      } else {
        message.warning(`Gui khong thanh cong: ${submitData?.message || 'Loi khong xac dinh'}`);
      }
    } catch (error) {
      message.warning(`Loi khi gui lo ${batch.batchCode}`);
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

      message.success(`Da tai ${reportName}`);
    } catch (error) {
      message.warning(`Loi khi tai ${reportName}`);
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
      title: 'Ma giam dinh',
      dataIndex: 'claimCode',
      key: 'claimCode',
      width: 130,
      fixed: 'left',
    },
    {
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 120,
    },
    {
      title: 'Ho ten BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 150,
    },
    {
      title: 'So the BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 160,
      render: (num) => <Text code>{num}</Text>,
    },
    {
      title: 'Ngay kham',
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
      title: 'Chan doan',
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
      title: 'BHYT chi tra',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 140,
      align: 'right',
      render: (amount) => <Text type="success">{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => getClaimStatusTag(status),
      filters: [
        { text: 'Cho giam dinh', value: 1 },
        { text: 'Da gui BHXH', value: 2 },
        { text: 'Da duyet', value: 3 },
        { text: 'Tu choi', value: 4 },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Thao tac',
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
            Chi tiet
          </Button>
        </Space>
      ),
    },
  ];

  // XML batch columns
  const xmlColumns: ColumnsType<XmlBatch> = [
    {
      title: 'Ma lo',
      dataIndex: 'batchCode',
      key: 'batchCode',
      width: 150,
    },
    {
      title: 'Loai XML',
      dataIndex: 'xmlType',
      key: 'xmlType',
      width: 130,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Ky',
      dataIndex: 'period',
      key: 'period',
      width: 100,
    },
    {
      title: 'So ho so',
      dataIndex: 'claimCount',
      key: 'claimCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Tong tien',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 180,
      align: 'right',
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Ngay tao',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getXmlStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<ExportOutlined />} onClick={() => handleDownloadBatch(record)}>
            Tai xuong
          </Button>
          {record.status === 1 && (
            <Button size="small" type="primary" icon={<CloudUploadOutlined />} onClick={() => handleSubmitBatch(record)}>
              Gui BHXH
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Preview table columns
  const previewTableColumns: ColumnsType<insuranceApi.XmlTablePreview> = [
    {
      title: 'Bang',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 100,
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Mo ta',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'So ban ghi',
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
      title: 'Truong',
      key: 'field',
      width: 120,
      render: (_: any, record: any) => record.errors?.[0]?.field || '-',
    },
    {
      title: 'Ma loi',
      key: 'errorCode',
      width: 100,
      render: (_: any, record: any) => record.errors?.[0]?.errorCode || '-',
    },
    {
      title: 'Mo ta loi',
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
      <Card title="Buoc 1: Cau hinh xuat XML" size="small">
        <Row gutter={16} align="middle">
          <Col span={10}>
            <Text strong>Khoang thoi gian: </Text>
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
              placeholder="Tat ca cac khoa"
              allowClear
              style={{ width: 200, marginLeft: 8 }}
              value={exportDepartmentId}
              onChange={(value) => setExportDepartmentId(value)}
            >
              <Select.Option value="">Tat ca cac khoa</Select.Option>
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
              Xem truoc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Step 2: Preview results */}
      {exportPreview && (
        <Card title="Buoc 2: Ket qua xem truoc" size="small">
          {/* Summary cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Tong ho so"
                  value={exportPreview.totalRecords}
                  prefix={<FileDoneOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Tong chi phi"
                  value={exportPreview.totalCostAmount}
                  formatter={(value) => formatVND(value as number)}
                  styles={{ content: { color: '#1890ff', fontSize: 16 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="BHYT chi tra"
                  value={exportPreview.totalInsuranceAmount}
                  formatter={(value) => formatVND(value as number)}
                  styles={{ content: { color: '#52c41a', fontSize: 16 } }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Nguoi benh tra"
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
                title="Du lieu chua day du - Khong the xuat XML"
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
                Xac nhan xuat XML
              </Button>
            </>
          ) : (
            <>
              <Alert
                title="Du lieu hop le - San sang xuat XML"
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
                Xac nhan xuat XML
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 3: Export result */}
      {exportResult && (
        <Card title="Buoc 3: Ket qua xuat XML" size="small">
          <Alert
            title={`Xuat XML thanh cong! Ma lo: ${exportResult.batchCode || exportResult.batchId}`}
            description={`Tong: ${exportResult.totalRecords} ho so, Thanh cong: ${exportResult.successRecords}, That bai: ${exportResult.failedRecords}`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {exportResult.errors && exportResult.errors.length > 0 && (
            <Alert
              title={`Co ${exportResult.errors.length} ho so loi`}
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
              Tai XML
            </Button>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={handleSignExport}
              loading={signLoading}
              size="large"
            >
              Ky so XML
            </Button>
          </Space>
        </Card>
      )}

      {/* Step 4: Sign result */}
      {signResult && (
        <Card title="Buoc 4: Ket qua ky so" size="small">
          <Alert
            title={signResult.success ? 'Ky so XML thanh cong!' : 'Ky so XML khong thanh cong'}
            description={signResult.message}
            type={signResult.success ? 'success' : 'error'}
            showIcon
          />
        </Card>
      )}

      {/* Existing batches table */}
      <Card title="Lich su xuat XML" size="small">
        <Table
          columns={xmlColumns}
          dataSource={xmlBatches}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tong: ${total} lo`,
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
      <Card title="Tra cuu the BHYT" size="small">
        <Form form={verifyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="insuranceNumber"
                label="So the BHYT"
                rules={[{ required: true, message: 'Vui long nhap so the BHYT' }]}
              >
                <Input placeholder="Nhap so the BHYT (15 ky tu)" maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="patientName" label="Ho ten benh nhan">
                <Input placeholder="Nhap ho ten (khong bat buoc)" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="dateOfBirth" label="Ngay sinh">
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
                  Xac minh
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {cardVerification && (
        <Card
          title="Ket qua xac minh"
          size="small"
          extra={
            <Button
              icon={<HistoryOutlined />}
              onClick={handleViewHistory}
              loading={historyLoading}
            >
              Xem lich su KCB
            </Button>
          }
        >
          <Alert
            title={cardVerification.duDkKcb ? 'Du dieu kien KCB' : 'Khong du dieu kien KCB'}
            description={cardVerification.duDkKcb
              ? `Muc huong: ${cardVerification.mucHuong}% | Hieu luc: ${cardVerification.gtTheTu ? dayjs(cardVerification.gtTheTu).format('DD/MM/YYYY') : ''} - ${cardVerification.gtTheDen ? dayjs(cardVerification.gtTheDen).format('DD/MM/YYYY') : ''}`
              : cardVerification.lyDoKhongDuDk || 'Khong co thong tin'}
            type={cardVerification.duDkKcb ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Ma the" span={2}>
              <Text code strong>{cardVerification.maThe}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ho ten">
              {cardVerification.hoTen}
            </Descriptions.Item>
            <Descriptions.Item label="Ngay sinh">
              {cardVerification.ngaySinh ? dayjs(cardVerification.ngaySinh).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Gioi tinh">
              {cardVerification.gioiTinh === 1 ? 'Nam' : cardVerification.gioiTinh === 2 ? 'Nu' : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Dia chi">
              {cardVerification.diaChi || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="GT the tu">
              {cardVerification.gtTheTu ? dayjs(cardVerification.gtTheTu).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="GT the den">
              {cardVerification.gtTheDen ? dayjs(cardVerification.gtTheDen).format('DD/MM/YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Noi DKKCB BD" span={2}>
              {cardVerification.tenDkbd || '-'} ({cardVerification.maDkbd || '-'})
            </Descriptions.Item>
            <Descriptions.Item label="Muc huong">
              <Text strong style={{ color: '#1890ff' }}>{cardVerification.mucHuong}%</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Du DK KCB">
              {cardVerification.duDkKcb ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Du dieu kien</Tag>
              ) : (
                <Tag color="red" icon={<WarningOutlined />}>Khong du DK</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Mien cung CT">
              {cardVerification.mienCungCt ? <Tag color="green">Co</Tag> : <Tag>Khong</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Loai the">
              {cardVerification.loaiThe || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ma khu vuc">
              {cardVerification.maKv || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tra truoc">
              {cardVerification.isTraTruoc ? <Tag color="orange">Co</Tag> : <Tag>Khong</Tag>}
            </Descriptions.Item>
            {cardVerification.lyDoKhongDuDk && (
              <Descriptions.Item label="Ly do khong du DK" span={2}>
                <Text type="danger">{cardVerification.lyDoKhongDuDk}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Thoi gian xac minh" span={2}>
              {cardVerification.verificationTime ? dayjs(cardVerification.verificationTime).format('DD/MM/YYYY HH:mm:ss') : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );

  return (
    <div>
      <Title level={4}>Giam dinh BHYT</Title>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tong ho so"
              value={totalClaims}
              prefix={<FileDoneOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cho giam dinh"
              value={pendingClaims}
              styles={{ content: { color: pendingClaims > 0 ? '#faad14' : '#52c41a' } }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Da duyet / Tu choi"
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
              title="Tong BHYT chi tra"
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
                  Ho so giam dinh
                  {pendingClaims > 0 && <Badge count={pendingClaims} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Space>
                        <Search
                          placeholder="Tim theo ma giam dinh, ma BN, so the BHYT..."
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
                          Duyet giam dinh
                        </Button>
                        <Button
                          icon={<LockOutlined />}
                          onClick={handleLockClaims}
                          disabled={selectedRowKeys.length === 0}
                        >
                          Khoa giam dinh
                        </Button>
                        <Button icon={<SyncOutlined />} onClick={handleSync} loading={syncLoading}>
                          Dong bo
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  {rejectedClaims > 0 && (
                    <Alert
                      title={`Co ${rejectedClaims} ho so bi tu choi can xu ly`}
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
                          Xem chi tiet
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
                      showTotal: (total) => `Tong: ${total} ho so`,
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
                  Xuat XML
                </span>
              ),
              children: renderXmlExportTab(),
            },
            {
              key: 'verify',
              label: (
                <span>
                  <IdcardOutlined />
                  Tra cuu the
                </span>
              ),
              children: renderCardVerificationTab(),
            },
            {
              key: 'reports',
              label: (
                <span>
                  <PrinterOutlined />
                  Bao cao BHYT
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau19'}
                      onClick={() => handleReportClick('mau19', 'Bao cao mau 19')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                          <Text strong>Bao cao mau 19</Text>
                          <br />
                          <Text type="secondary">Bao cao tong hop KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau20'}
                      onClick={() => handleReportClick('mau20', 'Bao cao mau 20')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        <div>
                          <Text strong>Bao cao mau 20</Text>
                          <br />
                          <Text type="secondary">Chi tiet chi phi KCB BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau21'}
                      onClick={() => handleReportClick('mau21', 'Bao cao mau 21')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        <div>
                          <Text strong>Bao cao mau 21</Text>
                          <br />
                          <Text type="secondary">Bao cao chi tiet theo doi tuong</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau79'}
                      onClick={() => handleReportClick('mau79', 'Bao cao mau 79')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                        <div>
                          <Text strong>Bao cao mau 79</Text>
                          <br />
                          <Text type="secondary">Bao cao chi tiet PTTT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'mau80'}
                      onClick={() => handleReportClick('mau80', 'Bao cao mau 80')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#faad14' }} />
                        <div>
                          <Text strong>Bao cao mau 80</Text>
                          <br />
                          <Text type="secondary">Tong hop chi phi thuoc BHYT</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card
                      hoverable
                      loading={reportLoading === 'tt102'}
                      onClick={() => handleReportClick('tt102', 'Bao cao TT 102/2018')}
                    >
                      <Space>
                        <PrinterOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                        <div>
                          <Text strong>Bao cao TT 102/2018</Text>
                          <br />
                          <Text type="secondary">Bao cao theo Thong tu 102/2018/TT-BTC</Text>
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
        title="Chi tiet ho so giam dinh"
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
              if (!selectedClaim) { message.warning('Vui long chon ho so can in'); return; }
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                message.warning('Khong the mo cua so in. Vui long cho phep popup.');
                return;
              }
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Bang ke giam dinh BHYT - ${selectedClaim.claimCode}</title>
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
                      <div>Phong Tai chinh - Ke toan</div>
                    </div>
                    <div style="text-align: right;">
                      <div><strong>Mau: BHYT-BK</strong></div>
                      <div>So: ${selectedClaim.claimCode}</div>
                    </div>
                  </div>

                  <div class="title">BANG KE CHI PHI KHAM CHUA BENH BHYT</div>
                  <div style="text-align: center; margin-bottom: 15px;">
                    Ngay ${dayjs().format('DD')} thang ${dayjs().format('MM')} nam ${dayjs().format('YYYY')}
                  </div>

                  <div class="info-row">Ma giam dinh: <span class="field"><strong>${selectedClaim.claimCode}</strong></span></div>
                  <div class="info-row">Ma BN: <span class="field">${selectedClaim.patientCode}</span> Ho ten BN: <span class="field" style="width: 250px;"><strong>${selectedClaim.patientName}</strong></span></div>
                  <div class="info-row">So the BHYT: <span class="field">${selectedClaim.insuranceNumber}</span></div>
                  <div class="info-row">Ngay kham: <span class="field">${dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}</span> Ngay ra vien: <span class="field">${selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '---'}</span></div>
                  <div class="info-row">Khoa/Phong: <span class="field">${selectedClaim.department || '---'}</span></div>
                  <div class="info-row">Chan doan: <span class="field" style="width: 400px;">${selectedClaim.diagnosis}</span></div>

                  <table>
                    <thead>
                      <tr>
                        <th>Noi dung</th>
                        <th class="text-right" style="width: 180px;">So tien (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Tong chi phi KCB</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                      <tr>
                        <td>BHYT chi tra</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.insuranceAmount)}</td>
                      </tr>
                      <tr>
                        <td>Nguoi benh chi tra</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.patientAmount)}</td>
                      </tr>
                      <tr class="total-row">
                        <td>Tong cong</td>
                        <td class="text-right">${new Intl.NumberFormat('vi-VN').format(selectedClaim.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  ${selectedClaim.status === 4 && selectedClaim.rejectReason ? `
                    <div class="reject-box">
                      <strong>Ly do tu choi:</strong> ${selectedClaim.rejectReason}
                    </div>
                  ` : ''}

                  ${selectedClaim.submittedDate ? `<div class="info-row">Ngay gui BHXH: <span class="field">${dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}</span></div>` : ''}

                  <div class="signature-row">
                    <div class="signature-col">
                      <div><strong>NGUOI LAP BANG KE</strong></div>
                      <div>(Ky, ghi ro ho ten)</div>
                    </div>
                    <div class="signature-col">
                      <div><strong>KE TOAN VIEN PHI</strong></div>
                      <div>(Ky, ghi ro ho ten)</div>
                    </div>
                    <div class="signature-col">
                      <div><strong>GIAM DOC BENH VIEN</strong></div>
                      <div>(Ky ten, dong dau)</div>
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
            In bang ke
          </Button>,
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Dong
          </Button>,
        ]}
        width={800}
      >
        {selectedClaim && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Ma giam dinh">{selectedClaim.claimCode}</Descriptions.Item>
              <Descriptions.Item label="Trang thai">{getClaimStatusTag(selectedClaim.status)}</Descriptions.Item>
              <Descriptions.Item label="Ma BN">{selectedClaim.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Ho ten BN">{selectedClaim.patientName}</Descriptions.Item>
              <Descriptions.Item label="So the BHYT" span={2}>
                <Text code>{selectedClaim.insuranceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngay kham">
                {dayjs(selectedClaim.visitDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngay ra vien">
                {selectedClaim.dischargeDate ? dayjs(selectedClaim.dischargeDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Khoa/Phong">{selectedClaim.department}</Descriptions.Item>
              <Descriptions.Item label="Chan doan" span={2}>{selectedClaim.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="Tong chi phi">
                <Text strong>{formatCurrency(selectedClaim.totalAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BHYT chi tra">
                <Text type="success" strong>{formatCurrency(selectedClaim.insuranceAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="BN chi tra">
                {formatCurrency(selectedClaim.patientAmount)}
              </Descriptions.Item>
              {selectedClaim.submittedDate && (
                <Descriptions.Item label="Ngay gui BHXH">
                  {dayjs(selectedClaim.submittedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.approvedDate && (
                <Descriptions.Item label="Ngay duyet">
                  {dayjs(selectedClaim.approvedDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {selectedClaim.rejectReason && (
                <Descriptions.Item label="Ly do tu choi" span={2}>
                  <Text type="danger">{selectedClaim.rejectReason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedClaim.status === 4 && (
              <Alert
                title="Ho so bi tu choi"
                description={`Ly do: ${selectedClaim.rejectReason}. Vui long kiem tra va cap nhat ho so.`}
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
        title="Lich su kham chua benh BHYT"
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
                <Descriptions.Item label="Ma the BHYT">
                  <Text code>{insuranceHistory.maThe}</Text>
                </Descriptions.Item>
              </Descriptions>
              <Table
                size="small"
                columns={[
                  {
                    title: 'Ngay KCB',
                    dataIndex: 'ngayKcb',
                    key: 'ngayKcb',
                    width: 110,
                    render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
                  {
                    title: 'Ten CSKCB',
                    dataIndex: 'tenCsKcb',
                    key: 'tenCsKcb',
                  },
                  {
                    title: 'Ma benh chinh',
                    dataIndex: 'maBenhChinh',
                    key: 'maBenhChinh',
                    width: 120,
                  },
                  {
                    title: 'Ten benh chinh',
                    dataIndex: 'tenBenhChinh',
                    key: 'tenBenhChinh',
                  },
                  {
                    title: 'Tien BHYT',
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
