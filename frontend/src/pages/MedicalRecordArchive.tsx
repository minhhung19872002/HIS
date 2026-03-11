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
  0: { label: 'Cho ban giao', color: 'default' },
  1: { label: 'Da gui', color: 'processing' },
  2: { label: 'Da nhan', color: 'warning' },
  3: { label: 'Da duyet', color: 'success' },
};

const GENDER_MAP: Record<number, string> = { 0: 'Nam', 1: 'Nu', 2: 'Khac' };

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
        title: `Benh an - ${data.medicalRecord.code || 'N/A'}`,
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

    addGroup('treatment-sheets', 'To dieu tri', data.treatmentSheets, <FileTextOutlined />);
    addGroup('service-orders', 'Phieu chi dinh CLS', data.serviceOrders, <FolderOutlined />);
    addGroup('service-results', 'Ket qua CLS', data.serviceResults, <CheckCircleOutlined />);
    addGroup('treatment-orders', 'Y lenh dieu tri', data.treatmentOrders, <AuditOutlined />);
    addGroup('nursing-care', 'Phieu cham soc', data.nursingCareSheets, <FileTextOutlined />);
    addGroup('vital-signs', 'Phieu theo doi chuc nang song', data.vitalSignsRecords, <FileTextOutlined />);
    addGroup('infusion', 'Phieu truyen dich', data.infusionRecords, <FileTextOutlined />);
    addGroup('blood-transfusion', 'Phieu theo doi truyen mau', data.bloodTransfusionRecords, <FileTextOutlined />);
    addGroup('cost-summary', 'Bang ke chi phi', data.costSummary, <FileExcelOutlined />);
    addGroup('surgery', 'Phieu phau thuat thu thuat', data.surgeryRecords, <FileTextOutlined />);
    addGroup('admission-exam', 'Phieu kham benh vao vien', data.admissionExam, <FileTextOutlined />);

    return nodes;
  };

  const findTreeItemDetail = (
    nodeKey: string,
    data: MedicalRecordTree
  ): { detail: Record<string, unknown> | null; title: string } => {
    // Determine group and item index from key
    const groups: Record<string, { items: TreeItem[]; title: string }> = {
      'treatment-sheets': { items: data.treatmentSheets, title: 'To dieu tri' },
      'service-orders': { items: data.serviceOrders, title: 'Phieu chi dinh CLS' },
      'service-results': { items: data.serviceResults, title: 'Ket qua CLS' },
      'treatment-orders': { items: data.treatmentOrders, title: 'Y lenh dieu tri' },
      'nursing-care': { items: data.nursingCareSheets, title: 'Phieu cham soc' },
      'vital-signs': { items: data.vitalSignsRecords, title: 'Phieu theo doi chuc nang song' },
      'infusion': { items: data.infusionRecords, title: 'Phieu truyen dich' },
      'blood-transfusion': { items: data.bloodTransfusionRecords, title: 'Phieu theo doi truyen mau' },
      'cost-summary': { items: data.costSummary, title: 'Bang ke chi phi' },
      'surgery': { items: data.surgeryRecords, title: 'Phieu phau thuat thu thuat' },
      'admission-exam': { items: data.admissionExam, title: 'Phieu kham benh vao vien' },
    };

    if (nodeKey.startsWith('record-')) {
      return {
        detail: (data.medicalRecord as unknown as Record<string, unknown>) || null,
        title: 'Benh an',
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
      message.warning('Khong the tai danh sach ho so');
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
          title: `To dieu tri ngay ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : 'N/A'}`,
          date: s.treatmentDate as string,
          detail: s,
        })),
        serviceOrders: (rawData.serviceOrders || []).map((o: Record<string, unknown>) => ({
          id: o.id as string,
          title: (o.serviceName as string) || (o.testName as string) || `Chi dinh #${o.id}`,
          date: o.orderDate as string || o.createdAt as string,
          status: o.status as number,
          detail: o,
        })),
        serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: (r.testName as string) || (r.serviceName as string) || `Ket qua #${r.id}`,
          date: r.resultDate as string || r.completedAt as string,
          detail: r,
        })),
        treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: `Don thuoc ${p.prescriptionDate ? dayjs(p.prescriptionDate as string).format('DD/MM/YYYY') : ''}`,
          date: p.prescriptionDate as string || p.createdAt as string,
          detail: p,
        })),
        nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
          id: n.id as string,
          title: `Cham soc ${n.date ? dayjs(n.date as string).format('DD/MM/YYYY') : ''} ${n.shift || ''}`,
          date: n.date as string,
          detail: n,
        })),
        vitalSignsRecords: rawData.vitalSigns ? [{
          id: 'vs-1',
          title: `Sinh hieu ${rawData.vitalSigns.measuredAt ? dayjs(rawData.vitalSigns.measuredAt).format('DD/MM/YYYY HH:mm') : ''}`,
          date: rawData.vitalSigns.measuredAt,
          detail: rawData.vitalSigns,
        }] : [],
        infusionRecords: (rawData.infusionRecords || []).map((inf: Record<string, unknown>) => ({
          id: inf.id as string,
          title: `Truyen dich ${inf.startTime ? dayjs(inf.startTime as string).format('DD/MM/YYYY HH:mm') : ''}`,
          date: inf.startTime as string,
          detail: inf,
        })),
        bloodTransfusionRecords: (rawData.bloodTransfusionRecords || []).map((bt: Record<string, unknown>) => ({
          id: bt.id as string,
          title: `Truyen mau ${bt.transfusionDate ? dayjs(bt.transfusionDate as string).format('DD/MM/YYYY') : ''}`,
          date: bt.transfusionDate as string,
          detail: bt,
        })),
        costSummary: rawData.costSummary ? [{
          id: 'cost-1',
          title: 'Bang ke chi phi kham chua benh',
          detail: rawData.costSummary,
        }] : [],
        surgeryRecords: (rawData.surgeryRecords || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Phau thuat ${s.surgeryName || ''} ${s.surgeryDate ? dayjs(s.surgeryDate as string).format('DD/MM/YYYY') : ''}`,
          date: s.surgeryDate as string,
          detail: s,
        })),
        admissionExam: rawData.admissionExam ? [{
          id: 'adm-1',
          title: 'Phieu kham benh vao vien',
          date: rawData.admissionExam.examDate,
          detail: rawData.admissionExam,
        }] : [],
      };

      setRecordTreeRaw(tree);
      setRecordTree(buildTreeData(tree));
    } catch {
      message.warning('Khong the tai ho so benh an');
      setRecordTree([]);
      setRecordTreeRaw(null);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  // -- Tab 2 search single record
  const searchReviewRecord = useCallback(async () => {
    if (!reviewKeyword.trim()) {
      message.warning('Vui long nhap ma kham chua benh');
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
        message.warning('Khong tim thay ho so benh an');
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
          title: `To dieu tri ngay ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : 'N/A'}`,
          date: s.treatmentDate as string,
          detail: s,
        })),
        serviceOrders: (rawData.serviceOrders || []).map((o: Record<string, unknown>) => ({
          id: o.id as string,
          title: (o.serviceName as string) || `Chi dinh #${o.id}`,
          date: o.orderDate as string,
          detail: o,
        })),
        serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: (r.testName as string) || `Ket qua #${r.id}`,
          date: r.resultDate as string,
          detail: r,
        })),
        treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: `Don thuoc ${p.prescriptionDate ? dayjs(p.prescriptionDate as string).format('DD/MM/YYYY') : ''}`,
          date: p.prescriptionDate as string,
          detail: p,
        })),
        nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
          id: n.id as string,
          title: `Cham soc ${n.date ? dayjs(n.date as string).format('DD/MM/YYYY') : ''}`,
          date: n.date as string,
          detail: n,
        })),
        vitalSignsRecords: rawData.vitalSigns ? [{
          id: 'vs-1',
          title: `Sinh hieu ${rawData.vitalSigns.measuredAt ? dayjs(rawData.vitalSigns.measuredAt).format('DD/MM/YYYY HH:mm') : ''}`,
          date: rawData.vitalSigns.measuredAt,
          detail: rawData.vitalSigns,
        }] : [],
        infusionRecords: (rawData.infusionRecords || []).map((inf: Record<string, unknown>) => ({
          id: inf.id as string,
          title: `Truyen dich ${inf.startTime ? dayjs(inf.startTime as string).format('DD/MM/YYYY HH:mm') : ''}`,
          date: inf.startTime as string,
          detail: inf,
        })),
        bloodTransfusionRecords: (rawData.bloodTransfusionRecords || []).map((bt: Record<string, unknown>) => ({
          id: bt.id as string,
          title: `Truyen mau ${bt.transfusionDate ? dayjs(bt.transfusionDate as string).format('DD/MM/YYYY') : ''}`,
          date: bt.transfusionDate as string,
          detail: bt,
        })),
        costSummary: rawData.costSummary ? [{
          id: 'cost-1',
          title: 'Bang ke chi phi kham chua benh',
          detail: rawData.costSummary,
        }] : [],
        surgeryRecords: (rawData.surgeryRecords || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          title: `Phau thuat ${s.surgeryName || ''}`,
          date: s.surgeryDate as string,
          detail: s,
        })),
        admissionExam: rawData.admissionExam ? [{
          id: 'adm-1',
          title: 'Phieu kham benh vao vien',
          detail: rawData.admissionExam,
        }] : [],
      };

      setReviewTreeRaw(tree);
      setReviewTree(buildTreeData(tree));
    } catch {
      message.warning('Khong the tim ho so benh an');
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
      message.warning('Khong the tai danh sach ban giao');
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
      message.warning('Vui long chon ho so can ban giao');
      return;
    }
    try {
      await client.post('/inpatient/medical-record-archive/handover', {
        recordIds: selectedHandoverKeys,
      });
      message.success(`Da ban giao ${selectedHandoverKeys.length} ho so`);
      setSelectedHandoverKeys([]);
      fetchHandoverList(handoverPage);
      fetchStats();
    } catch {
      message.warning('Khong the ban giao ho so');
    }
  }, [selectedHandoverKeys, fetchHandoverList, handoverPage, fetchStats]);

  const handleApprove = useCallback(async () => {
    if (selectedHandoverKeys.length === 0) {
      message.warning('Vui long chon ho so can duyet');
      return;
    }
    setApproveLoading(true);
    try {
      await client.post('/inpatient/medical-record-archive/approve', {
        recordIds: selectedHandoverKeys,
        comments: approveComments,
      });
      message.success(`Da duyet ${selectedHandoverKeys.length} ho so`);
      setSelectedHandoverKeys([]);
      setApproveModalOpen(false);
      setApproveComments('');
      fetchHandoverList(handoverPage);
      fetchStats();
    } catch {
      message.warning('Khong the duyet ho so');
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
        message.warning('Trinh duyet chan popup, vui long cho phep popup');
        return;
      }

      const patientInfo = data.patient || {};
      const diagnoses = data.diagnoses || [];
      const vitalSigns = data.vitalSigns || {};
      const interview = data.interview || {};

      printWindow.document.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>Ho so benh an - ${patientInfo.fullName || ''}</title>
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
        <h1>HO SO BENH AN</h1>
        <h2>Thong tin benh nhan</h2>
        <div class="section">
          <div class="field"><span class="label">Ho ten:</span> ${patientInfo.fullName || ''}</div>
          <div class="field"><span class="label">Ma benh nhan:</span> ${patientInfo.patientCode || ''}</div>
          <div class="field"><span class="label">Gioi tinh:</span> ${GENDER_MAP[patientInfo.gender] || ''}</div>
          <div class="field"><span class="label">Ngay sinh:</span> ${patientInfo.dateOfBirth ? dayjs(patientInfo.dateOfBirth).format('DD/MM/YYYY') : ''}</div>
          <div class="field"><span class="label">Dia chi:</span> ${patientInfo.address || ''}</div>
          <div class="field"><span class="label">SDT:</span> ${patientInfo.phoneNumber || ''}</div>
        </div>
        <h2>Chan doan</h2>
        <div class="section">
          ${diagnoses.map((d: Record<string, unknown>) => `<div class="field">${d.icdCode || ''} - ${d.icdName || d.diagnosisName || ''}</div>`).join('')}
        </div>
        <h2>Sinh hieu</h2>
        <div class="section">
          <div class="field"><span class="label">Huyet ap:</span> ${vitalSigns.systolicBP || '-'}/${vitalSigns.diastolicBP || '-'} mmHg</div>
          <div class="field"><span class="label">Mach:</span> ${vitalSigns.pulse || '-'} l/p</div>
          <div class="field"><span class="label">Nhiet do:</span> ${vitalSigns.temperature || '-'} C</div>
          <div class="field"><span class="label">Can nang:</span> ${vitalSigns.weight || '-'} kg</div>
          <div class="field"><span class="label">Chieu cao:</span> ${vitalSigns.height || '-'} cm</div>
          <div class="field"><span class="label">SpO2:</span> ${vitalSigns.spO2 || '-'} %</div>
        </div>
        <h2>Benh su</h2>
        <div class="section">
          <div class="field"><span class="label">Ly do kham:</span> ${interview.chiefComplaint || ''}</div>
          <div class="field"><span class="label">Benh su:</span> ${interview.historyOfPresentIllness || ''}</div>
          <div class="field"><span class="label">Tien su ban than:</span> ${interview.pastMedicalHistory || ''}</div>
          <div class="field"><span class="label">Tien su gia dinh:</span> ${interview.familyHistory || ''}</div>
        </div>
        <script>window.print();</script>
      </body></html>`);
      printWindow.document.close();
    } catch {
      message.warning('Khong the xuat PDF ho so benh an');
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
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Ho ten',
      dataIndex: 'patientName',
      key: 'patientName',
      width: 160,
    },
    {
      title: 'Ngay kham',
      dataIndex: 'examinationDate',
      key: 'examinationDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Khoa/Phong',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 130,
      render: (v: string, r: ArchiveExamination) => r.departmentName || v || '-',
    },
    {
      title: 'Chan doan',
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
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: number, r: ArchiveExamination) => {
        const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'warning', 3: 'orange', 4: 'success' };
        const names: Record<number, string> = { 0: 'Cho kham', 1: 'Dang kham', 2: 'Cho CLS', 3: 'Cho ket luan', 4: 'Hoan thanh' };
        return <Tag color={colors[v] || 'default'}>{r.statusName || names[v] || `Status ${v}`}</Tag>;
      },
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ArchiveExamination) => (
        <Space>
          <Tooltip title="Xem ho so">
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
          <Tooltip title="Xuat PDF">
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
      title: 'Ma HSBA',
      dataIndex: 'medicalRecordCode',
      key: 'medicalRecordCode',
      width: 120,
    },
    {
      title: 'Ma BN',
      dataIndex: 'patientCode',
      key: 'patientCode',
      width: 100,
    },
    {
      title: 'Ho ten',
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
      title: 'Ngay ra vien',
      dataIndex: 'dischargeDate',
      key: 'dischargeDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Trang thai',
      dataIndex: 'handoverStatus',
      key: 'handoverStatus',
      width: 120,
      render: (v: number) => {
        const info = HANDOVER_STATUS_MAP[v] || HANDOVER_STATUS_MAP[0];
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Hoan thanh',
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
      title: 'Ngay ban giao',
      dataIndex: 'handoverDate',
      key: 'handoverDate',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Ghi chu',
      dataIndex: 'comments',
      key: 'comments',
      ellipsis: true,
      width: 150,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: HandoverRecord) => (
        <Space>
          <Tooltip title="Xem truoc">
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
                        title: (o.serviceName as string) || `Chi dinh #${o.id}`,
                        detail: o,
                      })),
                      serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r: Record<string, unknown>) => ({
                        id: r.id as string,
                        title: (r.testName as string) || `Ket qua #${r.id}`,
                        detail: r,
                      })),
                      treatmentOrders: (rawData.prescriptions || []).map((p: Record<string, unknown>) => ({
                        id: p.id as string,
                        title: `Don thuoc`,
                        detail: p,
                      })),
                      nursingCareSheets: (rawData.nursingCareSheets || []).map((n: Record<string, unknown>) => ({
                        id: n.id as string,
                        title: `Cham soc`,
                        detail: n,
                      })),
                      vitalSignsRecords: rawData.vitalSigns ? [{
                        id: 'vs-1',
                        title: 'Sinh hieu',
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
          <Tooltip title="Xuat PDF">
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
                      message.warning('Khong tim thay ho so');
                    }
                  } catch {
                    message.warning('Khong the xuat PDF');
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
      return <Result status="info" title="Khong co du lieu chi tiet" />;
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
        <Descriptions.Item label="Ma benh nhan">{exam.patientCode}</Descriptions.Item>
        <Descriptions.Item label="Ho ten">{exam.patientName}</Descriptions.Item>
        <Descriptions.Item label="Gioi tinh">{GENDER_MAP[exam.gender] || '-'}</Descriptions.Item>
        <Descriptions.Item label="Ngay sinh">
          {exam.dateOfBirth ? dayjs(exam.dateOfBirth).format('DD/MM/YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Ngay kham">
          {exam.examinationDate ? dayjs(exam.examinationDate).format('DD/MM/YYYY') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Khoa/Phong">
          {exam.departmentName || exam.roomName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Bac si">{exam.doctorName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Chan doan" span={2}>
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
            placeholder="Tim theo ten, ma benh nhan, ma ho so..."
            allowClear
            enterButton={<><SearchOutlined /> Tim kiem</>}
            value={summaryKeyword}
            onChange={(e) => setSummaryKeyword(e.target.value)}
            onSearch={() => searchSummaryExams(1, summaryPageSize)}
            style={{ maxWidth: 500 }}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => searchSummaryExams(summaryPage, summaryPageSize)}>
            Lam moi
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
              showTotal: (total) => `Tong: ${total} ho so`,
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
                  <span>Ho so benh an: {selectedExam.patientName}</span>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => handleExportPdf(selectedExam.id)}
                  >
                    Xuat PDF
                  </Button>
                  <Button
                    type="text"
                    onClick={() => {
                      setSelectedExam(null);
                      setRecordTree([]);
                      setRecordTreeRaw(null);
                    }}
                  >
                    Dong
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
                    title="Chon ho so de xem cay cau truc"
                    subTitle="Click vao benh nhan trong danh sach ben trai"
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
            placeholder="Nhap ma kham chua benh (ma ho so)"
            allowClear
            enterButton={<><SearchOutlined /> Tim kiem</>}
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
                  <span>Soat ho so benh an truoc ban giao</span>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => reviewExam && handleExportPdf(reviewExam.id)}
                >
                  Xuat PDF toan bo
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
                  title="Khong co du lieu ho so"
                />
              )}
            </Card>
          </div>
        ) : (
          <Result
            icon={<AuditOutlined style={{ color: '#1890ff' }} />}
            title="Soat ho so truoc ban giao"
            subTitle="Nhap ma kham chua benh de tim va soat ho so benh an truoc khi ban giao cho phong luu tru"
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
                title="Cho ban giao"
                value={handoverSummary.totalPending}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Da gui"
                value={handoverSummary.totalSent}
                prefix={<SwapOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Da nhan"
                value={handoverSummary.totalReceived}
                prefix={<ExportOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Da duyet"
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
            placeholder="Tim theo ma HSBA, ma BN, ten..."
            allowClear
            value={handoverKeyword}
            onChange={(e) => setHandoverKeyword(e.target.value)}
            onSearch={() => fetchHandoverList(1)}
          />
        </Col>
        <Col xs={12} sm={5}>
          <Select
            placeholder="Trang thai"
            allowClear
            style={{ width: '100%' }}
            value={handoverStatusFilter}
            onChange={(v) => {
              setHandoverStatusFilter(v);
              setTimeout(() => fetchHandoverList(1), 0);
            }}
            options={[
              { value: 0, label: 'Cho ban giao' },
              { value: 1, label: 'Da gui' },
              { value: 2, label: 'Da nhan' },
              { value: 3, label: 'Da duyet' },
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
              Dat lai
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
              Ban giao ({selectedHandoverKeys.length})
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              disabled={selectedHandoverKeys.length === 0}
              onClick={() => setApproveModalOpen(true)}
            >
              Duyet ({selectedHandoverKeys.length})
            </Button>
            {selectedHandoverKeys.length > 0 && (
              <Button type="link" onClick={() => setSelectedHandoverKeys([])}>
                Bo chon tat ca
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
          showTotal: (total) => `Tong: ${total} ho so`,
          onChange: (page) => fetchHandoverList(page),
        }}
        scroll={{ x: 1200 }}
      />

      {/* Approve modal */}
      <Modal
        title="Duyet ho so ban giao"
        open={approveModalOpen}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalOpen(false);
          setApproveComments('');
        }}
        confirmLoading={approveLoading}
        okText="Duyet"
        cancelText="Huy"
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <Badge count={selectedHandoverKeys.length} style={{ backgroundColor: '#52c41a' }}>
            <Tag>Ho so duoc chon</Tag>
          </Badge>
        </div>
        <div style={{ marginBottom: 8 }}>Ghi chu duyet (tuy chon):</div>
        <TextArea
          rows={3}
          placeholder="Nhap ghi chu duyet..."
          value={approveComments}
          onChange={(e) => setApproveComments(e.target.value)}
        />
      </Modal>

      {/* Preview drawer */}
      <Drawer
        title={previewRecord ? `Xem truoc: ${previewRecord.patientName} - ${previewRecord.medicalRecordCode}` : 'Xem truoc'}
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
              <Descriptions.Item label="Ma HSBA">{previewRecord.medicalRecordCode}</Descriptions.Item>
              <Descriptions.Item label="Ma BN">{previewRecord.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Ho ten">{previewRecord.patientName}</Descriptions.Item>
              <Descriptions.Item label="Khoa">{previewRecord.departmentName}</Descriptions.Item>
              <Descriptions.Item label="Ngay ra vien">
                {previewRecord.dischargeDate ? dayjs(previewRecord.dischargeDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Trang thai">
                <Tag color={HANDOVER_STATUS_MAP[previewRecord.handoverStatus]?.color || 'default'}>
                  {HANDOVER_STATUS_MAP[previewRecord.handoverStatus]?.label || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hoan thanh bieu mau" span={2}>
                <Progress
                  percent={previewRecord.totalForms > 0
                    ? Math.round((previewRecord.completedForms / previewRecord.totalForms) * 100)
                    : 0}
                  size="small"
                />
                {previewRecord.completedForms}/{previewRecord.totalForms} bieu mau
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
              <Result status="info" title="Dang tai cau truc ho so..." />
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
                title="Tong ho so"
                value={stats.totalRecords}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Cho soat"
                value={stats.pendingReview}
                prefix={<ClockCircleOutlined />}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Da ban giao"
                value={stats.handedOver}
                prefix={<SwapOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Da duyet"
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
                    <FolderOutlined /> Tong hop ho so BA
                  </span>
                ),
                children: renderSummaryTab(),
              },
              {
                key: 'review',
                label: (
                  <span>
                    <AuditOutlined /> Soat HSBA truoc ban giao
                  </span>
                ),
                children: renderReviewTab(),
              },
              {
                key: 'handover',
                label: (
                  <span>
                    <SwapOutlined /> Ban giao HSBA{' '}
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
          title={detailTitle || 'Chi tiet'}
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
