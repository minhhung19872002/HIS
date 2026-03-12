import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Input, Button, Table, Tabs, Tree, Space, Tag, Modal, message, Spin,
  Row, Col, DatePicker, Select, Descriptions, Drawer, Badge, Checkbox, Tooltip,
  Result, Statistic, Progress
} from 'antd';
import {
  SearchOutlined, FileTextOutlined, FolderOutlined, PrinterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExportOutlined, ReloadOutlined,
  AuditOutlined, SwapOutlined, EyeOutlined, FileExcelOutlined, FilePdfOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import client from '../api/client';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArchiveExamination {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  gender: number;
  dateOfBirth?: string;
  medicalRecordCode?: string;
  examinationDate: string;
  departmentName?: string;
  roomName?: string;
  doctorName?: string;
  diagnosisCode?: string;
  diagnosisName?: string;
  status: number;
  statusName?: string;
  insuranceNumber?: string;
  conclusionType?: number;
}

interface ArchiveStats {
  totalRecords: number;
  pendingReview: number;
  handedOver: number;
  approved: number;
}

interface MedicalRecordTree {
  medicalRecord?: MedicalRecordNode;
  treatmentSheets: TreeItem[];
  serviceOrders: TreeItem[];
  serviceResults: TreeItem[];
  treatmentOrders: TreeItem[];
  nursingCareSheets: TreeItem[];
  vitalSignsRecords: TreeItem[];
  infusionRecords: TreeItem[];
  bloodTransfusionRecords: TreeItem[];
  costSummary: TreeItem[];
  surgeryRecords: TreeItem[];
  admissionExam: TreeItem[];
}

interface MedicalRecordNode {
  id: string;
  code: string;
  patientName: string;
  diagnosis?: string;
  createdAt?: string;
}

interface TreeItem {
  id: string;
  title: string;
  date?: string;
  status?: number;
  detail?: Record<string, unknown>;
}

interface HandoverRecord {
  id: string;
  medicalRecordCode: string;
  patientCode: string;
  patientName: string;
  departmentName: string;
  dischargeDate?: string;
  handoverStatus: number; // 0=pending, 1=sent, 2=received, 3=approved
  handoverDate?: string;
  approvedDate?: string;
  approvedBy?: string;
  comments?: string;
  totalForms: number;
  completedForms: number;
}

interface HandoverSummary {
  departmentName: string;
  totalPending: number;
  totalSent: number;
  totalReceived: number;
  totalApproved: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDOVER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ bàn giao', color: 'default' },
  1: { label: 'Đã gửi', color: 'processing' },
  2: { label: 'Đã nhận', color: 'warning' },
  3: { label: 'Đã duyệt', color: 'success' },
};

const GENDER_MAP: Record<number, string> = { 0: 'Nam', 1: 'Nữ', 2: 'Khác' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MedicalRecordArchive: React.FC = () => {
  // -- shared
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ArchiveStats>({
    totalRecords: 0, pendingReview: 0, handedOver: 0, approved: 0,
  });
  const [activeTab, setActiveTab] = useState('summary');

  // -- Tab 1: Summary
  const [summaryKeyword, setSummaryKeyword] = useState('');
  const [summaryExams, setSummaryExams] = useState<ArchiveExamination[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(20);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [selectedExam, setSelectedExam] = useState<ArchiveExamination | null>(null);
  const [recordTree, setRecordTree] = useState<DataNode[]>([]);
  const [recordTreeRaw, setRecordTreeRaw] = useState<MedicalRecordTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('');
  const [detailContent, setDetailContent] = useState<Record<string, unknown> | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');

  // -- Tab 2: Review
  const [reviewKeyword, setReviewKeyword] = useState('');
  const [reviewExam, setReviewExam] = useState<ArchiveExamination | null>(null);
  const [reviewTree, setReviewTree] = useState<DataNode[]>([]);
  const [reviewTreeRaw, setReviewTreeRaw] = useState<MedicalRecordTree | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // -- Tab 3: Handover
  const [handoverKeyword, setHandoverKeyword] = useState('');
  const [handoverDateRange, setHandoverDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);
  const [handoverStatusFilter, setHandoverStatusFilter] = useState<number | undefined>(undefined);
  const [handoverRecords, setHandoverRecords] = useState<HandoverRecord[]>([]);
  const [handoverTotal, setHandoverTotal] = useState(0);
  const [handoverPage, setHandoverPage] = useState(1);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [selectedHandoverKeys, setSelectedHandoverKeys] = useState<React.Key[]>([]);
  const [handoverSummary, setHandoverSummary] = useState<HandoverSummary | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveComments, setApproveComments] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<HandoverRecord | null>(null);
  const [previewTree, setPreviewTree] = useState<DataNode[]>([]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const buildTreeData = (data: MedicalRecordTree): DataNode[] => {
    const nodes: DataNode[] = [];

    if (data.medicalRecord) {
      nodes.push({
        key: `record-${data.medicalRecord.id}`,
        title: `Bệnh án - ${data.medicalRecord.code || 'N/A'}`,
        icon: <FileTextOutlined />,
        isLeaf: true,
      });
    }

    const addGroup = (
      key: string, title: string, items: TreeItem[], icon: React.ReactNode
    ) => {
      if (items.length > 0) {
        nodes.push({
          key,
          title: `${title} (${items.length})`,
          icon,
          children: items.map((item, idx) => ({
            key: `${key}-${item.id || idx}`,
            title: item.title + (item.date ? ` - ${dayjs(item.date).format('DD/MM/YYYY')}` : ''),
            isLeaf: true,
          })),
        });
      }
    };

    addGroup('treatment-sheets', 'Tờ điều trị', data.treatmentSheets, <FileTextOutlined />);
    addGroup('service-orders', 'Phiếu chỉ định CLS', data.serviceOrders, <FolderOutlined />);
    addGroup('service-results', 'Kết quả CLS', data.serviceResults, <CheckCircleOutlined />);
    addGroup('treatment-orders', 'Y lệnh điều trị', data.treatmentOrders, <AuditOutlined />);
    addGroup('nursing-care', 'Phiếu chăm sóc', data.nursingCareSheets, <FileTextOutlined />);
    addGroup('vital-signs', 'Phiếu theo dõi chức năng sống', data.vitalSignsRecords, <FileTextOutlined />);
    addGroup('infusion', 'Phiếu truyền dịch', data.infusionRecords, <FileTextOutlined />);
    addGroup('blood-transfusion', 'Phiếu theo dõi truyền máu', data.bloodTransfusionRecords, <FileTextOutlined />);
    addGroup('cost-summary', 'Bảng kê chi phí', data.costSummary, <FileExcelOutlined />);
    addGroup('surgery', 'Phiếu phẫu thuật thủ thuật', data.surgeryRecords, <FileTextOutlined />);
    addGroup('admission-exam', 'Phiếu khám bệnh vào viện', data.admissionExam, <FileTextOutlined />);

    return nodes;
  };

  const findTreeItemDetail = (
    nodeKey: string,
    data: MedicalRecordTree
  ): { detail: Record<string, unknown> | null; title: string } => {
    // Determine group and item index from key
    const groups: Record<string, { items: TreeItem[]; title: string }> = {
      'treatment-sheets': { items: data.treatmentSheets, title: 'Tờ điều trị' },
      'service-orders': { items: data.serviceOrders, title: 'Phiếu chỉ định CLS' },
      'service-results': { items: data.serviceResults, title: 'Kết quả CLS' },
      'treatment-orders': { items: data.treatmentOrders, title: 'Y lệnh điều trị' },
      'nursing-care': { items: data.nursingCareSheets, title: 'Phiếu chăm sóc' },
      'vital-signs': { items: data.vitalSignsRecords, title: 'Phiếu theo dõi chức năng sống' },
      'infusion': { items: data.infusionRecords, title: 'Phiếu truyền dịch' },
      'blood-transfusion': { items: data.bloodTransfusionRecords, title: 'Phiếu theo dõi truyền máu' },
      'cost-summary': { items: data.costSummary, title: 'Bảng kê chi phí' },
      'surgery': { items: data.surgeryRecords, title: 'Phiếu phẫu thuật thủ thuật' },
      'admission-exam': { items: data.admissionExam, title: 'Phiếu khám bệnh vào viện' },
    };

    if (nodeKey.startsWith('record-')) {
      return {
        detail: (data.medicalRecord as unknown as Record<string, unknown>) || null,
        title: 'Bệnh án',
      };
    }

    for (const [groupKey, group] of Object.entries(groups)) {
      if (nodeKey.startsWith(`${groupKey}-`)) {
        const itemId = nodeKey.replace(`${groupKey}-`, '');
        const item = group.items.find((i) => i.id === itemId);
        if (item) {
          return { detail: item.detail || (item as unknown as Record<string, unknown>), title: group.title };
        }
        // Fallback by index
        const idx = parseInt(itemId, 10);
        if (!isNaN(idx) && group.items[idx]) {
          const fallback = group.items[idx];
          return {
            detail: fallback.detail || (fallback as unknown as Record<string, unknown>),
            title: group.title,
          };
        }
      }
    }

    return { detail: null, title: '' };
  };

  // -------------------------------------------------------------------------
  // API helpers
  // -------------------------------------------------------------------------

  const fetchStats = useCallback(async () => {
    try {
      const res = await client.get('/inpatient/medical-record-archive/summary');
      const d = res.data;
      setStats({
        totalRecords: d.totalRecords ?? d.totalPending ?? 0,
        pendingReview: d.pendingReview ?? d.totalPending ?? 0,
        handedOver: d.handedOver ?? d.totalSent ?? 0,
        approved: d.approved ?? d.totalApproved ?? 0,
      });
    } catch {
      // summary may not be implemented yet - use fallback zeros
      setStats({ totalRecords: 0, pendingReview: 0, handedOver: 0, approved: 0 });
    }
  }, []);

  // -- Tab 1 search
  const searchSummaryExams = useCallback(async (page = 1, size = 20) => {
    setSummaryLoading(true);
    try {
      const res = await client.post('/examination/search', {
        keyword: summaryKeyword || '',
        status: '',
        pageIndex: page,
        pageSize: size,
      });
      const data = res.data;
      setSummaryExams(data.items || []);
      setSummaryTotal(data.totalCount || 0);
      setSummaryPage(page);
      setSummaryPageSize(size);
    } catch {
      message.warning('Không thể tải danh sách hồ sơ');
      setSummaryExams([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryKeyword]);

  const loadRecordTree = useCallback(async (examId: string) => {
    setTreeLoading(true);
    try {
      const res = await client.get(`/examination/${examId}/medical-record-full`);
      const rawData = res.data;

      // Map API response into our tree structure
      const tree: MedicalRecordTree = {
        medicalRecord: rawData.id ? {
          id: rawData.id,
          code: rawData.medicalRecordCode || '',
          patientName: rawData.patient?.fullName || '',
          diagnosis: rawData.diagnoses?.[0]?.icdName || rawData.diagnoses?.[0]?.diagnosisName || '',
          createdAt: rawData.patient?.dateOfBirth,
        } : undefined,
        treatmentSheets: (rawData.treatmentSheets || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Tờ điều trị ngày ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : 'N/A'}`,
          date: s.treatmentDate as string,
          detail: s,
        })),
        serviceOrders: (rawData.serviceOrders || []).map((o: Record<string, unknown>) => ({
          id: o.id as string,
          title: (o.serviceName as string) || (o.testName as string) || `Chỉ định #${o.id}`,
          date: o.orderDate as string || o.createdAt as string,
          status: o.status as number,
          detail: o,
        })),
        serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: (r.testName as string) || (r.serviceName as string) || `Kết quả #${r.id}`,
          date: r.resultDate as string || r.completedAt as string,
          detail: r,
        })),
        treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: `Đơn thuốc ${p.prescriptionDate ? dayjs(p.prescriptionDate as string).format('DD/MM/YYYY') : ''}`,
          date: p.prescriptionDate as string || p.createdAt as string,
          detail: p,
        })),
        nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
          id: n.id as string,
          title: `Chăm sóc ${n.date ? dayjs(n.date as string).format('DD/MM/YYYY') : ''} ${n.shift || ''}`,
          date: n.date as string,
          detail: n,
        })),
        vitalSignsRecords: rawData.vitalSigns ? [{
          id: 'vs-1',
          title: `Sinh hiệu ${rawData.vitalSigns.measuredAt ? dayjs(rawData.vitalSigns.measuredAt).format('DD/MM/YYYY HH:mm') : ''}`,
          date: rawData.vitalSigns.measuredAt,
          detail: rawData.vitalSigns,
        }] : [],
        infusionRecords: (rawData.infusionRecords || []).map((inf: Record<string, unknown>) => ({
          id: inf.id as string,
          title: `Truyền dịch ${inf.startTime ? dayjs(inf.startTime as string).format('DD/MM/YYYY HH:mm') : ''}`,
          date: inf.startTime as string,
          detail: inf,
        })),
        bloodTransfusionRecords: (rawData.bloodTransfusionRecords || []).map((bt: Record<string, unknown>) => ({
          id: bt.id as string,
          title: `Truyền máu ${bt.transfusionDate ? dayjs(bt.transfusionDate as string).format('DD/MM/YYYY') : ''}`,
          date: bt.transfusionDate as string,
          detail: bt,
        })),
        costSummary: rawData.costSummary ? [{
          id: 'cost-1',
          title: 'Bảng kê chi phí khám chữa bệnh',
          detail: rawData.costSummary,
        }] : [],
        surgeryRecords: (rawData.surgeryRecords || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Phẫu thuật ${s.surgeryName || ''} ${s.surgeryDate ? dayjs(s.surgeryDate as string).format('DD/MM/YYYY') : ''}`,
          date: s.surgeryDate as string,
          detail: s,
        })),
        admissionExam: rawData.admissionExam ? [{
          id: 'adm-1',
          title: 'Phiếu khám bệnh vào viện',
          date: rawData.admissionExam.examDate,
          detail: rawData.admissionExam,
        }] : [],
      };

      setRecordTreeRaw(tree);
      setRecordTree(buildTreeData(tree));
    } catch {
      message.warning('Không thể tải hồ sơ bệnh án');
      setRecordTree([]);
      setRecordTreeRaw(null);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  // -- Tab 2 search single record
  const searchReviewRecord = useCallback(async () => {
    if (!reviewKeyword.trim()) {
      message.warning('Vui lòng nhập mã khám chữa bệnh');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await client.post('/examination/search', {
        keyword: reviewKeyword.trim(),
        status: '',
        pageIndex: 1,
        pageSize: 1,
      });
      const items = res.data.items || [];
      if (items.length === 0) {
        message.warning('Không tìm thấy hồ sơ bệnh án');
        setReviewExam(null);
        setReviewTree([]);
        setReviewTreeRaw(null);
        return;
      }
      const exam = items[0];
      setReviewExam(exam);

      // Load full record for tree
      const fullRes = await client.get(`/examination/${exam.id}/medical-record-full`);
      const rawData = fullRes.data;

      const tree: MedicalRecordTree = {
        medicalRecord: rawData.id ? {
          id: rawData.id,
          code: rawData.medicalRecordCode || '',
          patientName: rawData.patient?.fullName || '',
          diagnosis: rawData.diagnoses?.[0]?.icdName || '',
          createdAt: rawData.patient?.dateOfBirth,
        } : undefined,
        treatmentSheets: (rawData.treatmentSheets || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Tờ điều trị ngày ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : 'N/A'}`,
          date: s.treatmentDate as string,
          detail: s,
        })),
        serviceOrders: (rawData.serviceOrders || []).map((o: Record<string, unknown>) => ({
          id: o.id as string,
          title: (o.serviceName as string) || `Chỉ định #${o.id}`,
          date: o.orderDate as string,
          detail: o,
        })),
        serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: (r.testName as string) || `Kết quả #${r.id}`,
          date: r.resultDate as string,
          detail: r,
        })),
        treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: `Đơn thuốc ${p.prescriptionDate ? dayjs(p.prescriptionDate as string).format('DD/MM/YYYY') : ''}`,
          date: p.prescriptionDate as string,
          detail: p,
        })),
        nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
          id: n.id as string,
          title: `Chăm sóc ${n.date ? dayjs(n.date as string).format('DD/MM/YYYY') : ''}`,
          date: n.date as string,
          detail: n,
        })),
        vitalSignsRecords: rawData.vitalSigns ? [{
          id: 'vs-1',
          title: `Sinh hiệu ${rawData.vitalSigns.measuredAt ? dayjs(rawData.vitalSigns.measuredAt).format('DD/MM/YYYY HH:mm') : ''}`,
          date: rawData.vitalSigns.measuredAt,
          detail: rawData.vitalSigns,
        }] : [],
        infusionRecords: (rawData.infusionRecords || []).map((inf: Record<string, unknown>) => ({
          id: inf.id as string,
          title: `Truyền dịch ${inf.startTime ? dayjs(inf.startTime as string).format('DD/MM/YYYY HH:mm') : ''}`,
          date: inf.startTime as string,
          detail: inf,
        })),
        bloodTransfusionRecords: (rawData.bloodTransfusionRecords || []).map((bt: Record<string, unknown>) => ({
          id: bt.id as string,
          title: `Truyền máu ${bt.transfusionDate ? dayjs(bt.transfusionDate as string).format('DD/MM/YYYY') : ''}`,
          date: bt.transfusionDate as string,
          detail: bt,
        })),
        costSummary: rawData.costSummary ? [{
          id: 'cost-1',
          title: 'Bảng kê chi phí khám chữa bệnh',
          detail: rawData.costSummary,
        }] : [],
        surgeryRecords: (rawData.surgeryRecords || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Phẫu thuật ${s.surgeryName || ''}`,
          date: s.surgeryDate as string,
          detail: s,
        })),
        admissionExam: rawData.admissionExam ? [{
          id: 'adm-1',
          title: 'Phiếu khám bệnh vào viện',
          detail: rawData.admissionExam,
        }] : [],
      };

      setReviewTreeRaw(tree);
      setReviewTree(buildTreeData(tree));
    } catch {
      message.warning('Không thể tìm hồ sơ bệnh án');
      setReviewExam(null);
      setReviewTree([]);
      setReviewTreeRaw(null);
    } finally {
      setReviewLoading(false);
    }
  }, [reviewKeyword]);

  // -- Tab 3 handover list
  const fetchHandoverList = useCallback(async (page = 1) => {
    setHandoverLoading(true);
    try {
      const params: Record<string, unknown> = {
        keyword: handoverKeyword || '',
        pageIndex: page,
        pageSize: 20,
      };
      if (handoverStatusFilter !== undefined) {
        params.status = handoverStatusFilter;
      }
      if (handoverDateRange[0]) {
        params.fromDate = handoverDateRange[0].format('YYYY-MM-DD');
      }
      if (handoverDateRange[1]) {
        params.toDate = handoverDateRange[1].format('YYYY-MM-DD');
      }
      const res = await client.get('/inpatient/medical-record-archive/list', { params });
      const data = res.data;
      setHandoverRecords(data.items || data || []);
      setHandoverTotal(data.totalCount || (Array.isArray(data) ? data.length : 0));
      setHandoverPage(page);
    } catch {
      message.warning('Không thể tải danh sách bàn giao');
      setHandoverRecords([]);
    } finally {
      setHandoverLoading(false);
    }
  }, [handoverKeyword, handoverStatusFilter, handoverDateRange]);

  const fetchHandoverSummary = useCallback(async () => {
    try {
      const res = await client.get('/inpatient/medical-record-archive/summary');
      setHandoverSummary(res.data);
    } catch {
      // summary endpoint may not exist yet
      setHandoverSummary(null);
    }
  }, []);

  const handleHandover = useCallback(async () => {
    if (selectedHandoverKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần bàn giao');
      return;
    }
    try {
      await client.post('/inpatient/medical-record-archive/handover', {
        recordIds: selectedHandoverKeys,
      });
      message.success(`Đã bàn giao ${selectedHandoverKeys.length} hồ sơ`);
      setSelectedHandoverKeys([]);
      fetchHandoverList(handoverPage);
      fetchStats();
    } catch {
      message.warning('Không thể bàn giao hồ sơ');
    }
  }, [selectedHandoverKeys, fetchHandoverList, handoverPage, fetchStats]);

  const handleApprove = useCallback(async () => {
    if (selectedHandoverKeys.length === 0) {
      message.warning('Vui lòng chọn hồ sơ cần duyệt');
      return;
    }
    setApproveLoading(true);
    try {
      await client.post('/inpatient/medical-record-archive/approve', {
        recordIds: selectedHandoverKeys,
        comments: approveComments,
      });
      message.success(`Đã duyệt ${selectedHandoverKeys.length} hồ sơ`);
      setSelectedHandoverKeys([]);
      setApproveModalOpen(false);
      setApproveComments('');
      fetchHandoverList(handoverPage);
      fetchStats();
    } catch {
      message.warning('Không thể duyệt hồ sơ');
    } finally {
      setApproveLoading(false);
    }
  }, [selectedHandoverKeys, approveComments, fetchHandoverList, handoverPage, fetchStats]);

  const handleExportPdf = useCallback(async (examId: string) => {
    try {
      const res = await client.get(`/examination/${examId}/medical-record-full`);
      const data = res.data;

      // Open print window with full medical record
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        message.warning('Trình duyệt chặn popup, vui lòng cho phép popup');
        return;
      }

      const patientInfo = data.patient || {};
      const diagnoses = data.diagnoses || [];
      const vitalSigns = data.vitalSigns || {};
      const interview = data.interview || {};

      printWindow.document.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Hồ sơ bệnh án - ${patientInfo.fullName || ''}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }
          h1 { text-align: center; font-size: 16px; }
          h2 { font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 4px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          td, th { border: 1px solid #999; padding: 4px 8px; text-align: left; font-size: 12px; }
          th { background: #f5f5f5; }
          .section { margin-bottom: 16px; }
          .field { margin: 4px 0; }
          .label { font-weight: bold; display: inline-block; min-width: 140px; }
          @media print { body { margin: 10mm; } }
        </style>
      </head><body>
        <h1>HỒ SƠ BỆNH ÁN</h1>
        <h2>Thông tin bệnh nhân</h2>
        <div class="section">
          <div class="field"><span class="label">Họ tên:</span> ${patientInfo.fullName || ''}</div>
          <div class="field"><span class="label">Mã bệnh nhân:</span> ${patientInfo.patientCode || ''}</div>
          <div class="field"><span class="label">Giới tính:</span> ${GENDER_MAP[patientInfo.gender] || ''}</div>
          <div class="field"><span class="label">Ngày sinh:</span> ${patientInfo.dateOfBirth ? dayjs(patientInfo.dateOfBirth).format('DD/MM/YYYY') : ''}</div>
          <div class="field"><span class="label">Địa chỉ:</span> ${patientInfo.address || ''}</div>
          <div class="field"><span class="label">SĐT:</span> ${patientInfo.phoneNumber || ''}</div>
        </div>
        <h2>Chẩn đoán</h2>
        <div class="section">
          ${diagnoses.map((d: Record<string, unknown>) => `<div class="field">${d.icdCode || ''} - ${d.icdName || d.diagnosisName || ''}</div>`).join('')}
        </div>
        <h2>Sinh hiệu</h2>
        <div class="section">
          <div class="field"><span class="label">Huyết áp:</span> ${vitalSigns.systolicBP || '-'}/${vitalSigns.diastolicBP || '-'} mmHg</div>
          <div class="field"><span class="label">Mạch:</span> ${vitalSigns.pulse || '-'} l/p</div>
          <div class="field"><span class="label">Nhiệt độ:</span> ${vitalSigns.temperature || '-'} C</div>
          <div class="field"><span class="label">Cân nặng:</span> ${vitalSigns.weight || '-'} kg</div>
          <div class="field"><span class="label">Chiều cao:</span> ${vitalSigns.height || '-'} cm</div>
          <div class="field"><span class="label">SpO2:</span> ${vitalSigns.spO2 || '-'} %</div>
        </div>
        <h2>Bệnh sử</h2>
        <div class="section">
          <div class="field"><span class="label">Lý do khám:</span> ${interview.chiefComplaint || ''}</div>
          <div class="field"><span class="label">Bệnh sử:</span> ${interview.historyOfPresentIllness || ''}</div>
          <div class="field"><span class="label">Tiền sử bản thân:</span> ${interview.pastMedicalHistory || ''}</div>
          <div class="field"><span class="label">Tiền sử gia đình:</span> ${interview.familyHistory || ''}</div>
        </div>
        <script>window.print();</script>
      </body></html>`);
      printWindow.document.close();
    } catch {
      message.warning('Không thể xuất PDF hồ sơ bệnh án');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'summary') {
      searchSummaryExams(1, summaryPageSize);
    } else if (activeTab === 'handover') {
      fetchHandoverList(1);
      fetchHandoverSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------

  const summaryColumns: ColumnsType<ArchiveExamination> = [
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Ngày khám',
      dataIndex: 'examinationDate',
      key: 'examinationDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 130,
      render: (v: string, r: ArchiveExamination) => r.departmentName || v || '-',
    },
    {
      title: 'Chẩn đoán',
      dataIndex: 'diagnosisName',
      key: 'diagnosisName',
      ellipsis: true,
      render: (v: string, r: ArchiveExamination) => (
        <Tooltip title={`${r.diagnosisCode || ''} ${v || ''}`}>
          {r.diagnosisCode ? `${r.diagnosisCode} - ` : ''}{v || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: number, r: ArchiveExamination) => {
        const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'warning', 3: 'orange', 4: 'success' };
        const names: Record<number, string> = { 0: 'Chờ khám', 1: 'Đang khám', 2: 'Chờ CLS', 3: 'Chờ kết luận', 4: 'Hoàn thành' };
        return <Tag color={colors[v] || 'default'}>{r.statusName || names[v] || `Status ${v}`}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ArchiveExamination) => (
        <Space>
          <Tooltip title="Xem hồ sơ">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedExam(record);
                loadRecordTree(record.id);
              }}
            />
          </Tooltip>
          <Tooltip title="Xuất PDF">
            <Button
              type="link"
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => handleExportPdf(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handoverColumns: ColumnsType<HandoverRecord> = [
    {
      title: 'Mã HSBA',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Mã BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Họ tên',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Khoa',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 130,
    },
    {
      title: 'Ngày ra viện',
      dataIndex: 'dischargeDate',
      key: 'dischargeDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'handoverStatus',
      key: 'handoverStatus',
      width: 120,
      render: (v: number) => {
        const info = HANDOVER_STATUS_MAP[v] || HANDOVER_STATUS_MAP[0];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Hoàn thành',
      key: 'completeness',
      width: 100,
      render: (_: unknown, record: HandoverRecord) => {
        const pct = record.totalForms > 0
          ? Math.round((record.completedForms / record.totalForms) * 100)
          : 0;
        return <Progress percent={pct} size="small" />;
      },
    },
    {
      title: 'Ngày bàn giao',
      dataIndex: 'handoverDate',
      key: 'handoverDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'comments',
      key: 'comments',
      ellipsis: true,
      width: 150,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: HandoverRecord) => (
        <Space>
          <Tooltip title="Xem trước">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={async () => {
                setPreviewRecord(record);
                try {
                  // Try loading the record tree for preview
                  const searchRes = await client.post('/examination/search', {
                    keyword: record.medicalRecordCode || record.patientCode || '',
                    status: '',
                    pageIndex: 1,
                    pageSize: 1,
                  });
                  const items = searchRes.data.items || [];
                  if (items.length > 0) {
                    const fullRes = await client.get(`/examination/${items[0].id}/medical-record-full`);
                    const rawData = fullRes.data;
                    const tree: MedicalRecordTree = {
                      medicalRecord: rawData.id ? {
                        id: rawData.id,
                        code: rawData.medicalRecordCode || '',
                        patientName: rawData.patient?.fullName || '',
                        diagnosis: rawData.diagnoses?.[0]?.icdName || '',
                      } : undefined,
                      treatmentSheets: (rawData.treatmentSheets || []).map((s: Record<string, unknown>) => ({
                        id: s.id as string,
                        title: `To dieu tri ngay ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : ''}`,
                        date: s.treatmentDate as string,
                        detail: s,
                      })),
                      serviceOrders: (rawData.serviceOrders || []).map((o: Record<string, unknown>) => ({
                        id: o.id as string,
                        title: (o.serviceName as string) || `Chỉ định #${o.id}`,
                        detail: o,
                      })),
                      serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
                        id: r.id as string,
                        title: (r.testName as string) || `Kết quả #${r.id}`,
                        detail: r,
                      })),
                      treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
                        id: p.id as string,
                        title: `Đơn thuốc`,
                        detail: p,
                      })),
                      nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
                        id: n.id as string,
                        title: `Chăm sóc`,
                        detail: n,
                      })),
                      vitalSignsRecords: rawData.vitalSigns ? [{
                        id: 'vs-1',
                        title: 'Sinh hiệu',
                        detail: rawData.vitalSigns,
                      }] : [],
                      infusionRecords: [],
                      bloodTransfusionRecords: [],
                      costSummary: [],
                      surgeryRecords: [],
                      admissionExam: [],
                    };
                    setPreviewTree(buildTreeData(tree));
                  }
                } catch {
                  // Preview may not be available
                }
                setPreviewDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Xuất PDF">
            <Button
              type="link"
              size="small"
              icon={<FilePdfOutlined />}
              onClick={() => {
                // Use patient code to find exam and export
                const searchAndExport = async () => {
                  try {
                    const searchRes = await client.post('/examination/search', {
                      keyword: record.medicalRecordCode || record.patientCode || '',
                      status: '',
                      pageIndex: 1,
                      pageSize: 1,
                    });
                    const items = searchRes.data.items || [];
                    if (items.length > 0) {
                      handleExportPdf(items[0].id);
                    } else {
                      message.warning('Không tìm thấy hồ sơ');
                    }
                  } catch {
                    message.warning('Không thể xuất PDF');
                  }
                };
                searchAndExport();
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Tree node click handler
  // -------------------------------------------------------------------------

  const handleTreeSelect = useCallback((
    selectedKeys: React.Key[],
    rawData: MedicalRecordTree | null,
  ) => {
    if (selectedKeys.length === 0 || !rawData) return;
    const key = selectedKeys[0] as string;
    setSelectedNodeKey(key);

    const { detail, title } = findTreeItemDetail(key, rawData);
    if (detail) {
      setDetailContent(detail);
      setDetailTitle(title);
      setDetailDrawerOpen(true);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderDetailContent = () => {
    if (!detailContent) {
      return <Result status="info" title="Không có dữ liệu chi tiết" />;
    }

    const entries = Object.entries(detailContent).filter(
      ([k]) => !['id', 'detail'].includes(k) && typeof detailContent[k] !== 'object'
    );
    const objectEntries = Object.entries(detailContent).filter(
      ([k]) => typeof detailContent[k] === 'object' && detailContent[k] !== null && !Array.isArray(detailContent[k])
    );
    const arrayEntries = Object.entries(detailContent).filter(
      ([k]) => Array.isArray(detailContent[k])
    );

    return (
      <div>
        {entries.length > 0 && (
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            {entries.map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {String(value ?? '-')}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        {objectEntries.map(([key, value]) => (
          <Card key={key} size="small" title={key} style={{ marginBottom: 8 }}>
            <Descriptions bordered column={1} size="small">
              {Object.entries(value as Record<string, unknown>)
                .filter(([, v]) => typeof v !== 'object')
                .map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}>
                    {String(v ?? '-')}
                  </Descriptions.Item>
                ))}
            </Descriptions>
          </Card>
        ))}
        {arrayEntries.map(([key, value]) => {
          const arr = value as Record<string, unknown>[];
          if (arr.length === 0) return null;
          const cols = Object.keys(arr[0]).filter(k => typeof arr[0][k] !== 'object');
          return (
            <Card key={key} size="small" title={`${key} (${arr.length})`} style={{ marginBottom: 8 }}>
              <Table
                dataSource={arr.map((item, i) => ({ ...item, _key: i }))}
                rowKey="_key"
                size="small"
                pagination={false}
                columns={cols.map(c => ({
                  title: c,
                  dataIndex: c,
                  key: c,
                  render: (v: unknown) => String(v ?? '-'),
                }))}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          );
        })}
      </div>
    );
  };

  const renderPatientInfo = (exam: ArchiveExamination | null) => {
    if (!exam) return null;
    return (
      <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã bệnh nhân">{exam.patientCode}</Descriptions.Item>
        <Descriptions.Item label="Họ tên">{exam.patientName}</Descriptions.Item>
        <Descriptions.Item label="Giới tính">{GENDER_MAP[exam.gender] || '-'}</Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">
          {exam.dateOfBirth ? dayjs(exam.dateOfBirth).format('DD/MM/YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày khám">
          {exam.examinationDate ? dayjs(exam.examinationDate).format('DD/MM/YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Khoa/Phòng">
          {exam.departmentName || exam.roomName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Bác sĩ">{exam.doctorName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Chẩn đoán" span={2}>
          {exam.diagnosisCode ? `${exam.diagnosisCode} - ` : ''}{exam.diagnosisName || '-'}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  // -------------------------------------------------------------------------
  // Tab content
  // -------------------------------------------------------------------------

  const renderSummaryTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="Tìm theo tên, mã bệnh nhân, mã hồ sơ..."
            allowClear
            enterButton={<><SearchOutlined /> Tìm kiếm</>}
            value={summaryKeyword}
            onChange={(e) => setSummaryKeyword(e.target.value)}
            onSearch={() => searchSummaryExams(1, summaryPageSize)}
            style={{ maxWidth: 500 }}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => searchSummaryExams(summaryPage, summaryPageSize)}>
            Làm mới
          </Button>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Left: search results */}
        <Col xs={24} lg={selectedExam ? 10 : 24}>
          <Table
            dataSource={summaryExams}
            columns={summaryColumns}
            rowKey="id"
            loading={summaryLoading}
            size="small"
            pagination={{
              current: summaryPage,
              pageSize: summaryPageSize,
              total: summaryTotal,
              showSizeChanger: true,
              showTotal: (total) => `Tổng: ${total} hồ sơ`,
              onChange: (page, size) => searchSummaryExams(page, size),
            }}
            onRow={(record) => ({
              onClick: () => {
                setSelectedExam(record);
                loadRecordTree(record.id);
              },
              style: { cursor: 'pointer' },
            })}
            rowClassName={(record) => record.id === selectedExam?.id ? 'ant-table-row-selected' : ''}
            scroll={{ x: 900 }}
          />
        </Col>

        {/* Right: record tree view */}
        {selectedExam && (
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <FolderOutlined />
                  <span>Hồ sơ bệnh án: {selectedExam.patientName}</span>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => handleExportPdf(selectedExam.id)}
                  >
                    Xuất PDF
                  </Button>
                  <Button
                    type="text"
                    onClick={() => {
                      setSelectedExam(null);
                      setRecordTree([]);
                      setRecordTreeRaw(null);
                    }}
                  >
                    Đóng
                  </Button>
                </Space>
              }
              size="small"
            >
              {renderPatientInfo(selectedExam)}

              <Spin spinning={treeLoading}>
                {recordTree.length > 0 ? (
                  <Tree
                    showIcon
                    defaultExpandAll
                    treeData={recordTree}
                    selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
                    onSelect={(keys) => handleTreeSelect(keys, recordTreeRaw)}
                    style={{ minHeight: 200 }}
                  />
                ) : (
                  <Result
                    status="info"
                    title="Chọn hồ sơ để xem cây cấu trúc"
                    subTitle="Click vào bệnh nhân trong danh sách bên trái"
                  />
                )}
              </Spin>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );

  const renderReviewTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="Nhập mã khám chữa bệnh (mã hồ sơ)"
            allowClear
            enterButton={<><SearchOutlined /> Tìm kiếm</>}
            value={reviewKeyword}
            onChange={(e) => setReviewKeyword(e.target.value)}
            onSearch={searchReviewRecord}
            style={{ maxWidth: 500 }}
          />
        </Col>
      </Row>

      <Spin spinning={reviewLoading}>
        {reviewExam ? (
          <div>
            {renderPatientInfo(reviewExam)}

            <Card
              title={
                <Space>
                  <AuditOutlined />
                  <span>Soát hồ sơ bệnh án trước bàn giao</span>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => reviewExam && handleExportPdf(reviewExam.id)}
                >
                  Xuất PDF toàn bộ
                </Button>
              }
              size="small"
            >
              {reviewTree.length > 0 ? (
                <Tree
                  showIcon
                  defaultExpandAll
                  treeData={reviewTree}
                  onSelect={(keys) => handleTreeSelect(keys, reviewTreeRaw)}
                  style={{ minHeight: 200 }}
                />
              ) : (
                <Result
                  status="info"
                  title="Không có dữ liệu hồ sơ"
                />
              )}
            </Card>
          </div>
        ) : (
          <Result
            icon={<AuditOutlined style={{ color: '#1890ff' }} />}
            title="Soát hồ sơ trước bàn giao"
            subTitle="Nhập mã khám chữa bệnh để tìm và soát hồ sơ bệnh án trước khi bàn giao cho phòng lưu trữ"
          />
        )}
      </Spin>
    </div>
  );

  const renderHandoverTab = () => (
    <div>
      {/* Summary cards */}
      {handoverSummary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Chờ bàn giao"
                value={handoverSummary.totalPending}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Đã gửi"
                value={handoverSummary.totalSent}
                prefix={<SwapOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Đã nhận"
                value={handoverSummary.totalReceived}
                prefix={<ExportOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Đã duyệt"
                value={handoverSummary.totalApproved}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Search
            placeholder="Tìm theo mã HSBA, mã BN, tên..."
            allowClear
            value={handoverKeyword}
            onChange={(e) => setHandoverKeyword(e.target.value)}
            onSearch={() => fetchHandoverList(1)}
          />
        </Col>
        <Col xs={12} sm={5}>
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ width: '100%' }}
            value={handoverStatusFilter}
            onChange={(v) => {
              setHandoverStatusFilter(v);
              setTimeout(() => fetchHandoverList(1), 0);
            }}
            options={[
              { value: 0, label: 'Chờ bàn giao' },
              { value: 1, label: 'Đã gửi' },
              { value: 2, label: 'Đã nhận' },
              { value: 3, label: 'Đã duyệt' },
            ]}
          />
        </Col>
        <Col xs={12} sm={6}>
          <RangePicker
            value={handoverDateRange}
            onChange={(dates) => {
              setHandoverDateRange(dates ? [dates[0], dates[1]] : [null, null]);
            }}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
          />
        </Col>
        <Col>
          <Space>
            <Button icon={<SearchOutlined />} type="primary" onClick={() => fetchHandoverList(1)}>
              Tim
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => {
              setHandoverKeyword('');
              setHandoverStatusFilter(undefined);
              setHandoverDateRange([dayjs().subtract(30, 'day'), dayjs()]);
              fetchHandoverList(1);
            }}>
              Đặt lại
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Actions */}
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              disabled={selectedHandoverKeys.length === 0}
              onClick={handleHandover}
            >
              Bàn giao ({selectedHandoverKeys.length})
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              disabled={selectedHandoverKeys.length === 0}
              onClick={() => setApproveModalOpen(true)}
            >
              Duyệt ({selectedHandoverKeys.length})
            </Button>
            {selectedHandoverKeys.length > 0 && (
              <Button type="link" onClick={() => setSelectedHandoverKeys([])}>
                Bỏ chọn tất cả
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Table */}
      <Table
        dataSource={handoverRecords}
        columns={handoverColumns}
        rowKey="id"
        loading={handoverLoading}
        size="small"
        rowSelection={{
          selectedRowKeys: selectedHandoverKeys,
          onChange: setSelectedHandoverKeys,
        }}
        pagination={{
          current: handoverPage,
          pageSize: 20,
          total: handoverTotal,
          showTotal: (total) => `Tổng: ${total} hồ sơ`,
          onChange: (page) => fetchHandoverList(page),
        }}
        scroll={{ x: 1200 }}
      />

      {/* Approve modal */}
      <Modal
        title="Duyệt hồ sơ bàn giao"
        open={approveModalOpen}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalOpen(false);
          setApproveComments('');
        }}
        confirmLoading={approveLoading}
        okText="Duyệt"
        cancelText="Hủy"
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <Badge count={selectedHandoverKeys.length} style={{ backgroundColor: '#52c41a' }}>
            <Tag>Hồ sơ được chọn</Tag>
          </Badge>
        </div>
        <div style={{ marginBottom: 8 }}>Ghi chú duyệt (tùy chọn):</div>
        <TextArea
          rows={3}
          placeholder="Nhập ghi chú duyệt..."
          value={approveComments}
          onChange={(e) => setApproveComments(e.target.value)}
        />
      </Modal>

      {/* Preview drawer */}
      <Drawer
        title={previewRecord ? `Xem trước: ${previewRecord.patientName} - ${previewRecord.medicalRecordCode}` : 'Xem trước'}
        open={previewDrawerOpen}
        onClose={() => {
          setPreviewDrawerOpen(false);
          setPreviewRecord(null);
          setPreviewTree([]);
        }}
        size="large"
      >
        {previewRecord && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã HSBA">{previewRecord.medicalRecordCode}</Descriptions.Item>
              <Descriptions.Item label="Mã BN">{previewRecord.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ tên">{previewRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{previewRecord.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Ngày ra viện">
                {previewRecord.dischargeDate ? dayjs(previewRecord.dischargeDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={HANDOVER_STATUS_MAP[previewRecord.handoverStatus]?.color || 'default'}>
                  {HANDOVER_STATUS_MAP[previewRecord.handoverStatus]?.label || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hoàn thành biểu mẫu" span={2}>
                <Progress
                  percent={previewRecord.totalForms > 0
                    ? Math.round((previewRecord.completedForms / previewRecord.totalForms) * 100)
                    : 0}
                  size="small"
                />
                {previewRecord.completedForms}/{previewRecord.totalForms} biểu mẫu
              </Descriptions.Item>
            </Descriptions>

            {previewTree.length > 0 ? (
              <Tree
                showIcon
                defaultExpandAll
                treeData={previewTree}
                style={{ minHeight: 200 }}
              />
            ) : (
              <Result status="info" title="Đang tải cấu trúc hồ sơ..." />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 4px' }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Tổng hồ sơ"
                value={stats.totalRecords}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Chờ soát"
                value={stats.pendingReview}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Đã bàn giao"
                value={stats.handedOver}
                prefix={<SwapOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Đã duyệt"
                value={stats.approved}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
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
                key: 'summary',
                label: (
                  <span>
                    <FolderOutlined /> Tổng hợp hồ sơ BA
                  </span>
                ),
                children: renderSummaryTab(),
              },
              {
                key: 'review',
                label: (
                  <span>
                    <AuditOutlined /> Soát HSBA trước bàn giao
                  </span>
                ),
                children: renderReviewTab(),
              },
              {
                key: 'handover',
                label: (
                  <span>
                    <SwapOutlined /> Bàn giao HSBA{' '}
                    {stats.pendingReview > 0 && (
                      <Badge count={stats.pendingReview} size="small" />
                    )}
                  </span>
                ),
                children: renderHandoverTab(),
              },
            ]}
          />
        </Card>

        {/* Detail drawer for tree node clicks */}
        <Drawer
          title={detailTitle || 'Chi tiết'}
          open={detailDrawerOpen}
          onClose={() => {
            setDetailDrawerOpen(false);
            setDetailContent(null);
            setDetailTitle('');
          }}
          size="large"
        >
          {renderDetailContent()}
        </Drawer>
      </div>
    </Spin>
  );
};

export default MedicalRecordArchive;
