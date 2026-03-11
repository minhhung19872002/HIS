import React, { useState, useEffect, useCallback } from 'react';
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
  SearchOutlined,
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

const { RangePicker } = DatePicker;
const { Search } = Input;

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
      const mapped: AuditRecord[] = (Array.isArray(items) ? items : []).map((item: any) => ({
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
        auditStatus: item.auditStatus ?? (item.status >= 3 ? 1 : item.status === 4 ? 2 : 0),
        paymentStatus: item.paymentStatus ?? 0,
        sentToPortal: item.sentToPortal ?? (item.status >= 2),
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
      message.warning('Khong the tai danh sach ho so giam dinh');
    } finally {
      setLoading(false);
    }
  }, [searchText, dateRange, departmentFilter, auditStatusFilter, paymentStatusFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await client.get('/catalog/departments');
      const depts = res.data?.data || res.data || [];
      setDepartments(
        (Array.isArray(depts) ? depts : []).map((d: any) => ({
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
        (Array.isArray(accounts) ? accounts : []).map((a: any) => ({
          id: a.id || '',
          username: a.username || '',
          fullName: a.fullName || '',
          email: a.email || '',
          phone: a.phone,
          organization: a.organization || 'BHXH Tinh',
          role: a.role || 'auditor',
          isActive: a.isActive ?? true,
          createdAt: a.createdAt || '',
          lastLoginAt: a.lastLoginAt,
        }))
      );
    } catch (err) {
      console.warn('Failed to fetch auditor accounts:', err);
      message.warning('Khong the tai danh sach tai khoan giam dinh vien');
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
        (Array.isArray(items) ? items : []).map((r: any) => ({
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
      message.warning('Khong the tai ho so tren cong giam dinh');
    } finally {
      setPortalLoading(false);
    }
  }, [portalSearch]);

  useEffect(() => {
    fetchRecords();
    fetchDepartments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'portal') {
      fetchAuditorAccounts();
      fetchPortalRecords();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
  };

  const getAuditStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="orange">Chua duyet</Tag>;
      case 1:
        return <Tag color="green" icon={<CheckCircleOutlined />}>Da duyet</Tag>;
      case 2:
        return <Tag color="red" icon={<CloseCircleOutlined />}>Tu choi</Tag>;
      default:
        return <Tag>Khong xac dinh</Tag>;
    }
  };

  const getPaymentStatusTag = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="default">Chua thanh toan</Tag>;
      case 1:
        return <Tag color="green">Da thanh toan</Tag>;
      default:
        return <Tag>Khong xac dinh</Tag>;
    }
  };

  const getAuditorRoleTag = (role: string) => {
    switch (role) {
      case 'admin':
        return <Tag color="red">Quan tri</Tag>;
      case 'senior_auditor':
        return <Tag color="blue">GDV Cap cao</Tag>;
      case 'auditor':
        return <Tag color="green">Giam dinh vien</Tag>;
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
      message.warning('Vui long chon file Excel');
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

      message.success(`Da doc ${preview?.totalRows ?? 0} dong tu file Excel`);
    } catch (err) {
      console.warn('Failed to import Excel:', err);
      message.warning('Khong the doc file Excel. Vui long kiem tra dinh dang file');
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
      message.success('Import danh sach ho so giam dinh thanh cong');
    } catch (err) {
      console.warn('Failed to confirm import:', err);
      message.warning('Loi khi xac nhan import');
    } finally {
      setImportLoading(false);
    }
  };

  const handleApproveRecords = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui long chon it nhat 1 ho so de duyet');
      return;
    }

    try {
      setLoading(true);
      await client.post('/insurance-xml/bhxh-audit/approve', {
        recordIds: selectedRowKeys,
      });
      message.success(`Da duyet ${selectedRowKeys.length} ho so`);
      setSelectedRowKeys([]);
      await fetchRecords();
    } catch (err) {
      console.warn('Failed to approve records:', err);
      message.warning('Khong the duyet ho so giam dinh');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPortal = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui long chon ho so de gui len cong giam dinh');
      return;
    }

    try {
      setLoading(true);
      await client.post('/insurance-xml/submit', {
        recordIds: selectedRowKeys,
      });
      message.success(`Da gui ${selectedRowKeys.length} ho so len cong giam dinh dien tu BHXH tinh`);
      setSelectedRowKeys([]);
      await fetchRecords();
    } catch (err) {
      console.warn('Failed to send to BHXH portal:', err);
      message.warning('Khong the gui ho so len cong giam dinh BHXH');
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
          <td>${r.auditStatus === 1 ? 'Da duyet' : r.auditStatus === 2 ? 'Tu choi' : 'Chua duyet'}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html><head><title>Danh sach ho so giam dinh BHXH</title>
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
          <h2>DANH SACH HO SO GUI GIAM DINH BHXH</h2>
          <p>Ngay in: ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <table>
          <thead><tr>
            <th>STT</th><th>Ma lien ket</th><th>Ho ten BN</th>
            <th>So the BHYT</th><th>Ma benh</th><th>Tong chi phi</th>
            <th>BHYT chi tra</th><th>Trang thai</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:30px;text-align:right">
          <p><strong>Nguoi in</strong></p><br/><br/>
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
      message.success(editingAccount ? 'Cap nhat tai khoan thanh cong' : 'Tao tai khoan thanh cong');
      setAccountModalOpen(false);
      accountForm.resetFields();
      setEditingAccount(null);
      await fetchAuditorAccounts();
    } catch (err) {
      console.warn('Failed to save auditor account:', err);
      message.warning('Khong the luu tai khoan giam dinh vien');
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
      title: 'Ma lien ket',
      dataIndex: 'maLk',
      key: 'maLk',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Ho ten BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'So the BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 155,
      ellipsis: true,
    },
    {
      title: 'Ngay vao',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ngay ra',
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
      title: 'Ma benh',
      dataIndex: 'diagnosisCode',
      key: 'diagnosisCode',
      width: 90,
    },
    {
      title: 'Tong CP',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (v: number) => new Intl.NumberFormat('vi-VN').format(v),
    },
    {
      title: 'BHYT tra',
      dataIndex: 'insuranceAmount',
      key: 'insuranceAmount',
      width: 120,
      align: 'right',
      render: (v: number) => new Intl.NumberFormat('vi-VN').format(v),
    },
    {
      title: 'Giam dinh',
      dataIndex: 'auditStatus',
      key: 'auditStatus',
      width: 110,
      align: 'center',
      render: (status: number) => getAuditStatusTag(status),
    },
    {
      title: 'Thanh toan',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 120,
      align: 'center',
      render: (status: number) => getPaymentStatusTag(status),
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: AuditRecord) => (
        <Tooltip title="Xem chi tiet">
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
      title: 'Ten dang nhap',
      dataIndex: 'username',
      key: 'username',
      width: 140,
    },
    {
      title: 'Ho ten',
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
      title: 'To chuc',
      dataIndex: 'organization',
      key: 'organization',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Vai tro',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      align: 'center',
      render: (role: string) => getAuditorRoleTag(role),
    },
    {
      title: 'Trang thai',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (active: boolean) =>
        active ? <Badge status="success" text="Hoat dong" /> : <Badge status="default" text="Khoa" />,
    },
    {
      title: 'Dang nhap cuoi',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 140,
      render: (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: AuditorAccount) => (
        <Button type="link" size="small" onClick={() => handleEditAccount(record)}>
          Sua
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
      title: 'Ma lien ket',
      dataIndex: 'maLk',
      key: 'maLk',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Ho ten BN',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'So the BHYT',
      dataIndex: 'insuranceNumber',
      key: 'insuranceNumber',
      width: 155,
    },
    {
      title: 'Ngay vao',
      dataIndex: 'admissionDate',
      key: 'admissionDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Chan doan',
      key: 'diagnosis',
      width: 180,
      ellipsis: true,
      render: (_, r: PortalRecord) => `${r.diagnosisCode} - ${r.diagnosisName}`,
    },
    {
      title: 'BHYT chi tra',
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
      title: 'Ngay gui',
      dataIndex: 'sentDate',
      key: 'sentDate',
      width: 100,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => {
        if (status === 'approved') return <Tag color="green">Da duyet</Tag>;
        if (status === 'rejected') return <Tag color="red">Tu choi</Tag>;
        return <Tag color="blue">Da gui</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record: PortalRecord) => (
        <Tooltip title="Xem ho so PDF">
          <Button type="link" size="small" icon={<FilePdfOutlined />} onClick={() => handleViewRecordPdf(record)} />
        </Tooltip>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Tab 1 content: Danh sach ho so gui giam dinh
  // ---------------------------------------------------------------------------

  const filteredRecords = getFilteredRecords();

  const renderRecordsTab = () => (
    <div>
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Tong ho so"
              value={stats.total}
              prefix={<AuditOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Cho giam dinh"
              value={stats.pending}
              prefix={<FilterOutlined />}
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Da duyet"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="Tu choi"
              value={stats.rejected}
              prefix={<CloseCircleOutlined />}
              styles={{ content: { color: '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={16} md={8}>
          <Card size="small">
            <Statistic
              title="Tong BHYT chi tra"
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
              placeholder="Tim kiem: ma LK, ten BN, so the..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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
              placeholder={['Tu ngay', 'Den ngay']}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Khoa phong"
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
                Chua duyet GD
              </Button>
              <Button
                size="small"
                type={auditStatusFilter === 1 ? 'primary' : 'default'}
                onClick={() => handleFilterByAuditStatus(1)}
                icon={<CheckCircleOutlined />}
              >
                Da duyet GD
              </Button>
              <Button
                size="small"
                type={paymentStatusFilter === 1 ? 'primary' : 'default'}
                onClick={() => handleFilterByPaymentStatus(1)}
              >
                BN da TT
              </Button>
              <Button
                size="small"
                type={paymentStatusFilter === 0 ? 'primary' : 'default'}
                onClick={() => handleFilterByPaymentStatus(0)}
              >
                BN chua TT
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Action buttons */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import Excel tu BHXH
          </Button>
          <Popconfirm
            title={`Duyet ${selectedRowKeys.length} ho so?`}
            description="Ho so se duoc danh dau da duyet giam dinh BHXH"
            onConfirm={handleApproveRecords}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={selectedRowKeys.length === 0}
            >
              Duyet giam dinh ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
          <Button icon={<PrinterOutlined />} onClick={handlePrintList}>
            In danh sach
          </Button>
          <Popconfirm
            title={`Gui ${selectedRowKeys.length} ho so len cong giam dinh?`}
            description="Ho so se duoc gui len cong giam dinh dien tu BHXH tinh"
            onConfirm={handleSendToPortal}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              icon={<SendOutlined />}
              disabled={selectedRowKeys.length === 0}
              style={{ background: selectedRowKeys.length > 0 ? '#722ed1' : undefined, color: selectedRowKeys.length > 0 ? '#fff' : undefined }}
            >
              Gui cong GD BHXH tinh
            </Button>
          </Popconfirm>
          <Button icon={<ReloadOutlined />} onClick={() => { setAuditStatusFilter(undefined); setPaymentStatusFilter(undefined); setDepartmentFilter(undefined); setSearchText(''); setDateRange(null); fetchRecords(); }}>
            Lam moi
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
            showTotal: (total) => `Tong ${total} ho so`,
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
  // Tab 2 content: Cong giam dinh
  // ---------------------------------------------------------------------------

  const renderPortalTab = () => (
    <div>
      {/* Auditor Account Management */}
      <Card
        size="small"
        title={
          <Space>
            <TeamOutlined />
            <span>Quan ly tai khoan giam dinh vien</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<UserOutlined />} onClick={handleCreateAccount}>
            Tao tai khoan
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
          pagination={{ pageSize: 10, showTotal: (total) => `Tong ${total} tai khoan` }}
        />
      </Card>

      <Divider />

      {/* Portal Records */}
      <Card
        size="small"
        title={
          <Space>
            <AuditOutlined />
            <span>Ho so benh an dien tu gui giam dinh</span>
          </Space>
        }
        extra={
          <Space>
            <Search
              placeholder="Tim kiem: ma LK, ten BN, so the..."
              value={portalSearch}
              onChange={(e) => setPortalSearch(e.target.value)}
              onSearch={handlePortalSearch}
              allowClear
              style={{ width: 300 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchPortalRecords}>
              Lam moi
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
            showTotal: (total) => `Tong ${total} ho so`,
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

  return (
    <Spin spinning={false}>
      <Card
        title={
          <Space>
            <AuditOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <span>Giam dinh BHXH</span>
          </Space>
        }
        styles={{ body: { padding: 16 } }}
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
                  {' '}Danh sach ho so giam dinh
                </span>
              ),
              children: renderRecordsTab(),
            },
            {
              key: 'portal',
              label: (
                <span>
                  <CloudUploadOutlined />
                  {' '}Cong giam dinh
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
            <span>Import danh sach ho so tu BHXH</span>
          </Space>
        }
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportPreview(null);
          setFileList([]);
        }}
        size="large"
        footer={
          importPreview ? (
            <Space>
              <Button onClick={() => { setImportPreview(null); setFileList([]); }}>Chon lai file</Button>
              <Button type="primary" onClick={handleConfirmImport} loading={importLoading}>
                Xac nhan import ({importPreview.matchedRows} ho so)
              </Button>
            </Space>
          ) : null
        }
      >
        {!importPreview ? (
          <div>
            <p style={{ marginBottom: 16 }}>
              Chon file Excel (*.xlsx, *.xls) chua danh sach ho so BHXH gui ve de doi chieu va giam dinh.
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
              <p className="ant-upload-text">Keo tha file Excel vao day hoac click de chon file</p>
              <p className="ant-upload-hint">Ho tro dinh dang .xlsx va .xls</p>
            </Upload.Dragger>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleImportExcel}
              loading={importLoading}
              disabled={fileList.length === 0}
              block
            >
              Doc file Excel
            </Button>
          </div>
        ) : (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="Tong dong" value={importPreview.totalRows} styles={{ content: { color: '#1890ff' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Khop ma lien ket" value={importPreview.matchedRows} styles={{ content: { color: '#52c41a' } }} />
              </Col>
              <Col span={8}>
                <Statistic title="Khong khop" value={importPreview.unmatchedRows} styles={{ content: { color: '#ff4d4f' } }} />
              </Col>
            </Row>
            {importPreview.unmatchedRows > 0 && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4 }}>
                Co {importPreview.unmatchedRows} dong khong khop ma lien ket voi du lieu trong he thong. Cac dong nay se bi bo qua.
              </div>
            )}
            <Table
              rowKey="maLk"
              columns={[
                { title: 'STT', key: 'stt', width: 55, render: (_, __, idx) => idx + 1 },
                { title: 'Ma lien ket', dataIndex: 'maLk', width: 130 },
                { title: 'Ho ten BN', dataIndex: 'patientName', width: 160 },
                { title: 'So the BHYT', dataIndex: 'insuranceNumber', width: 155 },
                { title: 'Tong CP', dataIndex: 'totalAmount', width: 120, align: 'right' as const, render: (v: number) => new Intl.NumberFormat('vi-VN').format(v || 0) },
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
        title="Chi tiet ho so giam dinh"
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        size="default"
      >
        {selectedRecord && (
          <div>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Ma lien ket" span={2}>{selectedRecord.maLk}</Descriptions.Item>
              <Descriptions.Item label="Ho ten BN">{selectedRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="Ma BN">{selectedRecord.patientCode}</Descriptions.Item>
              <Descriptions.Item label="So the BHYT" span={2}>{selectedRecord.insuranceNumber}</Descriptions.Item>
              <Descriptions.Item label="Ngay vao">{selectedRecord.admissionDate ? dayjs(selectedRecord.admissionDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngay ra">{selectedRecord.dischargeDate ? dayjs(selectedRecord.dischargeDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Khoa dieu tri" span={2}>{selectedRecord.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Chan doan" span={2}>{selectedRecord.diagnosisCode} - {selectedRecord.diagnosisName}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Chi phi</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Tong chi phi">{formatVND(selectedRecord.totalAmount)}</Descriptions.Item>
              <Descriptions.Item label="BHYT chi tra">{formatVND(selectedRecord.insuranceAmount)}</Descriptions.Item>
              <Descriptions.Item label="BN tu tra" span={2}>{formatVND(selectedRecord.patientAmount)}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Trang thai</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Giam dinh">{getAuditStatusTag(selectedRecord.auditStatus)}</Descriptions.Item>
              <Descriptions.Item label="Thanh toan">{getPaymentStatusTag(selectedRecord.paymentStatus)}</Descriptions.Item>
              <Descriptions.Item label="Gui cong GD">
                {selectedRecord.sentToPortal ? (
                  <Tag color="blue">Da gui ({selectedRecord.sentDate ? dayjs(selectedRecord.sentDate).format('DD/MM/YYYY') : ''})</Tag>
                ) : (
                  <Tag>Chua gui</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ngay duyet">
                {selectedRecord.approvedDate ? dayjs(selectedRecord.approvedDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.rejectReason && (
              <>
                <Divider orientation="left">Ly do tu choi</Divider>
                <div style={{ padding: '8px 12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4 }}>
                  {selectedRecord.rejectReason}
                </div>
              </>
            )}

            {selectedRecord.auditorNote && (
              <>
                <Divider orientation="left">Ghi chu giam dinh vien</Divider>
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
        title={editingAccount ? 'Cap nhat tai khoan giam dinh vien' : 'Tao tai khoan giam dinh vien'}
        open={accountModalOpen}
        onOk={handleSaveAccount}
        onCancel={() => {
          setAccountModalOpen(false);
          accountForm.resetFields();
          setEditingAccount(null);
        }}
        okText={editingAccount ? 'Cap nhat' : 'Tao'}
        cancelText="Huy"
        size="default"
      >
        <Form form={accountForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Ten dang nhap"
                name="username"
                rules={[{ required: true, message: 'Nhap ten dang nhap' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="username" disabled={!!editingAccount} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Ho va ten"
                name="fullName"
                rules={[{ required: true, message: 'Nhap ho va ten' }]}
              >
                <Input placeholder="Nguyen Van A" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Nhap email' },
                  { type: 'email', message: 'Email khong hop le' },
                ]}
              >
                <Input placeholder="email@bhxh.gov.vn" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="So dien thoai" name="phone">
                <Input placeholder="0912345678" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="To chuc"
                name="organization"
                rules={[{ required: true, message: 'Nhap to chuc' }]}
              >
                <Input placeholder="BHXH Tinh / Thanh pho" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Vai tro"
                name="role"
                rules={[{ required: true, message: 'Chon vai tro' }]}
              >
                <Select
                  placeholder="Chon vai tro"
                  options={[
                    { value: 'auditor', label: 'Giam dinh vien' },
                    { value: 'senior_auditor', label: 'GDV Cap cao' },
                    { value: 'admin', label: 'Quan tri' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          {editingAccount && (
            <Form.Item name="isActive" valuePropName="checked">
              <Checkbox>Tai khoan dang hoat dong</Checkbox>
            </Form.Item>
          )}
          {!editingAccount && (
            <Form.Item
              label="Mat khau"
              name="password"
              rules={[
                { required: true, message: 'Nhap mat khau' },
                { min: 6, message: 'Mat khau it nhat 6 ky tu' },
              ]}
            >
              <Input.Password placeholder="Nhap mat khau" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* PDF Viewer Drawer */}
      <Drawer
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>Ho so benh an dien tu</span>
          </Space>
        }
        open={pdfDrawerOpen}
        onClose={() => setPdfDrawerOpen(false)}
        size="large"
      >
        {selectedPortalRecord && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Ma lien ket">{selectedPortalRecord.maLk}</Descriptions.Item>
              <Descriptions.Item label="Ho ten BN">{selectedPortalRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="So the BHYT">{selectedPortalRecord.insuranceNumber}</Descriptions.Item>
              <Descriptions.Item label="CSKCB">{selectedPortalRecord.hospitalName}</Descriptions.Item>
              <Descriptions.Item label="Ngay vao">{selectedPortalRecord.admissionDate ? dayjs(selectedPortalRecord.admissionDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngay ra">{selectedPortalRecord.dischargeDate ? dayjs(selectedPortalRecord.dischargeDate).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Chan doan" span={2}>
                {selectedPortalRecord.diagnosisCode} - {selectedPortalRecord.diagnosisName}
              </Descriptions.Item>
              <Descriptions.Item label="Tong chi phi">{new Intl.NumberFormat('vi-VN').format(selectedPortalRecord.totalAmount)} VND</Descriptions.Item>
              <Descriptions.Item label="BHYT chi tra">{new Intl.NumberFormat('vi-VN').format(selectedPortalRecord.insuranceAmount)} VND</Descriptions.Item>
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
              <p style={{ fontSize: 16, fontWeight: 500 }}>Ho so benh an dien tu</p>
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
                  Tai xuong
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </Spin>
  );
};

export default BhxhAudit;
