import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Form, Input, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { getArchiveList, createArchive } from '../api/medicalRecordArchive';
import * as pdfApi from '../../../api/pdf';
import { deptApproveRecord, getArchiveApproval, finalizeRecord, type ArchiveApprovalStatusDto } from '../../emr/api/emrAdmin';
import { searchExaminations, getMedicalRecordFull } from '../../opd/api/examination';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  StatusTabs, DrawerShell, ModalShell, DrSec, DrField, EmptyState, tk, ti, tw, Ico,
  type ColumnDef, type StatusTone,
} from '@/_v2kit';

/* =====================================================================
 * Port v1 pages/MedicalRecordArchive.tsx -> v2 (#409 batch-4).
 * Đã port: tab "Tổng hợp hồ sơ BA" (tìm kiếm + cây hồ sơ + drawer chi tiết
 * node + xuất PDF in), tab "Soát HSBA trước bàn giao" (tra 1 mã KCB + cây
 * + xuất PDF toàn bộ). Ghi chú: v1 gọi GET /examination/{id}/medical-record-full
 * (endpoint KHÔNG tồn tại ở BE — luôn 404); api đã relocate là
 * getMedicalRecordFull -> GET /examination/{id}/medical-record (BE có thật).
 *
 * TODO(#409): các tính năng v1 SKIP vì api chưa relocate vào modules/*:
 *  - Tab "Bàn giao HSBA" — GET /inpatient/medical-record-archive/list + /summary
 *    chưa relocate; POST .../handover + .../approve còn không tồn tại ở BE.
 *  - Storage status local/cloud — GET /archives/storage-status chưa relocate.
 *  - Tạo lưu trữ XML/HL7/CDA — POST /archives/generate chưa relocate.
 *  - Giải mã hồ sơ lưu trữ — GET /archives/decode/{id} chưa relocate.
 *  - Tải file lưu trữ (blob) — GET /archives/download/{id} chưa relocate.
 *  - KPI v1 (tổng/chờ soát/đã bàn giao/đã duyệt) — nguồn
 *    /inpatient/medical-record-archive/summary chưa relocate; giữ KPI v2.
 *  - Gate isApiAvailable('/inpatient/medical-record-archive/summary') — chỉ
 *    phục vụ nhóm endpoint đã skip ở trên.
 * ===================================================================== */

// ArchiveDto từ BE: status 1 = Archived, 0 = Pending
interface ArchivedRecord {
  id: string;
  archiveCode: string;
  patientCode: string;
  patientName: string;
  medicalRecordCode: string;
  medicalRecordId: string;
  archiveDate: string;
  departmentName?: string;
  dischargeDate?: string;
  storageLocation?: string;
  shelfNumber?: string;
  boxNumber?: string;
  status: number;           // 0=Pending, 1=Archived
  statusName: string;
  archiveYear: number;
  borrowCount: number;
}

// ── Types port verbatim từ v1 pages/medical-record-archive/types.ts ──
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

// Shape lỏng của response medical-record (v1 đọc rawData không type — giữ verbatim)
type LooseRecord = Record<string, unknown>;
interface FullRecordLoose {
  id?: string;
  medicalRecordCode?: string;
  patient?: {
    patientCode?: string; fullName?: string; gender?: number;
    dateOfBirth?: string; address?: string; phoneNumber?: string;
  };
  diagnoses?: LooseRecord[];
  vitalSigns?: LooseRecord;
  interview?: LooseRecord;
  treatmentSheets?: LooseRecord[];
  serviceOrders?: LooseRecord[];
  labResults?: LooseRecord[];
  serviceResults?: LooseRecord[];
  prescriptions?: LooseRecord[];
  nursingCareSheets?: LooseRecord[];
  infusionRecords?: LooseRecord[];
  bloodTransfusionRecords?: LooseRecord[];
  costSummary?: LooseRecord;
  surgeryRecords?: LooseRecord[];
  admissionExam?: LooseRecord;
}

// ── Constants port verbatim từ v1 ──
const GENDER_MAP: Record<number, string> = { 0: 'Nam', 1: 'Nữ', 2: 'Khác' };
const EXAM_STATUS_NAMES: Record<number, string> = {
  0: 'Chờ khám', 1: 'Đang khám', 2: 'Chờ CLS', 3: 'Chờ kết luận', 4: 'Hoàn thành',
};
// v1 tag colors: 0 default · 1 processing · 2 warning · 3 orange · 4 success
const EXAM_STATUS_TONES: Record<number, StatusTone> = {
  0: 'info', 1: 'info', 2: 'warn', 3: 'warn', 4: 'ok',
};

const PER = 20;

// Tab "xác thực" tương ứng status=1 (Archived) vs 0 (Pending)
type ArchiveStatus = 'archived' | 'pending';
const STATUS_TABS = [
  { v: 'archived' as ArchiveStatus, l: 'Đã lưu trữ',  tone: 'ok'   as const },
  { v: 'pending'  as ArchiveStatus, l: 'Chờ xử lý',   tone: 'warn' as const },
];

type PageTab = 'archive' | 'summary' | 'review';
const PAGE_TABS = [
  { v: 'archive' as PageTab, l: 'Lưu trữ & Tra cứu',        ic: 'archive' },
  { v: 'summary' as PageTab, l: 'Tổng hợp hồ sơ BA',        ic: 'folder' },
  { v: 'review'  as PageTab, l: 'Soát HSBA trước bàn giao', ic: 'check' },
];

// ─────────────────── Helpers port verbatim từ v1 ───────────────────

const buildTreeData = (data: MedicalRecordTree): DataNode[] => {
  const nodes: DataNode[] = [];

  if (data.medicalRecord) {
    nodes.push({
      key: `record-${data.medicalRecord.id}`,
      title: `Bệnh án - ${data.medicalRecord.code || 'N/A'}`,
      isLeaf: true,
    });
  }

  const addGroup = (key: string, title: string, items: TreeItem[]) => {
    if (items.length > 0) {
      nodes.push({
        key,
        title: `${title} (${items.length})`,
        children: items.map((item, idx) => ({
          key: `${key}-${item.id || idx}`,
          title: item.title + (item.date ? ` - ${dayjs(item.date).format('DD/MM/YYYY')}` : ''),
          isLeaf: true,
        })),
      });
    }
  };

  addGroup('treatment-sheets', 'Tờ điều trị', data.treatmentSheets);
  addGroup('service-orders', 'Phiếu chỉ định CLS', data.serviceOrders);
  addGroup('service-results', 'Kết quả CLS', data.serviceResults);
  addGroup('treatment-orders', 'Y lệnh điều trị', data.treatmentOrders);
  addGroup('nursing-care', 'Phiếu chăm sóc', data.nursingCareSheets);
  addGroup('vital-signs', 'Phiếu theo dõi chức năng sống', data.vitalSignsRecords);
  addGroup('infusion', 'Phiếu truyền dịch', data.infusionRecords);
  addGroup('blood-transfusion', 'Phiếu theo dõi truyền máu', data.bloodTransfusionRecords);
  addGroup('cost-summary', 'Bảng kê chi phí', data.costSummary);
  addGroup('surgery', 'Phiếu phẫu thuật thủ thuật', data.surgeryRecords);
  addGroup('admission-exam', 'Phiếu khám bệnh vào viện', data.admissionExam);

  return nodes;
};

const findTreeItemDetail = (
  nodeKey: string,
  data: MedicalRecordTree,
): { detail: Record<string, unknown> | null; title: string } => {
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

/** Map response medical-record -> MedicalRecordTree (verbatim mapping v1 tab Tổng hợp). */
const mapFullRecordToTree = (rawData: FullRecordLoose): MedicalRecordTree => ({
  medicalRecord: rawData.id ? {
    id: rawData.id,
    code: rawData.medicalRecordCode || '',
    patientName: rawData.patient?.fullName || '',
    diagnosis: (rawData.diagnoses?.[0]?.icdName as string)
      || (rawData.diagnoses?.[0]?.diagnosisName as string) || '',
    createdAt: rawData.patient?.dateOfBirth,
  } : undefined,
  treatmentSheets: (rawData.treatmentSheets || []).map((s) => ({
    id: s.id as string,
    title: `Tờ điều trị ngày ${s.treatmentDate ? dayjs(s.treatmentDate as string).format('DD/MM/YYYY') : 'N/A'}`,
    date: s.treatmentDate as string,
    detail: s,
  })),
  serviceOrders: (rawData.serviceOrders || []).map((o) => ({
    id: o.id as string,
    title: (o.serviceName as string) || (o.testName as string) || `Chỉ định #${o.id}`,
    date: (o.orderDate as string) || (o.createdAt as string),
    status: o.status as number,
    detail: o,
  })),
  serviceResults: (rawData.labResults || rawData.serviceResults || []).map((r) => ({
    id: r.id as string,
    title: (r.testName as string) || (r.serviceName as string) || `Kết quả #${r.id}`,
    date: (r.resultDate as string) || (r.completedAt as string),
    detail: r,
  })),
  treatmentOrders: (rawData.prescriptions || []).map((p) => ({
    id: p.id as string,
    title: `Đơn thuốc ${p.prescriptionDate ? dayjs(p.prescriptionDate as string).format('DD/MM/YYYY') : ''}`,
    date: (p.prescriptionDate as string) || (p.createdAt as string),
    detail: p,
  })),
  nursingCareSheets: (rawData.nursingCareSheets || []).map((n) => ({
    id: n.id as string,
    title: `Chăm sóc ${n.date ? dayjs(n.date as string).format('DD/MM/YYYY') : ''} ${n.shift || ''}`,
    date: n.date as string,
    detail: n,
  })),
  vitalSignsRecords: rawData.vitalSigns ? [{
    id: 'vs-1',
    title: `Sinh hiệu ${rawData.vitalSigns.measuredAt ? dayjs(rawData.vitalSigns.measuredAt as string).format('DD/MM/YYYY HH:mm') : ''}`,
    date: rawData.vitalSigns.measuredAt as string,
    detail: rawData.vitalSigns,
  }] : [],
  infusionRecords: (rawData.infusionRecords || []).map((inf) => ({
    id: inf.id as string,
    title: `Truyền dịch ${inf.startTime ? dayjs(inf.startTime as string).format('DD/MM/YYYY HH:mm') : ''}`,
    date: inf.startTime as string,
    detail: inf,
  })),
  bloodTransfusionRecords: (rawData.bloodTransfusionRecords || []).map((bt) => ({
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
  surgeryRecords: (rawData.surgeryRecords || []).map((s) => ({
    id: s.id as string,
    title: `Phẫu thuật ${s.surgeryName || ''} ${s.surgeryDate ? dayjs(s.surgeryDate as string).format('DD/MM/YYYY') : ''}`,
    date: s.surgeryDate as string,
    detail: s,
  })),
  admissionExam: rawData.admissionExam ? [{
    id: 'adm-1',
    title: 'Phiếu khám bệnh vào viện',
    date: rawData.admissionExam.examDate as string,
    detail: rawData.admissionExam,
  }] : [],
});

// ─────────────────── Shared render helpers (port v1) ───────────────────

/** Thông tin bệnh nhân của 1 lượt khám (fields verbatim v1 renderPatientInfo). */
const PatientInfo: React.FC<{ exam: ArchiveExamination }> = ({ exam }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '0 var(--space-14)', padding: '6px 0',
  }}>
    <DrField lbl="Mã bệnh nhân"><span className="mono">{exam.patientCode}</span></DrField>
    <DrField lbl="Họ tên">{exam.patientName}</DrField>
    <DrField lbl="Giới tính">{GENDER_MAP[exam.gender] || '—'}</DrField>
    <DrField lbl="Ngày sinh">
      {exam.dateOfBirth ? dayjs(exam.dateOfBirth).format('DD/MM/YYYY') : '—'}
    </DrField>
    <DrField lbl="Ngày khám">
      {exam.examinationDate ? dayjs(exam.examinationDate).format('DD/MM/YYYY') : '—'}
    </DrField>
    <DrField lbl="Khoa/Phòng">{exam.departmentName || exam.roomName || '—'}</DrField>
    <DrField lbl="Bác sĩ">{exam.doctorName || '—'}</DrField>
    <DrField lbl="Chẩn đoán">
      {exam.diagnosisCode ? `${exam.diagnosisCode} - ` : ''}{exam.diagnosisName || '—'}
    </DrField>
  </div>
);

const MedicalRecordArchiveV2: React.FC = () => {
  const [tab, setTab] = useState<PageTab>('archive');

  // ══════════════ TAB LƯU TRỮ & TRA CỨU (v2 gốc — giữ nguyên) ══════════════
  const [items, setItems] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<ArchiveStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<ArchivedRecord | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveForm] = Form.useForm<{ medicalRecordId: string; storageLocation?: string }>();

  // F8.5 — duyệt lưu trữ 2 cấp (buồng bệnh → KHTH)
  const [approval, setApproval] = useState<ArchiveApprovalStatusDto | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const loadApproval = async (recordId: string) => {
    setApproval(null);
    setApproval(await getArchiveApproval(recordId));
  };
  useEffect(() => {
    if (sel?.medicalRecordId) loadApproval(sel.medicalRecordId);
    else setApproval(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.medicalRecordId]);
  const doDeptApprove = async () => {
    if (!sel?.medicalRecordId) return;
    setApprovalBusy(true);
    const r = await deptApproveRecord(sel.medicalRecordId);
    setApprovalBusy(false);
    if (r?.success) { tk(r.message || 'Đã duyệt cấp 1'); loadApproval(sel.medicalRecordId); }
    else tw(r?.message || 'Duyệt cấp 1 thất bại');
  };
  const doFinalize = async () => {
    if (!sel?.medicalRecordId) return;
    setApprovalBusy(true);
    const r = await finalizeRecord(sel.medicalRecordId);
    setApprovalBusy(false);
    if (r?.success) { tk(r.message || 'Đã lưu trữ (KHTH)'); loadApproval(sel.medicalRecordId); }
    else tw(r?.message || 'Lưu trữ thất bại');
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getArchiveList({ pageSize: 200 });
      // BE trả PagedArchiveResult: { totalCount, items: ArchiveDto[] }
      // interceptor đã unwrap envelope → res là PagedArchiveResult trực tiếp
      const raw = res.data as { totalCount?: number; items?: unknown[] } | unknown[];
      const list: unknown[] = Array.isArray(raw)
        ? raw
        : ((raw as { items?: unknown[] })?.items ?? []);

      interface RawDto {
        id?: string; archiveCode?: string;
        patientCode?: string; patientName?: string;
        medicalRecordCode?: string; medicalRecordId?: string;
        archivedDate?: string; createdAt?: string;
        departmentName?: string; dischargeDate?: string;
        storageLocation?: string; shelfNumber?: string; boxNumber?: string;
        status?: number; statusName?: string;
        archiveYear?: number; borrowCount?: number;
      }

      const rows: ArchivedRecord[] = (list as RawDto[]).map((r, i) => ({
        id: r.id || `r-${i}`,
        archiveCode: r.archiveCode || '',
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        medicalRecordCode: r.medicalRecordCode || '',
        medicalRecordId: r.medicalRecordId || '',
        archiveDate: r.archivedDate || r.createdAt || '',
        departmentName: r.departmentName,
        dischargeDate: r.dischargeDate,
        storageLocation: r.storageLocation,
        shelfNumber: r.shelfNumber,
        boxNumber: r.boxNumber,
        status: r.status ?? 0,
        statusName: r.statusName || '',
        archiveYear: r.archiveYear ?? 0,
        borrowCount: r.borrowCount ?? 0,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ lưu trữ'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.archived = items.filter((r) => r.status === 1).length;
    c.pending  = items.filter((r) => r.status !== 1).length;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'archived' && r.status !== 1) return false;
      if (stab === 'pending'  && r.status === 1) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.medicalRecordCode, r.archiveCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const archivedCount = counts.archived ?? 0;
  const pendingCount  = counts.pending  ?? 0;
  const borrowedCount = items.reduce((s, r) => s + r.borrowCount, 0);

  const cols: ColumnDef<ArchivedRecord>[] = [
    { key: 'code', label: 'Mã lưu trữ', code: true, render: (r) => r.archiveCode || '—' },
    { key: 'mrc',  label: 'Mã HSBA',    code: true, render: (r) => r.medicalRecordCode || '—' },
    { key: 'pat',  label: 'Bệnh nhân',  render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'date', label: 'Ngày lưu', mono: true,
      render: (r) => r.archiveDate ? dayjs(r.archiveDate).format('DD/MM/YYYY') : '—' },
    { key: 'year', label: 'Năm', mono: true, width: 70,
      render: (r) => r.archiveYear || '—' },
    { key: 'st',   label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={r.status === 1 ? 'ok' : 'warn'} dot>
        {r.status === 1 ? 'Đã lưu trữ' : (r.statusName || 'Chờ xử lý')}
      </StatusBadge>
    ) },
  ];

  const actions = (r: ArchivedRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Tải xuống / In HSBA" onClick={() => {
        if (!r.medicalRecordId) { tw('Không có MedicalRecordId để in'); return; }
        pdfApi.printMedicalRecord(r.medicalRecordId);
        tk(`Đang mở HSBA · ${r.medicalRecordCode || r.archiveCode}`);
      }} />
    </div>
  );

  const handleArchiveNow = async () => {
    setArchiving(true);
    try {
      const vals = await archiveForm.validateFields();
      await createArchive({
        medicalRecordId: vals.medicalRecordId.trim(),
        storageLocation: vals.storageLocation?.trim() || undefined,
      });
      tk('Đã lưu trữ hồ sơ thành công');
      setArchiveOpen(false);
      archiveForm.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return; // form validation error — không toast
      tw('Lưu trữ thất bại — kiểm tra MedicalRecordId và quyền truy cập');
    } finally {
      setArchiving(false);
    }
  };

  // ══════════════ TAB TỔNG HỢP HỒ SƠ BA (port v1 tab 1) ══════════════
  const [summaryKeyword, setSummaryKeyword] = useState('');
  const [summaryExams, setSummaryExams] = useState<ArchiveExamination[]>([]);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [summaryPage0, setSummaryPage0] = useState(0); // 0-based cho Pager
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [selectedExam, setSelectedExam] = useState<ArchiveExamination | null>(null);
  const [recordTree, setRecordTree] = useState<DataNode[]>([]);
  const [recordTreeRaw, setRecordTreeRaw] = useState<MedicalRecordTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('');
  const [detailContent, setDetailContent] = useState<Record<string, unknown> | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');

  // Body request verbatim v1: { keyword, status: '', pageIndex (1-based), pageSize }
  const searchSummaryExams = async (page = 1) => {
    setSummaryLoading(true);
    try {
      const res = await searchExaminations({
        keyword: summaryKeyword || '',
        status: '',
        pageIndex: page,
        pageSize: PER,
      });
      const data = res.data as unknown as { items?: ArchiveExamination[]; totalCount?: number };
      setSummaryExams(data.items || []);
      setSummaryTotal(data.totalCount || 0);
      setSummaryPage0(page - 1);
    } catch {
      tw('Không thể tải danh sách hồ sơ');
      setSummaryExams([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadRecordTree = async (examId: string) => {
    setTreeLoading(true);
    try {
      const res = await getMedicalRecordFull(examId);
      const rawData = res.data as unknown as FullRecordLoose;
      const tree = mapFullRecordToTree(rawData);
      setRecordTreeRaw(tree);
      setRecordTree(buildTreeData(tree));
    } catch {
      tw('Không thể tải hồ sơ bệnh án');
      setRecordTree([]);
      setRecordTreeRaw(null);
    } finally {
      setTreeLoading(false);
    }
  };

  // v1: mỗi lần vào tab Tổng hợp → tìm lại trang 1
  useEffect(() => {
    if (tab === 'summary') searchSummaryExams(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ══════════════ TAB SOÁT HSBA TRƯỚC BÀN GIAO (port v1 tab 2) ══════════════
  const [reviewKeyword, setReviewKeyword] = useState('');
  const [reviewExam, setReviewExam] = useState<ArchiveExamination | null>(null);
  const [reviewTree, setReviewTree] = useState<DataNode[]>([]);
  const [reviewTreeRaw, setReviewTreeRaw] = useState<MedicalRecordTree | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const searchReviewRecord = async () => {
    if (!reviewKeyword.trim()) {
      tw('Vui lòng nhập mã khám chữa bệnh');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await searchExaminations({
        keyword: reviewKeyword.trim(),
        status: '',
        pageIndex: 1,
        pageSize: 1,
      });
      const data = res.data as unknown as { items?: ArchiveExamination[] };
      const found = data.items || [];
      if (found.length === 0) {
        tw('Không tìm thấy hồ sơ bệnh án');
        setReviewExam(null);
        setReviewTree([]);
        setReviewTreeRaw(null);
        return;
      }
      const exam = found[0];
      setReviewExam(exam);

      // Load full record for tree
      const fullRes = await getMedicalRecordFull(exam.id);
      const rawData = fullRes.data as unknown as FullRecordLoose;
      const tree = mapFullRecordToTree(rawData);
      setReviewTreeRaw(tree);
      setReviewTree(buildTreeData(tree));
    } catch {
      tw('Không thể tìm hồ sơ bệnh án');
      setReviewExam(null);
      setReviewTree([]);
      setReviewTreeRaw(null);
    } finally {
      setReviewLoading(false);
    }
  };

  // ══════════════ Xuất PDF (print window — HTML verbatim v1) ══════════════
  const handleExportPdf = async (examId: string) => {
    try {
      const res = await getMedicalRecordFull(examId);
      const data = res.data as unknown as FullRecordLoose;

      // Open print window with full medical record
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        tw('Trình duyệt chặn popup, vui lòng cho phép popup');
        return;
      }

      const patientInfo = data.patient || {};
      const diagnoses = data.diagnoses || [];
      const vitalSigns = (data.vitalSigns || {}) as LooseRecord;
      const interview = (data.interview || {}) as LooseRecord;

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
          <div class="field"><span class="label">Giới tính:</span> ${GENDER_MAP[patientInfo.gender as number] || ''}</div>
          <div class="field"><span class="label">Ngày sinh:</span> ${patientInfo.dateOfBirth ? dayjs(patientInfo.dateOfBirth).format('DD/MM/YYYY') : ''}</div>
          <div class="field"><span class="label">Địa chỉ:</span> ${patientInfo.address || ''}</div>
          <div class="field"><span class="label">SĐT:</span> ${patientInfo.phoneNumber || ''}</div>
        </div>
        <h2>Chẩn đoán</h2>
        <div class="section">
          ${diagnoses.map((d) => `<div class="field">${d.icdCode || ''} - ${d.icdName || d.diagnosisName || ''}</div>`).join('')}
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
      tw('Không thể xuất PDF hồ sơ bệnh án');
    }
  };

  // ══════════════ Tree select -> drawer chi tiết (verbatim v1) ══════════════
  const handleTreeSelect = (selectedKeys: React.Key[], rawData: MedicalRecordTree | null) => {
    if (selectedKeys.length === 0 || !rawData) return;
    const key = selectedKeys[0] as string;
    setSelectedNodeKey(key);

    const { detail, title } = findTreeItemDetail(key, rawData);
    if (detail) {
      setDetailContent(detail);
      setDetailTitle(title);
      setDetailDrawerOpen(true);
    }
  };

  // Render generic key/value/objects/arrays (logic lọc verbatim v1 renderDetailContent)
  const renderDetailContent = () => {
    if (!detailContent) {
      return <EmptyState message="Không có dữ liệu chi tiết" icon="info" />;
    }

    const entries = Object.entries(detailContent).filter(
      ([k]) => !['id', 'detail'].includes(k) && typeof detailContent[k] !== 'object',
    );
    const objectEntries = Object.entries(detailContent).filter(
      ([k]) => typeof detailContent[k] === 'object' && detailContent[k] !== null && !Array.isArray(detailContent[k]),
    );
    const arrayEntries = Object.entries(detailContent).filter(
      ([k]) => Array.isArray(detailContent[k]),
    );

    const renderArrayTable = (arr: Record<string, unknown>[]) => {
      const colKeys = Object.keys(arr[0]).filter((k) => typeof arr[0][k] !== 'object');
      return (
        <div className="ab-tbl-wrap" style={{ overflowX: 'auto' }}>
          <table className="ab-tbl">
            <thead>
              <tr>{colKeys.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {arr.map((item, i) => (
                <tr key={i}>
                  {colKeys.map((c) => <td key={c}>{String(item[c] ?? '-')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <>
        {entries.length > 0 && (
          <DrSec title="Thông tin">
            {entries.map(([key, value]) => (
              <DrField key={key} lbl={key}>{String(value ?? '-')}</DrField>
            ))}
          </DrSec>
        )}
        {objectEntries.map(([key, value]) => (
          <DrSec key={key} title={key}>
            {Object.entries(value as Record<string, unknown>)
              .filter(([, v]) => typeof v !== 'object')
              .map(([k, v]) => (
                <DrField key={k} lbl={k}>{String(v ?? '-')}</DrField>
              ))}
          </DrSec>
        ))}
        {arrayEntries.map(([key, value]) => {
          const arr = value as Record<string, unknown>[];
          if (arr.length === 0) return null;
          return (
            <DrSec key={key} title={`${key} (${arr.length})`}>
              {renderArrayTable(arr)}
            </DrSec>
          );
        })}
      </>
    );
  };

  // Cột bảng Tổng hợp (columns verbatim v1 summaryColumns)
  const examCols: ColumnDef<ArchiveExamination>[] = [
    { key: 'patientCode', label: 'Mã BN', code: true, render: (r) => r.patientCode },
    { key: 'patientName', label: 'Họ tên', render: (r) => (
      <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</span>
    ) },
    { key: 'examDate', label: 'Ngày khám', mono: true,
      render: (r) => r.examinationDate ? dayjs(r.examinationDate).format('DD/MM/YYYY') : '—' },
    { key: 'room', label: 'Khoa/Phòng', render: (r) => r.departmentName || r.roomName || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <span title={`${r.diagnosisCode || ''} ${r.diagnosisName || ''}`}>
        {r.diagnosisCode ? `${r.diagnosisCode} - ` : ''}{r.diagnosisName || '—'}
      </span>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={EXAM_STATUS_TONES[r.status] ?? 'info'} dot>
        {r.statusName || EXAM_STATUS_NAMES[r.status] || `Status ${r.status}`}
      </StatusBadge>
    ) },
  ];

  const examActions = (r: ArchiveExamination) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem hồ sơ" onClick={() => {
        setSelectedExam(r);
        loadRecordTree(r.id);
      }} />
      <ActBtn ic="print" title="Xuất PDF" onClick={() => handleExportPdf(r.id)} />
    </div>
  );

  const summaryTotalPages = Math.max(1, Math.ceil(summaryTotal / PER));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: items.length, sub: 'đã nhập hệ thống' },
        { lbl: 'Đã lưu trữ', val: archivedCount,
          sub: `${Math.round((archivedCount / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Chờ xử lý',  val: pendingCount, sub: 'cần lưu trữ', tone: 'warn' },
        { lbl: 'Lượt mượn',  val: borrowedCount, sub: 'tổng cộng', tone: 'info' },
      ]} />

      <TopTabs<PageTab> tab={tab} setTab={setTab} tabs={PAGE_TABS} />

      {/* ══════════════ TAB LƯU TRỮ & TRA CỨU (v2 gốc) ══════════════ */}
      {tab === 'archive' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm BN / mã HSBA / mã lưu trữ…" />
          <Btn variant="ghost" onClick={() => { setSearch(''); setStab('all'); setPage(0); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
          <span className="spacer" />
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          <Btn variant="primary" onClick={() => { archiveForm.resetFields(); setArchiveOpen(true); }}>
            <Ico name="archive" size={12} /> Lưu trữ ngay
          </Btn>
        </div>

        <StatusTabs<ArchiveStatus>
          value={stab}
          onChange={(v) => { setStab(v); setPage(0); }}
          tabs={STATUS_TABS}
          counts={counts}
        />

        <DataTable<ArchivedRecord>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ lưu trữ'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {/* ══════════════ TAB TỔNG HỢP HỒ SƠ BA (port v1) ══════════════ */}
      {tab === 'summary' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={summaryKeyword} onChange={setSummaryKeyword}
            placeholder="Tìm theo tên, mã bệnh nhân, mã hồ sơ…" />
          <Btn variant="primary" onClick={() => searchSummaryExams(1)}>
            <Ico name="search" size={12} /> Tìm kiếm
          </Btn>
          <span className="spacer" />
          <Btn variant="ghost" onClick={() => searchSummaryExams(summaryPage0 + 1)}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-14)', alignItems: 'flex-start' }}>
          {/* Trái: kết quả tìm kiếm */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <DataTable<ArchiveExamination>
              columns={examCols} data={summaryExams} rowKey={(r) => r.id}
              onRowClick={(r) => { setSelectedExam(r); loadRecordTree(r.id); }}
              actions={examActions}
              empty={summaryLoading ? 'Đang tải…' : 'Không có hồ sơ'}
            />
            <Pager
              page={summaryPage0}
              setPage={(next) => {
                const p = typeof next === 'function' ? next(summaryPage0) : next;
                searchSummaryExams(p + 1);
              }}
              totalPages={summaryTotalPages}
              total={summaryTotal}
              perPage={PER}
            />
          </div>

          {/* Phải: cây hồ sơ bệnh án */}
          {selectedExam && (
            <div style={{
              flex: '0 0 44%', border: '1px solid var(--line)', borderRadius: 4,
              background: 'var(--d-1)', padding: 'var(--space-14)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                <Ico name="folder" size={14} />
                <span style={{ fontWeight: 600, color: 'var(--t-0)', flex: 1 }}>
                  Hồ sơ bệnh án: {selectedExam.patientName}
                </span>
                <Btn variant="ghost" onClick={() => handleExportPdf(selectedExam.id)}>
                  <Ico name="print" size={12} /> Xuất PDF
                </Btn>
                <Btn variant="ghost" onClick={() => {
                  setSelectedExam(null);
                  setRecordTree([]);
                  setRecordTreeRaw(null);
                }}>
                  <Ico name="x" size={12} /> Đóng
                </Btn>
              </div>

              <PatientInfo exam={selectedExam} />

              {treeLoading ? (
                <EmptyState message="Đang tải hồ sơ…" icon="refresh" />
              ) : recordTree.length > 0 ? (
                <Tree
                  defaultExpandAll
                  treeData={recordTree}
                  selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
                  onSelect={(keys) => handleTreeSelect(keys, recordTreeRaw)}
                  style={{ minHeight: 200 }}
                />
              ) : (
                <EmptyState
                  message="Chọn hồ sơ để xem cây cấu trúc — click vào bệnh nhân trong danh sách bên trái"
                  icon="folder"
                />
              )}
            </div>
          )}
        </div>
      </>}

      {/* ══════════════ TAB SOÁT HSBA TRƯỚC BÀN GIAO (port v1) ══════════════ */}
      {tab === 'review' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={reviewKeyword} onChange={setReviewKeyword}
            placeholder="Nhập mã khám chữa bệnh (mã hồ sơ)" />
          <Btn variant="primary" onClick={searchReviewRecord}>
            <Ico name="search" size={12} /> Tìm kiếm
          </Btn>
          <span className="spacer" />
        </div>

        {reviewLoading ? (
          <EmptyState message="Đang tìm hồ sơ…" icon="refresh" />
        ) : reviewExam ? (
          <div style={{ padding: 'var(--space-14)' }}>
            <PatientInfo exam={reviewExam} />

            <div style={{
              border: '1px solid var(--line)', borderRadius: 4,
              background: 'var(--d-1)', padding: 'var(--space-14)', marginTop: 'var(--space-10)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
                <Ico name="check" size={14} />
                <span style={{ fontWeight: 600, color: 'var(--t-0)', flex: 1 }}>
                  Soát hồ sơ bệnh án trước bàn giao
                </span>
                <Btn variant="primary" onClick={() => reviewExam && handleExportPdf(reviewExam.id)}>
                  <Ico name="print" size={12} /> Xuất PDF toàn bộ
                </Btn>
              </div>

              {reviewTree.length > 0 ? (
                <Tree
                  defaultExpandAll
                  treeData={reviewTree}
                  onSelect={(keys) => handleTreeSelect(keys, reviewTreeRaw)}
                  style={{ minHeight: 200 }}
                />
              ) : (
                <EmptyState message="Không có dữ liệu hồ sơ" icon="folder" />
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            message="Soát hồ sơ trước bàn giao — nhập mã khám chữa bệnh để tìm và soát hồ sơ bệnh án trước khi bàn giao cho phòng lưu trữ"
            icon="check"
          />
        )}
      </>}

      {/* Modal Lưu trữ ngay */}
      <ModalShell
        open={archiveOpen}
        onClose={() => { setArchiveOpen(false); archiveForm.resetFields(); }}
        title="Lưu trữ hồ sơ ngay"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => { setArchiveOpen(false); archiveForm.resetFields(); }}>Hủy</Btn>
          <Btn variant="primary" onClick={handleArchiveNow} loading={archiving}>
            <Ico name="archive" size={12} /> Xác nhận lưu trữ
          </Btn>
        </>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: 'var(--space-10)', marginBottom: 'var(--space-14)', background: 'var(--d-1)',
            border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-sm)', color: 'var(--t-2)',
          }}>
            Lưu trữ ngay hồ sơ bệnh án đã hoàn thành. Hệ thống sẽ kiểm tra điều kiện và tạo bản lưu trữ.
          </div>
          <Form form={archiveForm} layout="vertical">
            <Form.Item
              name="medicalRecordId"
              label="ID hồ sơ bệnh án (MedicalRecordId)"
              rules={[{ required: true, message: 'Nhập ID hồ sơ cần lưu trữ' }]}
            >
              <Input placeholder="VD: 3fa85f64-5717-4562-b3fc-2c963f66afa6" style={{ fontFamily: 'var(--font-mono)' }} />
            </Form.Item>
            <Form.Item name="storageLocation" label="Vị trí lưu trữ (tuỳ chọn)">
              <Input placeholder="VD: Kho A / Tầng 2" />
            </Form.Item>
          </Form>
        </div>
      </ModalShell>

      {/* Drawer chi tiết bản lưu trữ */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Hồ sơ · ${sel.archiveCode || sel.medicalRecordCode}` : ''}
        sub={sel?.patientName ?? ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => {
            if (!sel?.medicalRecordId) { tw('Không có MedicalRecordId để tải'); return; }
            pdfApi.printMedicalRecord(sel.medicalRecordId);
            tk(`Đang mở HSBA · ${sel.medicalRecordCode || sel.archiveCode}`);
          }}>
            <Ico name="download" size={12} /> Tải xuống
          </Btn>
          <Btn variant="primary" onClick={() => {
            if (!sel?.medicalRecordId) { tw('Không có MedicalRecordId để in'); return; }
            pdfApi.printMedicalRecord(sel.medicalRecordId);
            tk(`Đang mở in HSBA · ${sel.medicalRecordCode || sel.archiveCode}`);
          }}>
            <Ico name="print" size={12} /> In HSBA
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Ngày ra viện">
              {sel.dischargeDate ? dayjs(sel.dischargeDate).format('DD/MM/YYYY') : '—'}
            </DrField>
          </DrSec>
          <DrSec title="Lưu trữ">
            <DrField lbl="Mã lưu trữ"><span className="mono">{sel.archiveCode || '—'}</span></DrField>
            <DrField lbl="Mã HSBA"><span className="mono">{sel.medicalRecordCode || '—'}</span></DrField>
            <DrField lbl="Năm lưu">{sel.archiveYear || '—'}</DrField>
            <DrField lbl="Ngày lưu">
              {sel.archiveDate ? dayjs(sel.archiveDate).format('DD/MM/YYYY HH:mm') : '—'}
            </DrField>
            {sel.storageLocation && <DrField lbl="Vị trí">{sel.storageLocation}</DrField>}
            {sel.shelfNumber    && <DrField lbl="Kệ số">{sel.shelfNumber}</DrField>}
            {sel.boxNumber      && <DrField lbl="Hộp số">{sel.boxNumber}</DrField>}
            <DrField lbl="Lượt mượn">{sel.borrowCount}</DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={sel.status === 1 ? 'ok' : 'warn'} dot>
                {sel.status === 1 ? 'Đã lưu trữ' : (sel.statusName || 'Chờ xử lý')}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Duyệt lưu trữ 2 cấp (buồng bệnh → KHTH)">
            <DrField lbl="Cấp 1 — Khoa">
              {approval?.deptApproved
                ? <StatusBadge tone="ok" dot>Đã duyệt{approval.deptApprovedByName ? ` · ${approval.deptApprovedByName}` : ''}{approval.deptApprovedAt ? ` · ${dayjs(approval.deptApprovedAt).format('DD/MM/YYYY')}` : ''}</StatusBadge>
                : <StatusBadge tone="warn" dot>Chưa duyệt</StatusBadge>}
            </DrField>
            <DrField lbl="Cấp 2 — KHTH">
              {approval?.finalized
                ? <StatusBadge tone="ok" dot>Đã lưu trữ{approval.finalizedByName ? ` · ${approval.finalizedByName}` : ''}{approval.finalizedAt ? ` · ${dayjs(approval.finalizedAt).format('DD/MM/YYYY')}` : ''}</StatusBadge>
                : <StatusBadge tone="warn" dot>Chưa lưu trữ</StatusBadge>}
            </DrField>
            <DrField lbl="Nộp muộn">
              {approval == null ? '—'
                : approval.lateDays > 0
                  ? <StatusBadge tone="crit" dot>Muộn {approval.lateDays} ngày (hạn {approval.deadlineDays} ngày)</StatusBadge>
                  : <StatusBadge tone="ok" dot>Đúng hạn{approval.daysSinceDischarge != null ? ` · ${approval.daysSinceDischarge} ngày` : ''}</StatusBadge>}
            </DrField>
            <div style={{ display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-8)' }}>
              <Btn variant="primary" disabled={approvalBusy || !!approval?.deptApproved || !!approval?.finalized} onClick={doDeptApprove}>Duyệt cấp 1 (Khoa)</Btn>
              <Btn variant="ok" disabled={approvalBusy || !approval?.deptApproved || !!approval?.finalized} onClick={doFinalize}>Duyệt lưu trữ (KHTH)</Btn>
            </div>
          </DrSec>
        </>}
      </DrawerShell>

      {/* Drawer chi tiết node trong cây hồ sơ (dùng chung tab Tổng hợp + Soát) */}
      <DrawerShell
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setDetailContent(null);
          setDetailTitle('');
        }}
        size="xl"
        title={detailTitle || 'Chi tiết'}
      >
        {renderDetailContent()}
      </DrawerShell>
    </div>
  );
};

export default MedicalRecordArchiveV2;
