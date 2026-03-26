import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  Input,
  Button,
  Table,
  Tabs,
  Space,
  Tag,
  Modal,
  message,
  Spin,
  Row,
  Col,
  DatePicker,
  Select,
  Upload,
  Descriptions,
  Drawer,
  Badge,
  Checkbox,
  Tooltip,
  Statistic,
  Popconfirm,
  Form,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  UserOutlined,
  EyeOutlined,
  FilterOutlined,
  AuditOutlined,
  TeamOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import dayjs from 'dayjs';
import client from '../api/client';
import { HOSPITAL_NAME } from '../constants/hospital';
import { isApiAvailable } from '../utils/apiAvailability';

const { RangePicker } = DatePicker;
const { Search } = Input;

type ClaimSearchItem = {
  id: string;
  maLk?: string;
  claimCode?: string;
  patientCode?: string;
  maBn?: string;
  patientName?: string;
  hoTen?: string;
  insuranceNumber?: string;
  maThe?: string;
  admissionDate?: string;
  ngayVao?: string;
  dischargeDate?: string;
  ngayRa?: string;
  departmentName?: string;
  tenKhoa?: string;
  departmentId?: string;
  diagnosisCode?: string;
  maBenhChinh?: string;
  diagnosisName?: string;
  totalAmount?: number;
  insuranceAmount?: number;
  tienBhyt?: number;
  patientAmount?: number;
  tienNguoibenh?: number;
  auditStatus?: number;
  paymentStatus?: number;
  sentToPortal?: boolean;
  status?: number;
  sentDate?: string;
  submitDate?: string;
  approvedDate?: string;
  rejectReason?: string;
  auditorNote?: string;
};

type DepartmentItem = {
  id: string;
  name?: string;
  tenKhoa?: string;
};

type AuditorAccountItem = {
  id?: string;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

type PortalRecordItem = {
  id?: string;
  maLk?: string;
  claimCode?: string;
  patientName?: string;
  insuranceNumber?: string;
  admissionDate?: string;
  dischargeDate?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  totalAmount?: number;
  insuranceAmount?: number;
  status?: string;
  sentDate?: string;
  hospitalName?: string;
  hospitalCode?: string;
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface AuditRecord {
  id: string;
  maLk: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  departmentName: string;
  departmentId?: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  auditStatus: number; // 0: Pending, 1: Approved, 2: Rejected
  paymentStatus: number; // 0: Unpaid, 1: Paid
  sentToPortal: boolean;
  sentDate?: string;
  approvedDate?: string;
  rejectReason?: string;
  auditorNote?: string;
}

interface AuditorAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  organization: string;
  role: string; // auditor | senior_auditor | admin
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface PortalRecord {
  id: string;
  maLk: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  status: string;
  sentDate: string;
  hospitalName: string;
  hospitalCode: string;
}

interface ImportPreview {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  records: AuditRecord[];
}

interface AuditStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}

interface Department {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BhxhAudit: React.FC = () => {
  const [moduleAvailable, setModuleAvailable] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('records');

  // Tab 1 - Records state
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [auditStatusFilter, setAuditStatusFilter] = useState<number | undefined>(undefined);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<number | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [stats, setStats] = useState<AuditStats>({ total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 });

  // Import Excel state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Detail drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  // Tab 2 - Audit Portal state
  const [auditorAccounts, setAuditorAccounts] = useState<AuditorAccount[]>([]);
  const [portalRecords, setPortalRecords] = useState<PortalRecord[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalSearch, setPortalSearch] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AuditorAccount | null>(null);
  const [accountForm] = Form.useForm();
  const [pdfDrawerOpen, setPdfDrawerOpen] = useState(false);
  const [selectedPortalRecord, setSelectedPortalRecord] = useState<PortalRecord | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        pageIndex: 0,
        pageSize: 200,
      };
      if (searchText) params.keyword = searchText;
      if (dateRange) {
        params.fromDate = dateRange[0].format('YYYY-MM-DD');
        params.toDate = dateRange[1].format('YYYY-MM-DD');
      }
      if (departmentFilter) params.departmentId = departmentFilter;
      if (auditStatusFilter !== undefined) params.auditStatus = auditStatusFilter;
      if (paymentStatusFilter !== undefined) params.paymentStatus = paymentStatusFilter;

      const res = await client.get('/insurance-xml/claims/search', { params });
      const items = res.data?.items || res.data?.data?.items || res.data || [];
      const mapped: AuditRecord[] = (Array.isArray(items) ? items : []).map((item: ClaimSearchItem) => ({
        id: item.id,
        maLk: item.maLk || item.claimCode || '',
        patientCode: item.patientCode || item.maBn || '',
        patientName: item.patientName || item.hoTen || '',
        insuranceNumber: item.insuranceNumber || item.maThe || '',
        admissionDate: item.admissionDate || item.ngayVao || '',
        dischargeDate: item.dischargeDate || item.ngayRa || undefined,
        departmentName: item.departmentName || item.tenKhoa || '',
        departmentId: item.departmentId,
        diagnosisCode: item.diagnosisCode || item.maBenhChinh || '',
        diagnosisName: item.diagnosisName || '',
        totalAmount: item.totalAmount ?? 0,
        insuranceAmount: item.insuranceAmount ?? item.tienBhyt ?? 0,
        patientAmount: item.patientAmount ?? item.tienNguoibenh ?? 0,
        auditStatus: item.auditStatus ?? ((item.status ?? 0) >= 3 ? 1 : (item.status ?? 0) === 4 ? 2 : 0),
        paymentStatus: item.paymentStatus ?? 0,
        sentToPortal: item.sentToPortal ?? ((item.status ?? 0) >= 2),
        sentDate: item.sentDate || item.submitDate,
        approvedDate: item.approvedDate,
        rejectReason: item.rejectReason,
        auditorNote: item.auditorNote,
      }));

      setRecords(mapped);

      // Calculate stats
      const newStats: AuditStats = {
        total: mapped.length,
        pending: mapped.filter(r => r.auditStatus === 0).length,
        approved: mapped.filter(r => r.auditStatus === 1).length,
        rejected: mapped.filter(r => r.auditStatus === 2).length,
        totalAmount: mapped.reduce((sum, r) => sum + r.insuranceAmount, 0),
      };
      setStats(newStats);
    } catch (err) {
      console.warn('Failed to fetch audit records:', err);
      message.warning('Không thể tải danh sách hồ sơ giám định');
    } finally {
      setLoading(false);
    }
  }, [searchText, dateRange, departmentFilter, auditStatusFilter, paymentStatusFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await client.get('/catalog/departments');
      const depts = res.data?.data || res.data || [];
      setDepartments(
        (Array.isArray(depts) ? depts : []).map((d: DepartmentItem) => ({
          id: d.id,
          name: d.name || d.tenKhoa || '',
        }))
      );
    } catch (err) {
      console.warn('Failed to fetch departments:', err);
    }
  }, []);

  const fetchAuditorAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const res = await client.get('/insurance-xml/bhxh-audit/auditor-accounts');
      const accounts = res.data?.data || res.data || [];
      setAuditorAccounts(
        (Array.isArray(accounts) ? accounts : []).map((a: AuditorAccountItem) => ({
          id: a.id || '',
          username: a.username || '',
          fullName: a.fullName || '',
          email: a.email || '',
          phone: a.phone,
          organization: a.organization || 'BHXH Tỉnh',
          role: a.role || 'auditor',
          isActive: a.isActive ?? true,
          createdAt: a.createdAt || '',
          lastLoginAt: a.lastLoginAt,
        }))
      );
    } catch (err) {
      console.warn('Failed to fetch auditor accounts:', err);
      message.warning('Không thể tải danh sách tài khoản giám định viên');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchPortalRecords = useCallback(async () => {
    try {
      setPortalLoading(true);
      const params: Record<string, unknown> = { pageIndex: 0, pageSize: 200 };
      if (portalSearch) params.keyword = portalSearch;
      const res = await client.get('/insurance-xml/bhxh-audit/records', { params });
      const items = res.data?.items || res.data?.data?.items || res.data?.data || res.data || [];
      setPortalRecords(
        (Array.isArray(items) ? items : []).map((r: PortalRecordItem) => ({
          id: r.id || '',
          maLk: r.maLk || r.claimCode || '',
          patientName: r.patientName || '',
          insuranceNumber: r.insuranceNumber || '',
          admissionDate: r.admissionDate || '',
          dischargeDate: r.dischargeDate,
          diagnosisCode: r.diagnosisCode || '',
          diagnosisName: r.diagnosisName || '',
          totalAmount: r.totalAmount ?? 0,
          insuranceAmount: r.insuranceAmount ?? 0,
          status: r.status || 'sent',
          sentDate: r.sentDate || '',
          hospitalName: r.hospitalName || HOSPITAL_NAME,
          hospitalCode: r.hospitalCode || '',
        }))
      );
    } catch (err) {
      console.warn('Failed to fetch portal records:', err);
      message.warning('Không thể tải hồ sơ trên cổng giám định');
    } finally {
      setPortalLoading(false);
    }
  }, [portalSearch]);

  useEffect(() => {
    const checkAvailability = async () => {
      setAvailabilityLoading(true);
      const available = await isApiAvailable('/insurance-xml/bhxh-audit/records');
      setModuleAvailable(available);
      if (available) {
        fetchRecords();
        fetchDepartments();
      }
      setAvailabilityLoading(false);
    };

    checkAvailability();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (moduleAvailable && activeTab === 'portal') {
      fetchAuditorAccounts();
      fetchPortalRecords();
    }
  }, [activeTab, moduleAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const getAuditStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Chưa duyệt</Tag>;
      case 1:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
      case 2:
        return <Tag color="red" icon={<CloseCircleOutlined />}>Từ chối</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getPaymentStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Chưa thanh toán</Tag>;
      case 1:
        return <Tag color="green">Đã thanh toán</Tag>;
      default:
        return <Tag>Không xác định</Tag>;
    }
  };

  const getAuditorRoleTag = (role: string) => {
    switch (role) {
      case 'admin':
        return <Tag color="red">Quản trị</Tag>;
      case 'senior_auditor':
        return <Tag color="blue">GĐV Cấp cao</Tag>;
      case 'auditor':
        return <Tag color="green">Giám định viên</Tag>;
      default:
        return <Tag>{role}</Tag>;
    }
  };

  // ---------------------------------------------------------------------------
  // Actions - Tab 1
  // ---------------------------------------------------------------------------

  const handleSearch = () => {
    fetchRecords();
  };

  const handleFilterByAuditStatus = (status: number | undefined) => {
    setAuditStatusFilter(prev => (prev === status ? undefined : status));
  };

  const handleFilterByPaymentStatus = (status: number | undefined) => {
    setPaymentStatusFilter(prev => (prev === status ? undefined : status));
  };

  const handleImportExcel = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn file Excel');
      return;
    }

    try {
      setImportLoading(true);
      const formData = new FormData();
      const file = fileList[0]?.originFileObj || fileList[0];
      formData.append('file', file as Blob);

      const res = await client.post('/insurance-xml/bhxh-audit/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const preview = res.data?.data || res.data;
      setImportPreview({
        totalRows: preview?.totalRows ?? 0,
        matchedRows: preview?.matchedRows ?? 0,
        unmatchedRows: preview?.unmatchedRows ?? 0,
        records: preview?.records || [],
      });

      message.success(`Đã đọc ${preview?.totalRows ?? 0} dòng từ file Excel`);
    } catch (err) {
      console.warn('Failed to import Excel:', err);
      message.warning('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImportLoading(true);
      // Confirm the imported records
      await fetchRecords();
      setImportModalOpen(false);
      setImportPreview(null);
      setFileList([]);
      message.success('Import danh sách hồ sơ giám định thành công');
    } catch (err) {
      console.warn('Failed to confirm import:', err);
      message.warning('Lỗi khi xác nhận import');
    } finally {
      setImportLoading(false);
    }
  };

  const handleApproveRecords = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 hồ sơ để duyệt');
      return;
    }

    try {
      setLoading(true);
      await client.post('/insurance-xml/bhxh-audit/approve', {
        recordIds: selectedRowKeys,
      });
      message.success(`Đã duyệt ${selectedRowKeys.length} hồ sơ`);
      setSelectedRowKeys([]);
      await fetchRecords();
    } catch (err) {
      console.warn('Failed to approve records:', err);
      message.warning('Không thể duyệt hồ sơ giám định');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPortal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ để gửi lên cổng giám định');
      return;
    }

    try {
      setLoading(true);
      await client.post('/insurance-xml/submit', {
        recordIds: selectedRowKeys,
      });
      message.success(`Đã gửi ${selectedRowKeys.length} hồ sơ lên cổng giám định điện tử BHXH tỉnh`);
      setSelectedRowKeys([]);
      await fetchRecords();
    } catch (err) {
      console.warn('Failed to send to BHXH portal:', err);
      message.warning('Không thể gửi hồ sơ lên cổng giám định BHXH');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const filtered = getFilteredRecords();
    const rows = filtered
      .map(
        (r, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.maLk}</td>
          <td>${r.patientName}</td>
          <td>${r.insuranceNumber}</td>
          <td>${r.diagnosisCode}</td>
          <td style="text-align:right">${formatVND(r.totalAmount)}</td>
          <td style="text-align:right">${formatVND(r.insuranceAmount)}</td>
          <td>${r.auditStatus === 1 ? 'Đã duyệt' : r.auditStatus === 2 ? 'Từ chối' : 'Chưa duyệt'}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html><head><title>Danh sách hồ sơ giám định BHXH</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #f0f0f0; }
        h2 { text-align: center; }
        .header { text-align: center; margin-bottom: 20px; }
      </style></head><body>
        <div class="header">
          <p>${HOSPITAL_NAME}</p>
          <h2>DANH SÁCH HỒ SƠ GỬI GIÁM ĐỊNH BHXH</h2>
          <p>Ngày in: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <table>
          <thead><tr>
            <th>STT</th><th>Mã liên kết</th><th>Họ tên BN</th>
            <th>Số thẻ BHYT</th><th>Mã bệnh</th><th>Tổng chi phí</th>
            <th>BHYT chi trả</th><th>Trạng thái</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:30px;text-align:right">
          <p><strong>Người in</strong></p><br/><br/>
          <p>____________________</p>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleViewDetail = (record: AuditRecord) => {
    setSelectedRecord(record);
    setDetailDrawerOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Actions - Tab 2 (Audit Portal)
  // ---------------------------------------------------------------------------

  const handleCreateAccount = () => {
    setEditingAccount(null);
    accountForm.resetFields();
    setAccountModalOpen(true);
  };

  const handleEditAccount = (account: AuditorAccount) => {
    setEditingAccount(account);
    accountForm.setFieldsValue({
      username: account.username,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      organization: account.organization,
      role: account.role,
      isActive: account.isActive,
    });
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async () => {
    try {
      const values = await accountForm.validateFields();
      await client.post('/insurance-xml/bhxh-audit/auditor-accounts', {
        ...values,
        id: editingAccount?.id,
      });
      message.success(editingAccount ? 'Cập nhật tài khoản thành công' : 'Tạo tài khoản thành công');
      setAccountModalOpen(false);
      accountForm.resetFields();
      setEditingAccount(null);
      await fetchAuditorAccounts();
    } catch (err) {
      console.warn('Failed to save auditor account:', err);
      message.warning('Không thể lưu tài khoản giám định viên');
    }
  };

  const handleViewRecordPdf = (record: PortalRecord) => {
    setSelectedPortalRecord(record);
    setPdfDrawerOpen(true);
  };

  const handlePortalSearch = () => {
    fetchPortalRecords();
  };

  // ---------------------------------------------------------------------------
  // Filter logic
  // ---------------------------------------------------------------------------

  const getFilteredRecords = useCallback((): AuditRecord[] => {
    let filtered = [...records];

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.maLk.toLowerCase().includes(lower) ||
          r.patientCode.toLowerCase().includes(lower) ||
          r.patientName.toLowerCase().includes(lower) ||
          r.insuranceNumber.toLowerCase().includes(lower)
      );
    }

    if (dateRange) {
      const [from, to] = dateRange;
      filtered = filtered.filter(r => {
        const d = dayjs(r.admissionDate);
        return d.isAfter(from.startOf('day').subtract(1, 'ms')) && d.isBefore(to.endOf('day').add(1, 'ms'));
      });
    }

    if (departmentFilter) {
      filtered = filtered.filter(r => r.departmentId === departmentFilter || r.departmentName === departmentFilter);
    }

    if (auditStatusFilter !== undefined) {
      filtered = filtered.filter(r => r.auditStatus === auditStatusFilter);
    }

    if (paymentStatusFilter !== undefined) {
      filtered = filtered.filter(r => r.paymentStatus === paymentStatusFilter);
    }

    return filtered;
  }, [records, searchText, dateRange, departmentFilter, auditStatusFilter, paymentStatusFilter]);

  // ---------------------------------------------------------------------------
  // Table columns - Tab 1
  // ---------------------------------------------------------------------------

  const recordColumns: ColumnsType<AuditRecord> = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Mã liên kết',
      dataIndex: 'maLk',
      key: 'maLk',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Họ tên BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 155,
      ellipsis: true,
    },
    {
      title: 'Ngày vào',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ngày ra',
      dataIndex: 'dischargeDate',
      key: 'dischargeDate',
      width: 100,
      render: (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Mã bệnh',
      dataIndex: 'diagnosisCode',
      key: 'diagnosisCode',
      width: 90,
    },
    {
      title: 'Tổng CP',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (v: number) => new Intl.NumberFormat('vi-VN').format(v),
    },
    {
      title: 'BHYT trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 120,
      align: 'right',
      render: (v: number) => new Intl.NumberFormat('vi-VN').format(v),
    },
    {
      title: 'Giám định',
      dataIndex: 'auditStatus',
      key: 'auditStatus',
      width: 110,
      align: 'center',
      render: (status: number) => getAuditStatusTag(status),
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 120,
      align: 'center',
      render: (status: number) => getPaymentStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: AuditRecord) => (
        <Tooltip title="Xem chi tiết">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Table columns - Auditor Accounts
  // ---------------------------------------------------------------------------

  const auditorColumns: ColumnsType<AuditorAccount> = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: 140,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 180,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Tổ chức',
      dataIndex: 'organization',
      key: 'organization',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      align: 'center',
      render: (role: string) => getAuditorRoleTag(role),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (active: boolean) =>
        active ? <Badge status="success" text="Hoạt động" /> : <Badge status="default" text="Khóa" />,
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 140,
      render: (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: AuditorAccount) => (
        <Button type="link" size="small" onClick={() => handleEditAccount(record)}>
          Sửa
        </Button>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Table columns - Portal Records
  // ---------------------------------------------------------------------------

  const portalRecordColumns: ColumnsType<PortalRecord> = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Mã liên kết',
      dataIndex: 'maLk',
      key: 'maLk',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Họ tên BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Số thẻ BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 155,
    },
    {
      title: 'Ngày vào',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Chẩn đoán',
      key: 'diagnosis',
      width: 180,
      ellipsis: true,
      render: (_, r: PortalRecord) => `${r.diagnosisCode} - ${r.diagnosisName}`,
    },
    {
      title: 'BHYT chi trả',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 120,
      align: 'right',
      render: (v: number) => new Intl.NumberFormat('vi-VN').format(v),
    },
    {
      title: 'CSKCB',
      dataIndex: 'hospitalName',
      key: 'hospitalName',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'sentDate',
      key: 'sentDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => {
        if (status === 'approved') return <Tag color="green">Đã duyệt</Tag>;
        if (status === 'rejected') return <Tag color="red">Từ chối</Tag>;
        return <Tag color="blue">Đã gửi</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: PortalRecord) => (
        <Tooltip title="Xem hồ sơ PDF">
          <Button type="link" size="small" icon={<FilePdfOutlined />} onClick={() => handleViewRecordPdf(record)} />
        </Tooltip>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Tab 1 content: Danh sách hồ sơ gửi giám định
  // ---------------------------------------------------------------------------

  const filteredRecords = getFilteredRecords();

  const renderRecordsTab = () => (
    <div>
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Tổng hồ sơ"
              value={stats.total}
              prefix={<AuditOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Chờ giám định"
              value={stats.pending}
              prefix={<FilterOutlined />}
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Đã duyệt"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Từ chối"
              value={stats.rejected}
              prefix={<CloseCircleOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={16} md={8}>
          <Card size="small">
            <Statistic
              title="Tổng BHYT chi trả"
              value={stats.totalAmount}
              prefix="VND"
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Search
              placeholder="Tìm kiếm: mã LK, tên BN, số thẻ..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} md={5}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates ? [dates[0]!, dates[1]!] : null)
              }
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Khoa phòng"
              value={departmentFilter}
              onChange={(v) => setDepartmentFilter(v)}
              allowClear
              showSearch
              optionFilterProp="label"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Col>
          <Col xs={24} md={9}>
            <Space wrap>
              <Button
                size="small"
                type={auditStatusFilter === 0 ? 'primary' : 'default'}
                onClick={() => handleFilterByAuditStatus(0)}
              >
                Chưa duyệt GĐ
              </Button>
              <Button
                size="small"
                type={auditStatusFilter === 1 ? 'primary' : 'default'}
                onClick={() => handleFilterByAuditStatus(1)}
                icon={<CheckCircleOutlined />}
              >
                Đã duyệt GĐ
              </Button>
              <Button
                size="small"
                type={paymentStatusFilter === 1 ? 'primary' : 'default'}
                onClick={() => handleFilterByPaymentStatus(1)}
              >
                BN đã TT
              </Button>
              <Button
                size="small"
                type={paymentStatusFilter === 0 ? 'primary' : 'default'}
                onClick={() => handleFilterByPaymentStatus(0)}
              >
                BN chưa TT
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Action buttons */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import Excel từ BHXH
          </Button>
          <Popconfirm
            title={`Duyệt ${selectedRowKeys.length} hồ sơ?`}
            description="Hồ sơ sẽ được đánh dấu đã duyệt giám định BHXH"
            onConfirm={handleApproveRecords}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={selectedRowKeys.length === 0}
            >
              Duyệt giám định ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
          <Button icon={<PrinterOutlined />} onClick={handlePrintList}>
            In danh sách
          </Button>
          <Popconfirm
            title={`Gửi ${selectedRowKeys.length} hồ sơ lên cổng giám định?`}
            description="Hồ sơ sẽ được gửi lên cổng giám định điện tử BHXH tỉnh"
            onConfirm={handleSendToPortal}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              icon={<SendOutlined />}
              disabled={selectedRowKeys.length === 0}
              style={{ background: selectedRowKeys.length > 0 ? '#722ed1' : undefined, color: selectedRowKeys.length > 0 ? '#fff' : undefined }}
            >
              Gửi cổng GĐ BHXH tỉnh
            </Button>
          </Popconfirm>
          <Button icon={<ReloadOutlined />} onClick={() => { setAuditStatusFilter(undefined); setPaymentStatusFilter(undefined); setDepartmentFilter(undefined); setSearchText(''); setDateRange(null); fetchRecords(); }}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card size="small">
        <Table
          rowKey="id"
          columns={recordColumns}
          dataSource={filteredRecords}
          loading={loading}
          size="small"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total) => `Tổng ${total} hồ sơ`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleViewDetail(record),
          })}
        />
      </Card>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab 2 content: Cổng giám định
  // ---------------------------------------------------------------------------

  const renderPortalTab = () => (
    <div>
      {/* Auditor Account Management */}
      <Card
        size="small"
        title={
          <Space>
            <TeamOutlined />
            <span>Quản lý tài khoản giám định viên</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<UserOutlined />} onClick={handleCreateAccount}>
            Tạo tài khoản
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Table
          rowKey="id"
          columns={auditorColumns}
          dataSource={auditorAccounts}
          loading={accountsLoading}
          size="small"
          pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} tài khoản` }}
        />
      </Card>

      <Divider />

      {/* Portal Records */}
      <Card
        size="small"
        title={
          <Space>
            <AuditOutlined />
            <span>Hồ sơ bệnh án điện tử gửi giám định</span>
          </Space>
        }
        extra={
          <Space>
            <Search
              placeholder="Tìm kiếm: mã LK, tên BN, số thẻ..."
              value={portalSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPortalSearch(e.target.value)}
              onSearch={handlePortalSearch}
              allowClear
              style={{ width: 300 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchPortalRecords}>
              Làm mới
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={portalRecordColumns}
          dataSource={portalRecords}
          loading={portalLoading}
          size="small"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => `Tổng ${total} hồ sơ`,
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleViewRecordPdf(record),
          })}
        />
      </Card>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (availabilityLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spin /></div>;
  }

  if (!moduleAvailable) {
    return (
      <Card>
        <Space orientation="vertical" size="small">
          <strong>Màn hình giám định BHXH chưa khả dụng.</strong>
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>
            Backend hiện chưa cung cấp các endpoint `/api/insurance-xml/bhxh-audit/*`, nên frontend tạm thời không gọi các API này để tránh lỗi `404`.
          </span>
        </Space>
      </Card>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, background: 'rgba(168,85,247,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>
    <Spin spinning={false}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card
        title={
          <Space>
            <AuditOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <span>Giám định BHXH</span>
          </Space>
        }
        styles={{ body: { padding: 16 } }}
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'records',
              label: (
                <span>
                  <FileExcelOutlined />
                  {' '}Danh sách hồ sơ giám định
                </span>
              ),
              children: renderRecordsTab(),
            },
            {
              key: 'portal',
              label: (
                <span>
                  <CloudUploadOutlined />
                  {' '}Cổng giám định
                </span>
              ),
              children: renderPortalTab(),
            },
          ]}
        />
      </Card>

      {/* Import Excel Modal */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <span>Import danh sách hồ sơ từ BHXH</span>
          </Space>
        }
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportPreview(null);
          setFileList([]);
        }}
        footer={
          importPreview ? (
            <Space>
              <Button onClick={() => { setImportPreview(null); setFileList([]); }}>Chọn lại file</Button>
              <Button type="primary" onClick={handleConfirmImport} loading={importLoading}>
                Xác nhận import ({importPreview.matchedRows} hồ sơ)
              </Button>
            </Space>
          ) : null
        }
      >
        {!importPreview ? (
          <div>
            <p style={{ marginBottom: 16 }}>
              Chọn file Excel (*.xlsx, *.xls) chứa danh sách hồ sơ BHXH gửi về để đối chiếu và giám định.
            </p>
            <Upload.Dragger
              accept=".xlsx,.xls"
              maxCount={1}
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={() => false}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              </p>
              <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc click để chọn file</p>
              <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx và .xls</p>
            </Upload.Dragger>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleImportExcel}
              loading={importLoading}
              disabled={fileList.length === 0}
              block
            >
              Đọc file Excel
            </Button>
          </div>
        ) : (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="Tổng dòng" value={importPreview.totalRows} styles={{ content: { color: '#1890ff' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Khớp mã liên kết" value={importPreview.matchedRows} styles={{ content: { color: '#52c41a' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Không khớp" value={importPreview.unmatchedRows} styles={{ content: { color: '#ff4d4f' } }} />
              </Col>
            </Row>
            {importPreview.unmatchedRows > 0 && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                Có {importPreview.unmatchedRows} dòng không khớp mã liên kết với dữ liệu trong hệ thống. Các dòng này sẽ bị bỏ qua.
              </div>
            )}
            <Table
              rowKey="maLk"
              columns={[
                { title: 'STT', key: 'stt', width: 55, render: (_, __, idx) => idx + 1 },
                { title: 'Mã liên kết', dataIndex: 'maLk', width: 130 },
                { title: 'Họ tên BN', dataIndex: 'patientName', width: 160 },
                { title: 'Số thẻ BHYT', dataIndex: 'insuranceNumber', width: 155 },
                { title: 'Tổng CP', dataIndex: 'totalAmount', width: 120, align: 'right' as const, render: (v: number) => new Intl.NumberFormat('vi-VN').format(v || 0) },
              ]}
              dataSource={importPreview.records}
              size="small"
              pagination={{ pageSize: 20 }}
              scroll={{ y: 300 }}
            />
          </div>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Chi tiết hồ sơ giám định"
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      >
        {selectedRecord && (
          <div>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Mã liên kết" span={2}>{selectedRecord.maLk}</Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{selectedRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{selectedRecord.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT" span={2}>{selectedRecord.insuranceNumber}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào">{selectedRecord.admissionDate ? dayjs(selectedRecord.admissionDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày ra">{selectedRecord.dischargeDate ? dayjs(selectedRecord.dischargeDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Khoa điều trị" span={2}>{selectedRecord.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>{selectedRecord.diagnosisCode} - {selectedRecord.diagnosisName}</Descriptions.Item>
            </Descriptions>

            <Divider>Chi phí</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Tổng chi phí">{formatVND(selectedRecord.totalAmount)}</Descriptions.Item>
              <Descriptions.Item label="BHYT chi trả">{formatVND(selectedRecord.insuranceAmount)}</Descriptions.Item>
              <Descriptions.Item label="BN tự trả" span={2}>{formatVND(selectedRecord.patientAmount)}</Descriptions.Item>
            </Descriptions>

            <Divider>Trạng thái</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Giám định">{getAuditStatusTag(selectedRecord.auditStatus)}</Descriptions.Item>
              <Descriptions.Item label="Thanh toán">{getPaymentStatusTag(selectedRecord.paymentStatus)}</Descriptions.Item>
              <Descriptions.Item label="Gửi cổng GĐ">
                {selectedRecord.sentToPortal ? (
                  <Tag color="blue">Đã gửi ({selectedRecord.sentDate ? dayjs(selectedRecord.sentDate).format('DD/MM/YYYY') : ''})</Tag>
                ) : (
                  <Tag>Chưa gửi</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày duyệt">
                {selectedRecord.approvedDate ? dayjs(selectedRecord.approvedDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.rejectReason && (
              <>
                <Divider>Lý do từ chối</Divider>
                <div style={{ padding: '8px 12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4 }}>
                  {selectedRecord.rejectReason}
                </div>
              </>
            )}

            {selectedRecord.auditorNote && (
              <>
                <Divider>Ghi chú giám định viên</Divider>
                <div style={{ padding: '8px 12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
                  {selectedRecord.auditorNote}
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Auditor Account Modal */}
      <Modal
        title={editingAccount ? 'Cập nhật tài khoản giám định viên' : 'Tạo tài khoản giám định viên'}
        open={accountModalOpen}
        onOk={handleSaveAccount}
        onCancel={() => {
          setAccountModalOpen(false);
          accountForm.resetFields();
          setEditingAccount(null);
        }}
        okText={editingAccount ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
      >
        <Form form={accountForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tên đăng nhập"
                name="username"
                rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="username" disabled={!!editingAccount} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Họ và tên"
                name="fullName"
                rules={[{ required: true, message: 'Nhập họ và tên' }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input placeholder="email@bhxh.gov.vn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Số điện thoại" name="phone">
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tổ chức"
                name="organization"
                rules={[{ required: true, message: 'Nhập tổ chức' }]}
              >
                <Input placeholder="BHXH Tỉnh / Thành phố" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Vai trò"
                name="role"
                rules={[{ required: true, message: 'Chọn vai trò' }]}
              >
                <Select
                  placeholder="Chọn vai trò"
                  options={[
                    { value: 'auditor', label: 'Giám định viên' },
                    { value: 'senior_auditor', label: 'GĐV Cấp cao' },
                    { value: 'admin', label: 'Quản trị' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          {editingAccount && (
            <Form.Item name="isActive" valuePropName="checked">
              <Checkbox>Tài khoản đang hoạt động</Checkbox>
            </Form.Item>
          )}
          {!editingAccount && (
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[
                { required: true, message: 'Nhập mật khẩu' },
                { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' },
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* PDF Viewer Drawer */}
      <Drawer
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>Hồ sơ bệnh án điện tử</span>
          </Space>
        }
        open={pdfDrawerOpen}
        onClose={() => setPdfDrawerOpen(false)}
      >
        {selectedPortalRecord && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã liên kết">{selectedPortalRecord.maLk}</Descriptions.Item>
              <Descriptions.Item label="Họ tên BN">{selectedPortalRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="Số thẻ BHYT">{selectedPortalRecord.insuranceNumber}</Descriptions.Item>
              <Descriptions.Item label="CSKCB">{selectedPortalRecord.hospitalName}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào">{selectedPortalRecord.admissionDate ? dayjs(selectedPortalRecord.admissionDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày ra">{selectedPortalRecord.dischargeDate ? dayjs(selectedPortalRecord.dischargeDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Chẩn đoán" span={2}>
                {selectedPortalRecord.diagnosisCode} - {selectedPortalRecord.diagnosisName}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng chi phí">{new Intl.NumberFormat('vi-VN').format(selectedPortalRecord.totalAmount)} VND</Descriptions.Item>
              <Descriptions.Item label="BHYT chi trả">{new Intl.NumberFormat('vi-VN').format(selectedPortalRecord.insuranceAmount)} VND</Descriptions.Item>
            </Descriptions>

            <Divider />

            <div
              style={{
                background: '#fafafa',
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 40,
                textAlign: 'center',
                minHeight: 400,
              }}
            >
              <FilePdfOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>Hồ sơ bệnh án điện tử</p>
              <p style={{ color: '#888', marginBottom: 24 }}>
                {selectedPortalRecord.patientName} - {selectedPortalRecord.maLk}
              </p>
              <Space>
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    window.open(
                      `${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}/insurance-xml/bhxh-audit/records/${selectedPortalRecord.id}/pdf`,
                      '_blank'
                    );
                  }}
                >
                  Xem PDF
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5106/api'}/insurance-xml/bhxh-audit/records/${selectedPortalRecord.id}/pdf`;
                    link.download = `HSBA_${selectedPortalRecord.maLk}.pdf`;
                    link.click();
                  }}
                >
                  Tải xuống
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
      </motion.div>
    </Spin>
    </div>
  );
};

export default BhxhAudit;
