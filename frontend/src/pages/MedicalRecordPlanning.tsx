import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, Table, Tabs, Tag, Modal, message, Spin,
  Row, Col, DatePicker, Select, Statistic, Space, Form, InputNumber,
  Badge,
} from 'antd';
import {
  ReloadOutlined, FileTextOutlined, SwapOutlined,
  BookOutlined, CheckCircleOutlined, SolutionOutlined, CopyOutlined,
  ClockCircleOutlined, WarningOutlined, PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import * as api from '../api/medicalRecordPlanning';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordCode {
  id: string;
  recordCode: string;
  examinationId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  doctorName?: string;
  assignedDate?: string;
  assignedByName?: string;
  status: number;
  statusName: string;
  createdAt: string;
}

interface TransferRecord {
  id: string;
  transferNumber?: string;
  patientCode?: string;
  patientName?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromHospital?: string;
  toHospital?: string;
  reason?: string;
  diagnosis?: string;
  transferDate?: string;
  status: number;
  statusName: string;
  approvedByName?: string;
  approvedDate?: string;
}

interface BorrowRecord {
  id: string;
  borrowCode: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  borrowerName?: string;
  borrowerDepartment?: string;
  purpose?: string;
  borrowDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  status: number;
  statusName: string;
  extensionCount: number;
  isOverdue: boolean;
  daysOverdue: number;
}

interface HandoverRecord {
  id: string;
  handoverCode: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  submittedByName?: string;
  submittedDate?: string;
  approvedByName?: string;
  approvedDate?: string;
  status: number;
  statusName: string;
  note?: string;
  totalForms: number;
  completedForms: number;
}

interface OutpatientRecord {
  id: string;
  recordCode?: string;
  patientCode?: string;
  patientName?: string;
  gender?: string;
  dateOfBirth?: string;
  departmentName?: string;
  doctorName?: string;
  diagnosis?: string;
  icdCode?: string;
  examinationDate: string;
  status: number;
  statusName: string;
  conclusionType?: number;
  conclusionNote?: string;
}

interface DepartmentAttendance {
  departmentId: string;
  departmentName: string;
  isCheckedIn: boolean;
  checkInTime?: string;
  checkInByName?: string;
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
}

interface PlanningStats {
  totalRecords: number;
  assignedCodes: number;
  pendingCodes: number;
  totalTransfers: number;
  pendingTransfers: number;
  activeBorrows: number;
  overdueBorrows: number;
  pendingHandovers: number;
  completedHandovers: number;
  todayAttendance: number;
  outpatientRecords: number;
  recordCopyRequests: number;
}

// ---------------------------------------------------------------------------
// Status maps
// ---------------------------------------------------------------------------

const RECORD_CODE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chua cap', color: 'default' },
  1: { label: 'Da cap', color: 'success' },
  2: { label: 'Da huy', color: 'error' },
};

const TRANSFER_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Cho duyet', color: 'processing' },
  1: { label: 'Da duyet', color: 'success' },
  2: { label: 'Tu choi', color: 'error' },
  3: { label: 'Hoan thanh', color: 'default' },
};

const BORROW_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Dang muon', color: 'processing' },
  1: { label: 'Da tra', color: 'success' },
  2: { label: 'Qua han', color: 'error' },
  3: { label: 'Gia han', color: 'warning' },
};

const HANDOVER_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nhap', color: 'default' },
  1: { label: 'Da gui', color: 'processing' },
  2: { label: 'Da duyet', color: 'success' },
  3: { label: 'Tu choi', color: 'error' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MedicalRecordPlanning: React.FC = () => {
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState('record-codes');
  const [stats, setStats] = useState<PlanningStats | null>(null);

  // Tab 1: Record Codes
  const [rcKeyword, setRcKeyword] = useState('');
  const [rcDateRange, setRcDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [rcData, setRcData] = useState<RecordCode[]>([]);
  const [rcTotal, setRcTotal] = useState(0);
  const [rcPage, setRcPage] = useState(1);
  const [rcLoading, setRcLoading] = useState(false);

  // Tab 2: Transfers
  const [trKeyword, setTrKeyword] = useState('');
  const [trDateRange, setTrDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [trData, setTrData] = useState<TransferRecord[]>([]);
  const [trTotal, setTrTotal] = useState(0);
  const [trPage, setTrPage] = useState(1);
  const [trLoading, setTrLoading] = useState(false);

  // Tab 3: Borrowing
  const [brKeyword, setBrKeyword] = useState('');
  const [brStatusFilter, setBrStatusFilter] = useState<number | undefined>(undefined);
  const [brData, setBrData] = useState<BorrowRecord[]>([]);
  const [brTotal, setBrTotal] = useState(0);
  const [brPage, setBrPage] = useState(1);
  const [brLoading, setBrLoading] = useState(false);
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(null);

  // Tab 4: Handover
  const [hoKeyword, setHoKeyword] = useState('');
  const [hoStatusFilter, setHoStatusFilter] = useState<number | undefined>(undefined);
  const [hoData, setHoData] = useState<HandoverRecord[]>([]);
  const [hoTotal, setHoTotal] = useState(0);
  const [hoPage, setHoPage] = useState(1);
  const [hoLoading, setHoLoading] = useState(false);

  // Tab 5: Outpatient
  const [opKeyword, setOpKeyword] = useState('');
  const [opDateRange, setOpDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [opData, setOpData] = useState<OutpatientRecord[]>([]);
  const [opTotal, setOpTotal] = useState(0);
  const [opPage, setOpPage] = useState(1);
  const [opLoading, setOpLoading] = useState(false);

  // Tab 6: Attendance
  const [attData, setAttData] = useState<DepartmentAttendance[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attDate, setAttDate] = useState<Dayjs>(dayjs());
  const [attCheckedIn, setAttCheckedIn] = useState(0);
  const [attTotal, setAttTotal] = useState(0);

  // Forms
  const [borrowForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [extendForm] = Form.useForm();

  // -------------------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------------------

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getPlanningStats();
      setStats(res.data);
    } catch {
      message.warning('Khong the tai thống kê');
    }
  }, []);

  const loadRecordCodes = useCallback(async (page = 1) => {
    setRcLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageIndex: page - 1,
        pageSize: 20,
      };
      if (rcKeyword) params.keyword = rcKeyword;
      if (rcDateRange[0]) params.fromDate = rcDateRange[0].format('YYYY-MM-DD');
      if (rcDateRange[1]) params.toDate = rcDateRange[1].format('YYYY-MM-DD');
      const res = await api.getRecordCodes(params);
      setRcData(res.data.items || []);
      setRcTotal(res.data.totalCount || 0);
      setRcPage(page);
    } catch {
      message.warning('Khong the tai danh sach ma BA');
    } finally {
      setRcLoading(false);
    }
  }, [rcKeyword, rcDateRange]);

  const loadTransfers = useCallback(async (page = 1) => {
    setTrLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageIndex: page - 1,
        pageSize: 20,
      };
      if (trKeyword) params.keyword = trKeyword;
      if (trDateRange[0]) params.fromDate = trDateRange[0].format('YYYY-MM-DD');
      if (trDateRange[1]) params.toDate = trDateRange[1].format('YYYY-MM-DD');
      const res = await api.getTransfers(params);
      setTrData(res.data.items || []);
      setTrTotal(res.data.totalCount || 0);
      setTrPage(page);
    } catch {
      message.warning('Khong the tai danh sach chuyển viện');
    } finally {
      setTrLoading(false);
    }
  }, [trKeyword, trDateRange]);

  const loadBorrowing = useCallback(async (page = 1) => {
    setBrLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageIndex: page - 1,
        pageSize: 20,
      };
      if (brKeyword) params.keyword = brKeyword;
      if (brStatusFilter !== undefined) params.status = brStatusFilter;
      const res = await api.getBorrowing(params);
      setBrData(res.data.items || []);
      setBrTotal(res.data.totalCount || 0);
      setBrPage(page);
    } catch {
      message.warning('Khong the tai danh sach muon tra');
    } finally {
      setBrLoading(false);
    }
  }, [brKeyword, brStatusFilter]);

  const loadHandover = useCallback(async (page = 1) => {
    setHoLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageIndex: page - 1,
        pageSize: 20,
      };
      if (hoKeyword) params.keyword = hoKeyword;
      if (hoStatusFilter !== undefined) params.status = hoStatusFilter;
      const res = await api.getHandover(params);
      setHoData(res.data.items || []);
      setHoTotal(res.data.totalCount || 0);
      setHoPage(page);
    } catch {
      message.warning('Khong the tai danh sach bàn giao');
    } finally {
      setHoLoading(false);
    }
  }, [hoKeyword, hoStatusFilter]);

  const loadOutpatient = useCallback(async (page = 1) => {
    setOpLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageIndex: page - 1,
        pageSize: 20,
      };
      if (opKeyword) params.keyword = opKeyword;
      if (opDateRange[0]) params.fromDate = opDateRange[0].format('YYYY-MM-DD');
      if (opDateRange[1]) params.toDate = opDateRange[1].format('YYYY-MM-DD');
      const res = await api.getOutpatientRecords(params);
      setOpData(res.data.items || []);
      setOpTotal(res.data.totalCount || 0);
      setOpPage(page);
    } catch {
      message.warning('Khong the tai danh sach BA ngoại trú');
    } finally {
      setOpLoading(false);
    }
  }, [opKeyword, opDateRange]);

  const loadAttendance = useCallback(async () => {
    setAttLoading(true);
    try {
      const res = await api.getAttendance({ date: attDate.format('YYYY-MM-DD') });
      setAttData(res.data.departments || []);
      setAttCheckedIn(res.data.checkedInCount || 0);
      setAttTotal(res.data.totalDepartments || 0);
    } catch {
      message.warning('Khong the tai cham cong');
    } finally {
      setAttLoading(false);
    }
  }, [attDate]);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'record-codes') loadRecordCodes();
    else if (activeTab === 'transfers') loadTransfers();
    else if (activeTab === 'borrowing') loadBorrowing();
    else if (activeTab === 'handover') loadHandover();
    else if (activeTab === 'outpatient') loadOutpatient();
    else if (activeTab === 'attendance') loadAttendance();
  }, [activeTab, loadRecordCodes, loadTransfers, loadBorrowing, loadHandover, loadOutpatient, loadAttendance]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleAssignCode = async (record: RecordCode) => {
    if (!record.examinationId) {
      message.warning('Không có luot kham de cap ma');
      return;
    }
    try {
      await api.assignRecordCode({ examinationId: record.examinationId });
      message.success('Cap ma BA thanh cong');
      loadRecordCodes(rcPage);
    } catch {
      message.warning('Khong the cap ma BA');
    }
  };

  const handleApproveTransfer = async (record: TransferRecord, approve: boolean) => {
    try {
      await api.approveTransfer({ transferId: record.id, approve });
      message.success(approve ? 'Duyet chuyển viện thanh cong' : 'Tu choi chuyển viện');
      loadTransfers(trPage);
    } catch {
      message.warning('Khong the thuc hien');
    }
  };

  const handleBorrowSubmit = async () => {
    try {
      const values = await borrowForm.validateFields();
      await api.createBorrow(values);
      message.success('Tao phieu muon thanh cong');
      setBorrowModalOpen(false);
      borrowForm.resetFields();
      loadBorrowing(brPage);
    } catch {
      message.warning('Vui long kiem tra lai form');
    }
  };

  const handleReturnSubmit = async () => {
    if (!selectedBorrow) return;
    try {
      const values = await returnForm.validateFields();
      await api.returnRecord({ borrowId: selectedBorrow.id, note: values.note });
      message.success('Tra ho so thanh cong');
      setReturnModalOpen(false);
      returnForm.resetFields();
      loadBorrowing(brPage);
    } catch {
      message.warning('Khong the tra ho so');
    }
  };

  const handleExtendSubmit = async () => {
    if (!selectedBorrow) return;
    try {
      const values = await extendForm.validateFields();
      await api.extendBorrow({
        borrowId: selectedBorrow.id,
        extendDays: values.extendDays,
        reason: values.reason,
      });
      message.success('Gia han thanh cong');
      setExtendModalOpen(false);
      extendForm.resetFields();
      loadBorrowing(brPage);
    } catch {
      message.warning('Khong the gia han');
    }
  };

  const handleCheckIn = async (dept: DepartmentAttendance) => {
    try {
      await api.checkIn({ departmentId: dept.departmentId });
      message.success(`Cham cong ${dept.departmentName} thanh cong`);
      loadAttendance();
    } catch {
      message.warning('Khong the cham cong');
    }
  };

  const handleApproveHandover = async (record: HandoverRecord, approve: boolean) => {
    try {
      await api.approveHandover({ handoverId: record.id, approve });
      message.success(approve ? 'Duyet bàn giao thanh cong' : 'Tu choi bàn giao');
      loadHandover(hoPage);
    } catch {
      message.warning('Khong the thuc hien');
    }
  };

  // -------------------------------------------------------------------------
  // Table Columns
  // -------------------------------------------------------------------------

  const recordCodeColumns: ColumnsType<RecordCode> = [
    { title: 'Ma BA', dataIndex: 'recordCode', key: 'recordCode', width: 160 },
    { title: 'Ma BN', dataIndex: 'patientCode', key: 'patientCode', width: 120 },
    { title: 'Ho ten', dataIndex: 'patientName', key: 'patientName', width: 180 },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 150 },
    { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName', width: 150 },
    {
      title: 'Ngay cap', dataIndex: 'assignedDate', key: 'assignedDate', width: 120,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => {
        const st = RECORD_CODE_STATUS[s] || RECORD_CODE_STATUS[0];
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    {
      title: 'Thao tac', key: 'action', width: 100,
      render: (_: unknown, record: RecordCode) => (
        <Space orientation="horizontal">
          {record.status === 0 && (
            <Button type="link" size="small" onClick={() => handleAssignCode(record)}>Cap ma</Button>
          )}
        </Space>
      ),
    },
  ];

  const transferColumns: ColumnsType<TransferRecord> = [
    { title: 'So CV', dataIndex: 'transferNumber', key: 'transferNumber', width: 140 },
    { title: 'Ma BN', dataIndex: 'patientCode', key: 'patientCode', width: 120 },
    { title: 'Ho ten', dataIndex: 'patientName', key: 'patientName', width: 180 },
    { title: 'Tu khoa', dataIndex: 'fromDepartment', key: 'fromDepartment', width: 140 },
    { title: 'Den noi', dataIndex: 'toDepartment', key: 'toDepartment', width: 160,
      render: (v: string, r: TransferRecord) => v || r.toHospital || '-',
    },
    { title: 'Chẩn đoán', dataIndex: 'diagnosis', key: 'diagnosis', width: 200, ellipsis: true },
    {
      title: 'Ngay CV', dataIndex: 'transferDate', key: 'transferDate', width: 120,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => {
        const st = TRANSFER_STATUS[s] || TRANSFER_STATUS[0];
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    {
      title: 'Thao tac', key: 'action', width: 140,
      render: (_: unknown, record: TransferRecord) => (
        <Space orientation="horizontal">
          {record.status === 0 && (
            <>
              <Button type="link" size="small" onClick={() => handleApproveTransfer(record, true)}>Duyet</Button>
              <Button type="link" size="small" danger onClick={() => handleApproveTransfer(record, false)}>Tu choi</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const borrowColumns: ColumnsType<BorrowRecord> = [
    { title: 'Ma phieu', dataIndex: 'borrowCode', key: 'borrowCode', width: 160 },
    { title: 'Ma BA', dataIndex: 'recordCode', key: 'recordCode', width: 140 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
    { title: 'Nguoi muon', dataIndex: 'borrowerName', key: 'borrowerName', width: 150 },
    { title: 'Muc dich', dataIndex: 'purpose', key: 'purpose', width: 180, ellipsis: true },
    {
      title: 'Ngay muon', dataIndex: 'borrowDate', key: 'borrowDate', width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Han tra', dataIndex: 'expectedReturnDate', key: 'expectedReturnDate', width: 110,
      render: (v: string, r: BorrowRecord) => {
        if (!v) return '-';
        const d = dayjs(v);
        const overdue = r.status !== 1 && d.isBefore(dayjs());
        return <span style={{ color: overdue ? '#ff4d4f' : undefined }}>{d.format('DD/MM/YYYY')}</span>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => {
        const st = BORROW_STATUS[s] || BORROW_STATUS[0];
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    {
      title: 'Thao tac', key: 'action', width: 180,
      render: (_: unknown, record: BorrowRecord) => (
        <Space orientation="horizontal">
          {(record.status === 0 || record.status === 3) && (
            <Button type="link" size="small" onClick={() => { setSelectedBorrow(record); setReturnModalOpen(true); }}>
              Tra
            </Button>
          )}
          {record.status === 0 && (
            <Button type="link" size="small" onClick={() => { setSelectedBorrow(record); setExtendModalOpen(true); }}>
              Gia han
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handoverColumns: ColumnsType<HandoverRecord> = [
    { title: 'Ma BG', dataIndex: 'handoverCode', key: 'handoverCode', width: 160 },
    { title: 'Ma BA', dataIndex: 'recordCode', key: 'recordCode', width: 140 },
    { title: 'Bệnh nhân', dataIndex: 'patientName', key: 'patientName', width: 160 },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 150 },
    { title: 'Người gửi', dataIndex: 'submittedByName', key: 'submittedByName', width: 140 },
    {
      title: 'Ngày gửi', dataIndex: 'submittedDate', key: 'submittedDate', width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Bieu mau', key: 'forms', width: 100,
      render: (_: unknown, r: HandoverRecord) => `${r.completedForms}/${r.totalForms}`,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 100,
      render: (s: number) => {
        const st = HANDOVER_STATUS[s] || HANDOVER_STATUS[0];
        return <Tag color={st.color}>{st.label}</Tag>;
      },
    },
    {
      title: 'Thao tac', key: 'action', width: 140,
      render: (_: unknown, record: HandoverRecord) => (
        <Space orientation="horizontal">
          {record.status === 1 && (
            <>
              <Button type="link" size="small" onClick={() => handleApproveHandover(record, true)}>Duyet</Button>
              <Button type="link" size="small" danger onClick={() => handleApproveHandover(record, false)}>Tu choi</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const outpatientColumns: ColumnsType<OutpatientRecord> = [
    { title: 'Ma BA', dataIndex: 'recordCode', key: 'recordCode', width: 150 },
    { title: 'Ma BN', dataIndex: 'patientCode', key: 'patientCode', width: 120 },
    { title: 'Ho ten', dataIndex: 'patientName', key: 'patientName', width: 180 },
    { title: 'Gioi tinh', dataIndex: 'gender', key: 'gender', width: 80 },
    { title: 'Khoa', dataIndex: 'departmentName', key: 'departmentName', width: 150 },
    { title: 'Bác sĩ', dataIndex: 'doctorName', key: 'doctorName', width: 150 },
    { title: 'Chẩn đoán', dataIndex: 'diagnosis', key: 'diagnosis', width: 200, ellipsis: true },
    { title: 'Ma ICD', dataIndex: 'icdCode', key: 'icdCode', width: 100 },
    {
      title: 'Ngay kham', dataIndex: 'examinationDate', key: 'examinationDate', width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (_: unknown, r: OutpatientRecord) => <Tag>{r.statusName}</Tag>,
    },
  ];

  const attendanceColumns: ColumnsType<DepartmentAttendance> = [
    { title: 'Khoa/Phong', dataIndex: 'departmentName', key: 'departmentName', width: 200 },
    {
      title: 'Trạng thái', key: 'status', width: 120,
      render: (_: unknown, r: DepartmentAttendance) => (
        r.isCheckedIn
          ? <Tag color="success">Da cham cong</Tag>
          : <Tag color="default">Chua cham cong</Tag>
      ),
    },
    {
      title: 'Thoi gian', dataIndex: 'checkInTime', key: 'checkInTime', width: 120,
      render: (v: string) => v ? dayjs(v).format('HH:mm DD/MM') : '-',
    },
    { title: 'Nguoi cham', dataIndex: 'checkInByName', key: 'checkInByName', width: 150 },
    { title: 'Tong HS', dataIndex: 'totalRecords', key: 'totalRecords', width: 90 },
    { title: 'Hoan thanh', dataIndex: 'completedRecords', key: 'completedRecords', width: 100 },
    { title: 'Cho xu ly', dataIndex: 'pendingRecords', key: 'pendingRecords', width: 100 },
    {
      title: 'Thao tac', key: 'action', width: 120,
      render: (_: unknown, record: DepartmentAttendance) => (
        !record.isCheckedIn && (
          <Button type="link" size="small" onClick={() => handleCheckIn(record)}>Cham cong</Button>
        )
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Tab Content Renderers
  // -------------------------------------------------------------------------

  const renderRecordCodes = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Tim theo ma BA, ma BN, ho ten..."
            value={rcKeyword}
            onChange={(e) => setRcKeyword(e.target.value)}
            onSearch={() => loadRecordCodes(1)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            value={rcDateRange}
            onChange={(dates) => setRcDateRange(dates as [Dayjs | null, Dayjs | null])}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Button icon={<ReloadOutlined />} onClick={() => loadRecordCodes(1)}>Tai lai</Button>
        </Col>
      </Row>
      <Table
        columns={recordCodeColumns}
        dataSource={rcData}
        rowKey="id"
        loading={rcLoading}
        size="small"
        scroll={{ x: 1100 }}
        pagination={{
          current: rcPage,
          total: rcTotal,
          pageSize: 20,
          showTotal: (t) => `Tong ${t} ban ghi`,
          onChange: (p) => loadRecordCodes(p),
        }}
      />
    </div>
  );

  const renderTransfers = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Tim theo ma BN, ho ten..."
            value={trKeyword}
            onChange={(e) => setTrKeyword(e.target.value)}
            onSearch={() => loadTransfers(1)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            value={trDateRange}
            onChange={(dates) => setTrDateRange(dates as [Dayjs | null, Dayjs | null])}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Button icon={<ReloadOutlined />} onClick={() => loadTransfers(1)}>Tai lai</Button>
        </Col>
      </Row>
      <Table
        columns={transferColumns}
        dataSource={trData}
        rowKey="id"
        loading={trLoading}
        size="small"
        scroll={{ x: 1300 }}
        pagination={{
          current: trPage,
          total: trTotal,
          pageSize: 20,
          showTotal: (t) => `Tong ${t} ban ghi`,
          onChange: (p) => loadTransfers(p),
        }}
      />
    </div>
  );

  const renderBorrowing = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <Search
            placeholder="Tim theo ma, ho ten..."
            value={brKeyword}
            onChange={(e) => setBrKeyword(e.target.value)}
            onSearch={() => loadBorrowing(1)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Trạng thái"
            allowClear
            value={brStatusFilter}
            onChange={(v) => setBrStatusFilter(v)}
            options={[
              { value: 0, label: 'Dang muon' },
              { value: 1, label: 'Da tra' },
              { value: 2, label: 'Qua han' },
              { value: 3, label: 'Gia han' },
            ]}
          />
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Space orientation="horizontal">
            <Button icon={<ReloadOutlined />} onClick={() => loadBorrowing(1)}>Tai lai</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBorrowModalOpen(true)}>Tao phieu muon</Button>
          </Space>
        </Col>
      </Row>
      <Table
        columns={borrowColumns}
        dataSource={brData}
        rowKey="id"
        loading={brLoading}
        size="small"
        scroll={{ x: 1300 }}
        pagination={{
          current: brPage,
          total: brTotal,
          pageSize: 20,
          showTotal: (t) => `Tong ${t} ban ghi`,
          onChange: (p) => loadBorrowing(p),
        }}
      />
    </div>
  );

  const renderHandover = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <Search
            placeholder="Tim theo ma, ho ten..."
            value={hoKeyword}
            onChange={(e) => setHoKeyword(e.target.value)}
            onSearch={() => loadHandover(1)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Trạng thái"
            allowClear
            value={hoStatusFilter}
            onChange={(v) => setHoStatusFilter(v)}
            options={[
              { value: 0, label: 'Nhap' },
              { value: 1, label: 'Da gui' },
              { value: 2, label: 'Da duyet' },
              { value: 3, label: 'Tu choi' },
            ]}
          />
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Button icon={<ReloadOutlined />} onClick={() => loadHandover(1)}>Tai lai</Button>
        </Col>
      </Row>
      <Table
        columns={handoverColumns}
        dataSource={hoData}
        rowKey="id"
        loading={hoLoading}
        size="small"
        scroll={{ x: 1200 }}
        pagination={{
          current: hoPage,
          total: hoTotal,
          pageSize: 20,
          showTotal: (t) => `Tong ${t} ban ghi`,
          onChange: (p) => loadHandover(p),
        }}
      />
    </div>
  );

  const renderOutpatient = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Tim theo ma BA, ma BN, ho ten..."
            value={opKeyword}
            onChange={(e) => setOpKeyword(e.target.value)}
            onSearch={() => loadOutpatient(1)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            style={{ width: '100%' }}
            value={opDateRange}
            onChange={(dates) => setOpDateRange(dates as [Dayjs | null, Dayjs | null])}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Button icon={<ReloadOutlined />} onClick={() => loadOutpatient(1)}>Tai lai</Button>
        </Col>
      </Row>
      <Table
        columns={outpatientColumns}
        dataSource={opData}
        rowKey="id"
        loading={opLoading}
        size="small"
        scroll={{ x: 1400 }}
        pagination={{
          current: opPage,
          total: opTotal,
          pageSize: 20,
          showTotal: (t) => `Tong ${t} ban ghi`,
          onChange: (p) => loadOutpatient(p),
        }}
      />
    </div>
  );

  const renderAttendance = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <DatePicker
            style={{ width: '100%' }}
            value={attDate}
            onChange={(d) => d && setAttDate(d)}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Space orientation="horizontal">
            <Button icon={<ReloadOutlined />} onClick={() => loadAttendance()}>Tai lai</Button>
            <Badge count={attTotal - attCheckedIn} offset={[10, 0]}>
              <span>Chua cham cong: {attTotal - attCheckedIn}/{attTotal}</span>
            </Badge>
          </Space>
        </Col>
      </Row>
      <Table
        columns={attendanceColumns}
        dataSource={attData}
        rowKey="departmentId"
        loading={attLoading}
        size="small"
        scroll={{ x: 900 }}
        pagination={false}
      />
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Spin spinning={loading}>
      <div style={{ padding: 16 }}>
        {/* Stats Cards */}
        {stats && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Tong HS"
                  value={stats.totalRecords}
                  prefix={<FileTextOutlined />}
                  styles={{ content: { fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Da cap ma"
                  value={stats.assignedCodes}
                  prefix={<CheckCircleOutlined />}
                  styles={{ content: { color: '#52c41a', fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Chuyển viện"
                  value={stats.totalTransfers}
                  prefix={<SwapOutlined />}
                  styles={{ content: { fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Dang muon"
                  value={stats.activeBorrows}
                  prefix={<BookOutlined />}
                  styles={{ content: { color: '#1890ff', fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Qua han"
                  value={stats.overdueBorrows}
                  prefix={<WarningOutlined />}
                  styles={{ content: { color: '#ff4d4f', fontSize: 20 } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={4}>
              <Card size="small">
                <Statistic
                  title="Bàn giao"
                  value={stats.pendingHandovers}
                  prefix={<ClockCircleOutlined />}
                  styles={{ content: { color: '#faad14', fontSize: 20 } }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Tabs */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'record-codes',
                label: (
                  <span><FileTextOutlined /> Cap ma BA</span>
                ),
                children: renderRecordCodes(),
              },
              {
                key: 'transfers',
                label: (
                  <span><SwapOutlined /> Chuyển viện</span>
                ),
                children: renderTransfers(),
              },
              {
                key: 'borrowing',
                label: (
                  <span><BookOutlined /> Mượn trả BA</span>
                ),
                children: renderBorrowing(),
              },
              {
                key: 'handover',
                label: (
                  <span><SolutionOutlined /> Bàn giao BA</span>
                ),
                children: renderHandover(),
              },
              {
                key: 'outpatient',
                label: (
                  <span><CopyOutlined /> BA Ngoại trú</span>
                ),
                children: renderOutpatient(),
              },
              {
                key: 'attendance',
                label: (
                  <span><ClockCircleOutlined /> Cham cong</span>
                ),
                children: renderAttendance(),
              },
            ]}
          />
        </Card>

        {/* Borrow Modal */}
        <Modal
          title="Tao phieu muon ho so"
          open={borrowModalOpen}
          onOk={handleBorrowSubmit}
          onCancel={() => { setBorrowModalOpen(false); borrowForm.resetFields(); }}
          okText="Tao phieu"
          cancelText="Huy"
          destroyOnHidden
        >
          <Form form={borrowForm} layout="vertical">
            <Form.Item name="medicalRecordId" label="Ma ho so bệnh án" rules={[{ required: true, message: 'Vui long nhap' }]}>
              <Input placeholder="Nhap ma ho so BA" />
            </Form.Item>
            <Form.Item name="purpose" label="Muc dich muon">
              <TextArea rows={2} placeholder="Muc dich muon ho so" />
            </Form.Item>
            <Form.Item name="borrowDays" label="So ngay muon" initialValue={7}>
              <InputNumber min={1} max={90} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Return Modal */}
        <Modal
          title="Tra ho so"
          open={returnModalOpen}
          onOk={handleReturnSubmit}
          onCancel={() => { setReturnModalOpen(false); returnForm.resetFields(); }}
          okText="Xac nhan tra"
          cancelText="Huy"
          destroyOnHidden
        >
          <p>Tra ho so: <strong>{selectedBorrow?.borrowCode}</strong> - {selectedBorrow?.patientName}</p>
          <Form form={returnForm} layout="vertical">
            <Form.Item name="note" label="Ghi chu">
              <TextArea rows={2} placeholder="Ghi chu khi tra" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Extend Modal */}
        <Modal
          title="Gia han muon ho so"
          open={extendModalOpen}
          onOk={handleExtendSubmit}
          onCancel={() => { setExtendModalOpen(false); extendForm.resetFields(); }}
          okText="Gia han"
          cancelText="Huy"
          destroyOnHidden
        >
          <p>Gia han: <strong>{selectedBorrow?.borrowCode}</strong> - {selectedBorrow?.patientName}</p>
          <Form form={extendForm} layout="vertical">
            <Form.Item name="extendDays" label="So ngay gia han" initialValue={7} rules={[{ required: true }]}>
              <InputNumber min={1} max={30} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="reason" label="Ly do gia han" rules={[{ required: true, message: 'Vui long nhap ly do' }]}>
              <TextArea rows={2} placeholder="Ly do can gia han" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default MedicalRecordPlanning;
