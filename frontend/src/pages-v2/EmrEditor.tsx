/* =====================================================================
 * EmrEditor v2 — full-screen hồ sơ bệnh án (native v2, ab-* design)
 * Ported from design-system bundle mod-emr-editor-v2.jsx.
 * 2-col: HSBA list (trái) · detail w/ 7 tabs (phải).
 * Mostly a viewer wired to real read APIs (examinationApi): getEmrRecords,
 * getPatientMedicalHistory, getMedicalRecordFull, getTreatmentSheets,
 * getConsultationRecords, getNursingCareSheets, getPatientAllergies.
 * No backend change. Replaces the v1 navigate('/emr') jump.
 * ===================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KpiStrip, StatusBadge, Btn, ActBtn, DataTable, TopTabs, DrawerShell, ModalShell,
  fmtDMYg, fmtDTg, tk, ti, te, tw, type ColumnDef, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import apiClient from '../api/client';
import { generateCdaDocument } from '../api/cda';
import {
  getAttachments, uploadAttachment, downloadAttachment, deleteAttachment,
  getCompletenessCheck,
  type EmrDocumentAttachmentDto,
} from '../api/emrAdmin';
import EmrSigningChainDrawer from './shared/EmrSigningChainDrawer';
import {
  getEmrRecords, type EmrRecordDto,
  getPatientMedicalHistory, type MedicalHistoryDto,
  getMedicalRecordFull, type MedicalRecordFullDto,
  getTreatmentSheets, createTreatmentSheet, type TreatmentSheetDto,
  getConsultationRecords, createConsultationRecord, type ConsultationRecordDto,
  getNursingCareSheets, createNursingCareSheet, type NursingCareSheetDto,
  type CreateMaternityLeaveDto,
} from '../api/examination';
import { printTreatmentSheet as printInpatientTreatmentSheet } from '../api/inpatient';
import PrintTemplateRenderer from '../components/PrintTemplateRenderer';
import ClinicalTemplatePicker from '../components/ClinicalTemplatePicker';
import { TEMPLATE_TYPES } from '../api/clinicalTemplate';
import '../layouts/terminal/ed-responsive.css';

type TabKey = 'record' | 'history' | 'treatment' | 'consult' | 'nursing' | 'reaction' | 'partograph' | 'attach';
const TABS: TopTab<TabKey>[] = [
  { v: 'record', l: 'Hồ sơ BA', ic: 'folder' },
  { v: 'history', l: 'Lịch sử khám', ic: 'clock' },
  { v: 'treatment', l: 'Phiếu điều trị', ic: 'pill' },
  { v: 'consult', l: 'Hội chẩn', ic: 'user' },
  { v: 'nursing', l: 'Chăm sóc ĐD', ic: 'heart' },
  { v: 'reaction', l: 'Phản ứng thuốc', ic: 'alert' },
  { v: 'partograph', l: 'Biểu đồ chuyển dạ', ic: 'activity' },
  { v: 'attach', l: 'Đính kèm', ic: 'file-text' },
];

// Doc file -> base64 (bo phan prefix "data:...;base64,")
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const res = reader.result as string;
    const comma = res.indexOf(',');
    resolve(comma >= 0 ? res.slice(comma + 1) : res);
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const fmtSize = (n: number) =>
  n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';

const ATTACH_CATS = [
  { v: 'XN', l: 'Xét nghiệm' }, { v: 'CDHA', l: 'Chẩn đoán hình ảnh' },
  { v: 'BenhAn', l: 'Bệnh án' }, { v: 'GiayTo', l: 'Giấy tờ' }, { v: 'Khac', l: 'Khác' },
];

const PRINT_FORMS: { label: string; printType: string }[] = [
  { label: 'MS-01 · Tóm tắt bệnh án ra viện',  printType: 'summary' },
  { label: 'MS-02 · Bệnh án tổng quát',          printType: 'finalsummary' },
  { label: 'MS-03 · Phiếu điều trị',             printType: 'treatment' },
  { label: 'MS-04 · Phiếu chăm sóc ĐD',         printType: 'nursing' },
  { label: 'DD-01 · Phiếu công khai DV-Thuốc',  printType: 'dd09-meddisclosure' },
  { label: 'BHYT-01 · Tổng hợp thanh toán',      printType: 'finalsummary' }, // dùng tổng kết HSBA làm proxy — chưa có template riêng BHYT-01
  { label: 'XN-01 · Giấy xác nhận đang điều trị', printType: 'treatment-confirm' },
  { label: 'CT-01 · Giấy chứng nhận thương tích', printType: 'injury-cert' },
  { label: 'SAN-01 · Giấy nghỉ dưỡng thai',       printType: 'maternity-leave' },
];

const EmrEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectDone = useRef(false); // chỉ auto-chọn 1 lần theo ?patientId=
  const [leftOpen, setLeftOpen] = useState(false);

  const [records, setRecords] = useState<EmrRecordDto[]>([]);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<EmrRecordDto | null>(null);
  const [tab, setTab] = useState<TabKey>('record');

  const [examId, setExamId] = useState<string | null>(null);
  const [full, setFull] = useState<MedicalRecordFullDto | null>(null);
  const [timeline, setTimeline] = useState<MedicalHistoryDto[]>([]);
  const [treatments, setTreatments] = useState<TreatmentSheetDto[]>([]);
  const [consults, setConsults] = useState<ConsultationRecordDto[]>([]);
  const [nursing, setNursing] = useState<NursingCareSheetDto[]>([]);
  const [attachments, setAttachments] = useState<EmrDocumentAttachmentDto[]>([]);
  const [attachCat, setAttachCat] = useState('');
  const [attachBusy, setAttachBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [printOpen, setPrintOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewType, setPrintPreviewType] = useState('summary');
  const printPreviewRef = useRef<HTMLDivElement>(null);
  // Maternity leave form input state
  const [maternityLeaveDto, setMaternityLeaveDto] = useState<CreateMaternityLeaveDto | undefined>(undefined);
  const [maternityLeaveModalOpen, setMaternityLeaveModalOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  // Trình ký nhiều cấp + trạng thái khóa TT46 (plan-emr-signing-chain)
  const [chainOpen, setChainOpen] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [modal, setModal] = useState<null | 'treatment' | 'consult' | 'nursing'>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tplPickerOpen, setTplPickerOpen] = useState(false);
  const [printingTreatId, setPrintingTreatId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  // Multi-select in tờ điều trị
  const [selectedTreatIds, setSelectedTreatIds] = useState<Set<string>>(new Set());
  const [printingAllTreat, setPrintingAllTreat] = useState(false);

  const openCreate = (kind: 'treatment' | 'consult' | 'nursing') => {
    if (!examId) { tw('Chưa có lần khám để thêm phiếu'); return; }
    setForm({ date: new Date().toISOString().slice(0, 10) });
    setModal(kind);
  };
  const fld = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /** Mở preview biểu mẫu in trong DrawerShell */
  const openPrintForm = (printType: string) => {
    if (!full) { tw('Chọn bệnh nhân và tải đủ dữ liệu HSBA trước khi in'); return; }
    if (printType === 'maternity-leave') {
      // Cần nhập thêm thông tin dưỡng thai trước khi xem trước
      setMaternityLeaveDto({
        days: 0,
        fromDate: new Date().toISOString().slice(0, 10),
        toDate: new Date().toISOString().slice(0, 10),
        gestationalWeeks: undefined,
        reason: '',
      });
      setMaternityLeaveModalOpen(true);
      return;
    }
    setPrintPreviewType(printType);
    setPrintPreviewOpen(true);
  };

  /** Kích window.print() — chỉ in vùng có class emr-print-container */
  const handleDoPrint = () => {
    window.print();
  };

  // ── Load EMR list ────────────────────────────────────────────────
  const loadList = useCallback(async (kw?: string) => {
    try {
      const r = await getEmrRecords(kw || undefined, 1, 300);
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setRecords([]); }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  // ── Select patient → derive latest exam + load detail ───────────
  const selectRecord = useCallback(async (rec: EmrRecordDto) => {
    setSel(rec);
    setLeftOpen(false);
    setTab('record');
    setFull(null); setExamId(null); setTreatments([]); setConsults([]); setNursing([]);
    setAttachments([]);
    let hist: MedicalHistoryDto[] = [];
    try {
      const h = await getPatientMedicalHistory(rec.patientId, 30);
      hist = Array.isArray(h.data) ? h.data : [];
    } catch { /* no history */ }
    setTimeline(hist);
    const id = hist[0]?.examinationId ?? null;
    setExamId(id);
    if (!id) return;
    const [f, t, c, n] = await Promise.allSettled([
      getMedicalRecordFull(id),
      getTreatmentSheets(id),
      getConsultationRecords(id),
      getNursingCareSheets(id),
    ]);
    if (f.status === 'fulfilled' && f.value.data) setFull(f.value.data);
    if (t.status === 'fulfilled' && Array.isArray(t.value.data)) setTreatments(t.value.data);
    if (c.status === 'fulfilled' && Array.isArray(c.value.data)) setConsults(c.value.data);
    if (n.status === 'fulfilled' && Array.isArray(n.value.data)) setNursing(n.value.data);
  }, []);

  // Trạng thái khóa TT46 của HSBA đang chọn (badge 🔒 + drawer trình ký)
  const refreshFinalized = useCallback(async () => {
    if (!full?.id) { setFinalized(false); return; }
    const c = await getCompletenessCheck(full.id);
    setFinalized(!!c?.isFinalized);
  }, [full?.id]);
  useEffect(() => { void refreshFinalized(); }, [refreshFinalized]);

  // Deep-link từ màn khác (vd LIS): /v2/emr/edit?patientId=… → auto mở hồ sơ BN đó
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (!pid || preselectDone.current || records.length === 0) return;
    const rec = records.find((r) => r.patientId === pid);
    if (rec) { preselectDone.current = true; selectRecord(rec); }
  }, [records, searchParams, selectRecord]);

  const downloadBlob = (data: BlobPart, filename: string, mime: string) => {
    const url = window.URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); window.URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!examId) { tw('Chưa chọn HSBA có lần khám'); return; }
    try {
      const resp = await apiClient.get(`/pdf/emr/${examId}?format=pdf`, { responseType: 'blob' });
      downloadBlob(resp.data as BlobPart, `EMR_${sel?.patientCode || examId}.pdf`, 'application/pdf');
      tk('Đã xuất PDF');
    } catch { te('Không thể xuất PDF — dùng In biểu mẫu để lưu'); }
  };

  const exportXml = async () => {
    if (!sel) return;
    try {
      const r = await generateCdaDocument({ documentType: 1, patientId: sel.patientId, medicalRecordId: full?.id });
      const xml = r?.cdaXml;
      if (!xml) { ti('Đã tạo tài liệu CDA (chưa có nội dung XML để tải)'); return; }
      downloadBlob(xml, `CDA_${sel.patientCode}.xml`, 'application/xml');
      tk('Đã xuất CDA XML');
    } catch { te('Không thể xuất XML CDA'); }
  };

  const today = () => new Date().toISOString().slice(0, 10);
  const saveSheet = async () => {
    if (!examId) return;
    setSavingForm(true);
    try {
      if (modal === 'treatment') {
        await createTreatmentSheet({
          id: '', examinationId: examId, treatmentDate: form.date || today(),
          dayNumber: Number(form.dayNumber) || 1, dailyProgress: form.dailyProgress,
          treatmentOrders: form.treatmentOrders, doctorNotes: form.doctorNotes,
          medications: [], doctorId: '',
        });
        const r = await getTreatmentSheets(examId); setTreatments(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'consult') {
        await createConsultationRecord({
          id: '', examinationId: examId, consultationDate: form.date || today(),
          reason: form.reason || '', summary: form.summary || '', conclusion: form.conclusion || '',
          recommendations: form.recommendations || '', consultants: [],
          chairman: form.chairman, secretary: form.secretary,
        });
        const r = await getConsultationRecords(examId); setConsults(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'nursing') {
        await createNursingCareSheet({
          id: '', examinationId: examId, careDate: form.date || today(),
          shift: Number(form.shift) || 1, patientCondition: form.patientCondition,
          nursingAssessment: form.nursingAssessment, nursingInterventions: form.nursingInterventions,
          patientResponse: form.patientResponse, nurseId: '',
          careLevel: form.careLevel ? Number(form.careLevel) : undefined,
        });
        const r = await getNursingCareSheets(examId); setNursing(Array.isArray(r.data) ? r.data : []);
      }
      tk('Đã tạo phiếu'); setModal(null);
    } catch { te('Tạo phiếu thất bại'); }
    finally { setSavingForm(false); }
  };

  // ── Attachments (B3.4 so hoa HSBA — upload bytes vao DB blob) ─────
  const loadAttachments = useCallback(async (recordId: string) => {
    setAttachments(await getAttachments(recordId));
  }, []);
  useEffect(() => {
    if (full?.id) loadAttachments(full.id); else setAttachments([]);
  }, [full?.id, loadAttachments]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phep chon lai cung file
    if (!file) return;
    if (!full?.id) { tw('Chưa chọn HSBA có hồ sơ bệnh án'); return; }
    if (file.size > 10 * 1024 * 1024) { tw('File vượt quá giới hạn 10MB'); return; }
    setAttachBusy(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await uploadAttachment({
        medicalRecordId: full.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        contentBase64,
        documentCategory: attachCat || undefined,
      });
      tk('Đã đính kèm ' + file.name);
      await loadAttachments(full.id);
    } catch (err) {
      const msg = (err as { response?: { data?: unknown } })?.response?.data;
      te(typeof msg === 'string' && msg.trim() ? msg : 'Đính kèm thất bại');
    } finally { setAttachBusy(false); }
  };

  const onDownloadAttach = async (a: EmrDocumentAttachmentDto) => {
    const blob = await downloadAttachment(a.id);
    if (!blob) { te('Không tải được tệp (bản ghi cũ không có nội dung)'); return; }
    downloadBlob(blob, a.fileName, a.fileType || 'application/octet-stream');
  };

  // Xem inline (anh/PDF) trong tab moi qua object URL; loai khac thi tai ve.
  const onViewAttach = async (a: EmrDocumentAttachmentDto) => {
    const blob = await downloadAttachment(a.id);
    if (!blob) { te('Không xem được tệp (bản ghi cũ không có nội dung)'); return; }
    const typed = blob.type ? blob : new Blob([blob], { type: a.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(typed);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const isViewable = (t?: string) => !!t && (t.startsWith('image/') || t === 'application/pdf');

  const onDeleteAttach = async (a: EmrDocumentAttachmentDto) => {
    if (!window.confirm(`Xóa đính kèm "${a.fileName}"?`)) return;
    if (await deleteAttachment(a.id)) { tk('Đã xóa đính kèm'); if (full?.id) loadAttachments(full.id); }
    else te('Xóa đính kèm thất bại');
  };

  const attachCols: ColumnDef<EmrDocumentAttachmentDto>[] = [
    { key: 'name', label: 'Tên tệp', render: (r) => (
      <div className="cell-2l"><b>{r.fileName}</b><i>{r.fileType}{r.hasContent === false ? ' · bản ghi cũ (không có tệp)' : ''}</i></div>
    ) },
    { key: 'cat', label: 'Phân loại', width: 130, render: (r) => ATTACH_CATS.find((c) => c.v === r.documentCategory)?.l || r.documentCategory || '—' },
    { key: 'size', label: 'Dung lượng', mono: true, width: 100, render: (r) => fmtSize(r.fileSize) },
    { key: 'by', label: 'Người tải', width: 140, render: (r) => r.uploadedByName || '—' },
    { key: 'at', label: 'Thời gian', mono: true, width: 150, render: (r) => fmtDTg(r.uploadedAt) },
  ];

  const filtered = records.filter((r) =>
    !search || `${r.patientCode} ${r.patientName} ${r.lastDiagnosisName || ''}`.toLowerCase().includes(search.toLowerCase()));

  const activeCount = records.filter((r) => (r.allergies?.length ?? 0) > 0).length;

  // ── Tab renderers ────────────────────────────────────────────────

  const printTreatSheet = async (id: string) => {
    if (printingTreatId) return;
    setPrintingTreatId(id);
    try {
      const r = await printInpatientTreatmentSheet(id);
      const url = URL.createObjectURL(r.data as Blob);
      const w = window.open(url, '_blank');
      if (w) w.onload = () => URL.revokeObjectURL(url);
      else URL.revokeObjectURL(url);
    } catch {
      te('Không in được tờ điều trị');
    } finally {
      setPrintingTreatId(null);
    }
  };

  // In tuần tự tất cả phiếu đã chọn (mỗi phiếu mở 1 tab mới)
  const printAllSelected = async () => {
    if (selectedTreatIds.size === 0) { tw('Chưa chọn phiếu nào để in'); return; }
    if (printingAllTreat) return;
    setPrintingAllTreat(true);
    const ids = Array.from(selectedTreatIds);
    let failed = 0;
    for (const id of ids) {
      try {
        const r = await printInpatientTreatmentSheet(id);
        const url = URL.createObjectURL(r.data as Blob);
        const w = window.open(url, '_blank');
        if (w) w.onload = () => URL.revokeObjectURL(url);
        else URL.revokeObjectURL(url);
      } catch {
        failed++;
      }
    }
    setPrintingAllTreat(false);
    if (failed > 0) te(`Không in được ${failed}/${ids.length} phiếu`);
    else tk(`Đã mở ${ids.length} phiếu điều trị`);
  };

  const treatCols: ColumnDef<TreatmentSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMYg(r.treatmentDate) },
    { key: 'day', label: 'Ngày thứ', mono: true, width: 80, render: (r) => r.dayNumber },
    { key: 'orders', label: 'Y lệnh / diễn biến', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.treatmentOrders || r.dailyProgress || '—'}</span> },
    { key: 'doctor', label: 'BS điều trị', width: 140, render: (r) => r.doctorName || '—' },
  ];
  const consultCols: ColumnDef<ConsultationRecordDto>[] = [
    { key: 'date', label: 'Thời gian', mono: true, width: 150, render: (r) => fmtDTg(r.consultationDate) },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason },
    { key: 'conclusion', label: 'Kết luận', render: (r) => r.conclusion },
    { key: 'chairman', label: 'Chủ tọa', width: 140, render: (r) => r.chairman || '—' },
  ];
  const nursingCols: ColumnDef<NursingCareSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 150, render: (r) => fmtDTg(r.careDate) },
    { key: 'shift', label: 'Ca', width: 70, render: (r) => (r.shift === 1 ? 'Sáng' : r.shift === 2 ? 'Chiều' : r.shift === 3 ? 'Tối' : `${r.shift}`) },
    { key: 'careLevel', label: 'Cấp CS', width: 90, render: (r) => (r.careLevel === 1 ? 'Cấp 1' : r.careLevel === 2 ? 'Cấp 2' : '—') },
    { key: 'interv', label: 'Can thiệp chăm sóc', render: (r) => r.nursingInterventions || r.patientCondition || '—' },
    { key: 'nurse', label: 'ĐD phụ trách', width: 140, render: (r) => r.nurseName || '—' },
  ];

  const v = full?.vitalSigns;

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'HSBA đang chọn', val: sel?.patientName || '—', sub: sel?.patientCode || '' },
          { lbl: 'Khoa/Phòng', val: sel?.lastRoomName || '—' },
          { lbl: 'Số lần khám', val: sel?.visitCount ?? '—', tone: 'info' },
          { lbl: 'Tổng HSBA', val: records.length, sub: `${activeCount} có dị ứng` },
          { lbl: 'Phiếu điều trị', val: treatments.length, tone: 'ok' },
        ]} />
      </div>

      {/* List */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 'var(--space-10)', borderBottom: '1px solid var(--line)' }}>
          <div className="ab-search ab-u-wfull">
            <TermIcon name="search" size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã BN / tên / chẩn đoán…" />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 && <div style={{ padding: 'var(--space-16)', color: 'var(--t-3)', fontSize: 11.5, textAlign: 'center' }}>Không có hồ sơ</div>}
          {filtered.map((r) => {
            const isSel = r.patientId === sel?.patientId;
            return (
              <div key={r.patientId} onClick={() => selectRecord(r)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)', background: isSel ? 'var(--c-pri-bg, rgba(37,99,235,.12))' : 'transparent', borderLeft: isSel ? '3px solid var(--c-pri, var(--a-cy))' : '3px solid transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{r.patientCode}</span>
                  {r.visitCount > 0 && <StatusBadge tone="info">{r.visitCount} lần</StatusBadge>}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 'var(--space-4)' }}>{r.patientName}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>{r.lastRoomName || '—'} · {r.lastVisit ? fmtDMYg(r.lastVisit) : '—'}</div>
                {r.lastDiagnosisName && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-1)', marginTop: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>{r.lastDiagnosisCode ? `${r.lastDiagnosisCode} · ` : ''}{r.lastDiagnosisName}</div>}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!sel ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--t-3)' }}>
            <div style={{ textAlign: 'center' }}>
              <TermIcon name="folder" size={32} />
              <div style={{ marginTop: 'var(--space-12)', fontWeight: 600, color: 'var(--t-2)' }}>Chọn HSBA ở bảng trái để xem</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  {sel.patientName}
                  {finalized && <StatusBadge tone="crit">🔒 ĐÃ KHÓA (TT46)</StatusBadge>}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{sel.patientCode} · {sel.lastRoomName || '—'} · {sel.lastVisit ? fmtDMYg(sel.lastVisit) : '—'}{full?.medicalRecordCode ? ` · ${full.medicalRecordCode}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <Btn variant="ghost" onClick={exportXml}><TermIcon name="download" size={12} /> XML</Btn>
                <Btn variant="ghost" onClick={exportPdf}><TermIcon name="download" size={12} /> PDF</Btn>
                <Btn variant="ghost" onClick={() => setPrintOpen(true)}><TermIcon name="print" size={12} /> In biểu mẫu</Btn>
                <Btn variant="ghost" onClick={() => setChainOpen(true)}><TermIcon name="send" size={12} /> Trình ký</Btn>
                <Btn variant="primary" onClick={() => setSignOpen(true)}><TermIcon name="check" size={12} /> Ký số</Btn>
              </div>
            </div>

            <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

            <div style={{ overflow: 'auto', flex: 1, padding: 'var(--space-16)' }}>
              {tab === 'record' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-14)' }}>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Thông tin BN</h4>
                    <Field lbl="Họ tên">{full?.patient?.fullName || sel.patientName}</Field>
                    <Field lbl="Mã BN"><span className="mono">{sel.patientCode}</span></Field>
                    <Field lbl="Giới · Tuổi">{sel.gender === 1 ? 'Nam' : 'Nữ'}{sel.age != null ? ` · ${sel.age}T` : ''}</Field>
                    <Field lbl="Khoa/Phòng">{sel.lastRoomName || '—'}</Field>
                    <Field lbl="BHYT"><span className="mono">{sel.insuranceNumber || '—'}</span></Field>
                    {(sel.chronicDiseases?.length ?? 0) > 0 && <Field lbl="Bệnh mạn">{sel.chronicDiseases.join(', ')}</Field>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Sinh hiệu</h4>
                    {v ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-8)', fontSize: 'var(--fs-sm)' }}>
                        {[['Mạch', v.pulse, 'l/p'], ['Nhiệt', v.temperature, '°C'], ['HA', v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : undefined, ''], ['Nhịp thở', v.respiratoryRate, 'l/p'], ['SpO₂', v.spO2, '%'], ['Cân', v.weight, 'kg'], ['Cao', v.height, 'cm'], ['BMI', v.bmi, '']].map((x, i) => (
                          <div key={i} style={{ padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4 }}>
                            <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{x[0] as string}</div>
                            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{x[1] ?? '—'} <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)' }}>{x[2] as string}</span></div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu sinh hiệu</div>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)', gridColumn: '1 / -1' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Bệnh sử · Khám lâm sàng · Chẩn đoán</h4>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {full?.interview?.historyOfPresentIllness && <p><b>Bệnh sử:</b> {full.interview.historyOfPresentIllness}</p>}
                      {full?.physicalExam?.generalAppearance && <p><b>Khám:</b> {full.physicalExam.generalAppearance}</p>}
                      {(full?.diagnoses?.length ?? 0) > 0 && <p><b>Chẩn đoán:</b> {full!.diagnoses.map((d) => `${d.icdCode} · ${d.icdName}${d.isPrimary ? ' (chính)' : ''}`).join('; ')}</p>}
                      {!full?.interview?.historyOfPresentIllness && !full?.physicalExam?.generalAppearance && (full?.diagnoses?.length ?? 0) === 0 && <span className="ab-u-faint">Chưa có nội dung bệnh án</span>}
                    </div>
                  </section>
                </div>
              )}

              {tab === 'history' && (
                <div style={{ position: 'relative', paddingLeft: 30, maxWidth: 900 }}>
                  <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: 'var(--line)' }} />
                  {timeline.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có lịch sử khám</div>}
                  {timeline.map((e, i) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: 'var(--space-18)' }}>
                      <div style={{ position: 'absolute', left: -25, top: 6, width: 12, height: 12, borderRadius: 'var(--r-2)', background: 'var(--s-info)', border: '2px solid var(--d-0)', boxShadow: '0 0 0 3px #0284c733' }} />
                      <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-12)', borderLeft: '3px solid var(--s-info)', cursor: 'pointer' }}
                        onClick={() => navigate(`/v2/opd/edit`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.diagnosisName || e.conclusionTypeName || 'Lần khám'}</span>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{fmtDTg(e.examinationDate)}</span>
                        </div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{e.roomName || ''}{e.doctorName ? ` · ${e.doctorName}` : ''}{e.diagnosisCode ? ` · ${e.diagnosisCode}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'treatment' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)', display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Btn variant="primary" onClick={() => openCreate('treatment')}><TermIcon name="plus" size={12} /> Tạo phiếu điều trị</Btn>
                    {treatments.length > 0 && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedTreatIds.size === treatments.length && treatments.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTreatIds(new Set(treatments.map((t) => t.id)));
                              else setSelectedTreatIds(new Set());
                            }}
                          />
                          Chọn tất cả ({treatments.length})
                        </label>
                        {selectedTreatIds.size > 0 && (
                          <Btn
                            variant="ghost"
                            disabled={printingAllTreat}
                            onClick={() => { void printAllSelected(); }}
                          >
                            <TermIcon name="printer" size={12} />
                            {printingAllTreat ? 'Đang in…' : `In ${selectedTreatIds.size} phiếu`}
                          </Btn>
                        )}
                      </>
                    )}
                  </div>
                  <DataTable<TreatmentSheetDto>
                    columns={treatCols}
                    data={treatments}
                    rowKey={(r) => r.id}
                    empty="Chưa có phiếu điều trị"
                    actions={(r) => (
                      <div className="ab-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                        <input
                          type="checkbox"
                          checked={selectedTreatIds.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selectedTreatIds);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            setSelectedTreatIds(next);
                          }}
                        />
                        <ActBtn
                          ic="printer"
                          title="In tờ điều trị"
                          onClick={() => { void printTreatSheet(r.id); }}
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              {tab === 'consult' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('consult')}><TermIcon name="plus" size={12} /> Đề xuất hội chẩn</Btn></div>
                  <DataTable<ConsultationRecordDto> columns={consultCols} data={consults} rowKey={(r) => r.id} empty="Chưa có biên bản hội chẩn" />
                </div>
              )}

              {tab === 'nursing' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('nursing')}><TermIcon name="plus" size={12} /> Phiếu chăm sóc</Btn></div>
                  <DataTable<NursingCareSheetDto> columns={nursingCols} data={nursing} rowKey={(r) => r.id} empty="Chưa có phiếu chăm sóc" />
                  {nursing.length > 0 && (
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-6)' }}>
                      In phiếu chăm sóc: chọn <b>In biểu mẫu</b> → Phiếu chăm sóc Cấp 1 hoặc Cấp 2 tương ứng.
                    </div>
                  )}
                </div>
              )}

              {tab === 'reaction' && (
                <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>Phản ứng thuốc / Dị ứng đã ghi nhận</h4>
                  {(full?.allergies?.length ?? 0) === 0
                    ? <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Không có dị ứng ghi nhận</div>
                    : (
                      <div style={{ padding: 'var(--space-10)', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)', borderRadius: 'var(--r-2)', color: '#7f1d1d', fontSize: 'var(--fs-sm)', lineHeight: 1.8 }}>
                        {full!.allergies.map((a) => (
                          <div key={a.id}><b>{a.allergenName}</b>{a.reaction ? ` — ${a.reaction}` : ''} · Mức độ: {a.severity === 3 ? 'Nặng' : a.severity === 2 ? 'Vừa' : 'Nhẹ'}</div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {tab === 'partograph' && (
                <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: 'var(--space-14)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 'var(--fs-sm)' }}>Biểu đồ chuyển dạ (Partograph)</h4>
                  <div style={{ height: 320, background: 'var(--d-1)', borderRadius: 'var(--r-2)', display: 'grid', placeItems: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: 'var(--space-16)' }}>
                    Biểu đồ partograph (độ mở CTC · ngôi · tim thai · cơn co) — chỉ áp dụng HSBA sản khoa.
                  </div>
                </div>
              )}

              {tab === 'attach' && (
                <div>
                  <div style={{ marginBottom: 'var(--space-12)', display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="ed-fld" style={{ width: 220 }} value={attachCat} onChange={(e) => setAttachCat(e.target.value)}>
                      <option value="">— Phân loại (tùy chọn) —</option>
                      {ATTACH_CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      onChange={onPickFile}
                    />
                    <Btn variant="primary" disabled={!full?.id || attachBusy} onClick={() => fileInputRef.current?.click()}>
                      <TermIcon name="upload" size={12} /> {attachBusy ? 'Đang tải lên…' : 'Quét / Chọn tệp đính kèm'}
                    </Btn>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Tối đa 10MB · ảnh / PDF / Office</span>
                  </div>
                  {!full?.id && <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-10)' }}>Chọn HSBA có hồ sơ bệnh án để đính kèm tài liệu.</div>}
                  <DataTable<EmrDocumentAttachmentDto>
                    columns={attachCols}
                    data={attachments}
                    rowKey={(r) => r.id}
                    empty="Chưa có tài liệu đính kèm"
                    actions={(r) => (
                      <div className="ab-actions">
                        {r.hasContent !== false && isViewable(r.fileType) && <ActBtn ic="eye" title="Xem" onClick={() => onViewAttach(r)} />}
                        {r.hasContent !== false && <ActBtn ic="download" title="Tải về" onClick={() => onDownloadAttach(r)} />}
                        <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => onDeleteAttach(r)} />
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Responsive toggle (list only — 2-col) */}
      {leftOpen && <div className="ed-panel-backdrop" onClick={() => setLeftOpen(false)} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Danh sách HSBA">
          <TermIcon name="list" size={18} />
        </button>
      </div>

      {/* Print drawer — danh sách biểu mẫu */}
      <DrawerShell open={printOpen} onClose={() => setPrintOpen(false)} title="In biểu mẫu HSBA" size="md">
        <div style={{ padding: 'var(--space-14)' }}>
          {!full && (
            <div style={{ marginBottom: 'var(--space-10)', padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
              Chọn một bệnh nhân để xem trước và in biểu mẫu.
            </div>
          )}
          {PRINT_FORMS.map((m) => (
            <div key={m.printType + m.label} style={{ padding: 'var(--space-10)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5 }}>{m.label}</span>
              <Btn variant="ghost" size="sm" disabled={!full} onClick={() => { setPrintOpen(false); openPrintForm(m.printType); }}>
                <TermIcon name="print" size={11} /> In
              </Btn>
            </div>
          ))}
        </div>
      </DrawerShell>

      {/* Print preview drawer — hiển thị biểu mẫu thật + nút In */}
      <DrawerShell
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        title="Xem trước biểu mẫu"
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPrintPreviewOpen(false)}>Đóng</Btn>
            <span className="ab-u-flex1" />
            <Btn variant="primary" onClick={handleDoPrint}>
              <TermIcon name="print" size={12} /> In
            </Btn>
          </>
        }
      >
        <div ref={printPreviewRef} style={{ padding: 'var(--space-8)' }}>
          <PrintTemplateRenderer
            printType={printPreviewType}
            record={full}
            examinationId={examId || undefined}
            printRef={printPreviewRef}
            treatmentSheets={treatments}
            nursingSheets={nursing}
            maternityLeaveDto={maternityLeaveDto}
          />
        </div>
      </DrawerShell>

      {/* F1.5 — Modal nhập thông tin nghỉ dưỡng thai */}
      <ModalShell
        open={maternityLeaveModalOpen}
        onClose={() => setMaternityLeaveModalOpen(false)}
        title="Giấy nghỉ dưỡng thai"
        sub="Điền thông tin để xem trước và in giấy"
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setMaternityLeaveModalOpen(false)}>Hủy</Btn>
            <span className="ab-u-flex1" />
            <Btn
              variant="primary"
              onClick={() => {
                if (!maternityLeaveDto || maternityLeaveDto.days <= 0) {
                  tw('Vui lòng nhập số ngày nghỉ hợp lệ');
                  return;
                }
                setMaternityLeaveModalOpen(false);
                setPrintPreviewType('maternity-leave');
                setPrintPreviewOpen(true);
              }}
            >
              Xem trước & In
            </Btn>
          </>
        }
      >
        {maternityLeaveDto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Số ngày nghỉ <span style={{ color: 'red' }}>*</span></label>
              <input
                type="number"
                min={1}
                className="ed-fld"
                value={maternityLeaveDto.days || ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, days: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <div className="ab-u-flex1">
                <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Từ ngày</label>
                <input
                  type="date"
                  className="ed-fld"
                  value={maternityLeaveDto.fromDate}
                  onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, fromDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="ab-u-flex1">
                <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Đến ngày</label>
                <input
                  type="date"
                  className="ed-fld"
                  value={maternityLeaveDto.toDate}
                  onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, toDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Tuần thai (tuần)</label>
              <input
                type="number"
                min={1}
                max={42}
                className="ed-fld"
                value={maternityLeaveDto.gestationalWeeks ?? ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, gestationalWeeks: e.target.value ? Number(e.target.value) : undefined })}
                style={{ width: '100%' }}
                placeholder="VD: 28"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Lý do nghỉ dưỡng thai</label>
              <textarea
                className="ed-fld"
                rows={3}
                value={maternityLeaveDto.reason ?? ''}
                onChange={(e) => setMaternityLeaveDto({ ...maternityLeaveDto, reason: e.target.value })}
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="VD: Doạ sảy thai, tiền sản giật..."
              />
            </div>
          </div>
        )}
      </ModalShell>

      {/* Trình ký nhiều cấp (chuỗi Trưởng khoa → Lãnh đạo) + gộp TT46 finalize */}
      <EmrSigningChainDrawer
        open={chainOpen}
        onClose={() => setChainOpen(false)}
        record={full}
        patientId={sel?.patientId}
        patientName={sel?.patientName}
        patientCode={sel?.patientCode}
        departmentName={sel?.lastRoomName || undefined}
        treatments={treatments}
        consultations={consults}
        nursingSheets={nursing}
        isFinalized={finalized}
        onFinalized={() => { void refreshFinalized(); }}
      />

      {/* Sign modal → real PKI signing via signing-workflow */}
      <ModalShell open={signOpen} onClose={() => setSignOpen(false)} title="Ký số hồ sơ bệnh án" sub="USB Token · VNPT-CA" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setSignOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => { setSignOpen(false); navigate('/v2/signing-workflow'); }}><TermIcon name="check" size={12} /> Tới luồng ký số</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', fontSize: 12.5, color: 'var(--t-1)' }}>
          Ký số HSBA <b>{sel?.patientName}</b> ({sel?.patientCode}) — {treatments.length} phiếu điều trị, {consults.length} hội chẩn.
          <div style={{ marginTop: 'var(--space-10)', fontSize: 11.5, color: 'var(--t-2)' }}>Ký PKI đầy đủ (USB Token / HSM) thực hiện ở Luồng ký số tập trung.</div>
        </div>
      </ModalShell>

      {/* Create sheet modal (treatment / consult / nursing) */}
      <ModalShell open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'treatment' ? 'Tạo phiếu điều trị' : modal === 'consult' ? 'Đề xuất hội chẩn' : 'Tạo phiếu chăm sóc'}
        sub={sel?.patientName} size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
          <Btn variant="primary" disabled={savingForm} onClick={saveSheet}><TermIcon name="check" size={12} /> Lưu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
            <FormField lbl="Ngày"><input type="date" className="ed-fld" value={form.date || ''} onChange={(e) => fld('date', e.target.value)} /></FormField>
            {modal === 'treatment' && <FormField lbl="Ngày thứ"><input type="number" className="ed-fld" value={form.dayNumber || ''} onChange={(e) => fld('dayNumber', e.target.value)} /></FormField>}
            {modal === 'nursing' && (
              <FormField lbl="Ca"><select className="ed-fld" value={form.shift || '1'} onChange={(e) => fld('shift', e.target.value)}><option value="1">Sáng</option><option value="2">Chiều</option><option value="3">Tối</option></select></FormField>
            )}
            {modal === 'nursing' && (
              <FormField lbl="Cấp chăm sóc">
                <select className="ed-fld" value={form.careLevel || ''} onChange={(e) => fld('careLevel', e.target.value)}>
                  <option value="">— Chưa phân cấp —</option>
                  <option value="1">Cấp 1 — BN nặng (theo dõi liên tục)</option>
                  <option value="2">Cấp 2 — BN vừa (theo dõi định kỳ)</option>
                </select>
              </FormField>
            )}
          </div>
          {modal === 'treatment' && <>
            <FormField lbl="Diễn biến">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                <Btn size="sm" variant="ghost" icon="file-text" onClick={() => setTplPickerOpen(true)}>Chọn mẫu</Btn>
              </div>
              <textarea className="ed-fld" rows={3} value={form.dailyProgress || ''} onChange={(e) => fld('dailyProgress', e.target.value)} />
            </FormField>
            <FormField lbl="Y lệnh"><textarea className="ed-fld" rows={3} value={form.treatmentOrders || ''} onChange={(e) => fld('treatmentOrders', e.target.value)} /></FormField>
            <FormField lbl="Ghi chú BS"><textarea className="ed-fld" rows={2} value={form.doctorNotes || ''} onChange={(e) => fld('doctorNotes', e.target.value)} /></FormField>
          </>}
          {modal === 'consult' && <>
            <FormField lbl="Lý do"><input className="ed-fld" value={form.reason || ''} onChange={(e) => fld('reason', e.target.value)} /></FormField>
            <FormField lbl="Tóm tắt"><textarea className="ed-fld" rows={2} value={form.summary || ''} onChange={(e) => fld('summary', e.target.value)} /></FormField>
            <FormField lbl="Kết luận"><textarea className="ed-fld" rows={2} value={form.conclusion || ''} onChange={(e) => fld('conclusion', e.target.value)} /></FormField>
            <FormField lbl="Khuyến nghị"><textarea className="ed-fld" rows={2} value={form.recommendations || ''} onChange={(e) => fld('recommendations', e.target.value)} /></FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
              <FormField lbl="Chủ tọa"><input className="ed-fld" value={form.chairman || ''} onChange={(e) => fld('chairman', e.target.value)} /></FormField>
              <FormField lbl="Thư ký"><input className="ed-fld" value={form.secretary || ''} onChange={(e) => fld('secretary', e.target.value)} /></FormField>
            </div>
          </>}
          {modal === 'nursing' && <>
            <FormField lbl="Tình trạng BN"><textarea className="ed-fld" rows={2} value={form.patientCondition || ''} onChange={(e) => fld('patientCondition', e.target.value)} /></FormField>
            <FormField lbl="Nhận định ĐD"><textarea className="ed-fld" rows={2} value={form.nursingAssessment || ''} onChange={(e) => fld('nursingAssessment', e.target.value)} /></FormField>
            <FormField lbl="Can thiệp"><textarea className="ed-fld" rows={2} value={form.nursingInterventions || ''} onChange={(e) => fld('nursingInterventions', e.target.value)} /></FormField>
            <FormField lbl="Đáp ứng"><textarea className="ed-fld" rows={2} value={form.patientResponse || ''} onChange={(e) => fld('patientResponse', e.target.value)} /></FormField>
          </>}
        </div>
      </ModalShell>

      <ClinicalTemplatePicker
        open={tplPickerOpen}
        onClose={() => setTplPickerOpen(false)}
        templateType={TEMPLATE_TYPES.DIEN_BIEN_BENH}
        gender={sel?.gender}
        ageYears={sel?.age ?? undefined}
        onPick={(t) => fld('dailyProgress', form.dailyProgress ? `${form.dailyProgress}\n${t.content}` : t.content)}
      />
    </div>
  );
};

const Field: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 'var(--space-10)', padding: '4px 0', fontSize: 12.5 }}>
    <div className="ab-u-muted">{lbl}</div>
    <div className="ab-u-fg">{children}</div>
  </div>
);

const FormField: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <label style={{ display: 'block', fontSize: 11.5 }}>
    <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>{lbl}</span>
    {children}
  </label>
);

export default EmrEditorV2;
