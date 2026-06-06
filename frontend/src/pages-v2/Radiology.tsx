import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select } from 'antd';
import * as risApi from '../api/ris';
import type { RadiologyOrderDto, RadiologyResultDto, RadiologyOrderItemDto, RadiologyResultTemplateDto, PtttServiceMappingDto } from '../api/ris';
import * as pathologyApi from '../api/pathology';
import type { SpecimenType } from '../api/pathology';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell, AbSelect,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { useAbbrExpansion } from '../utils/abbrExpand';
import { ABBREVIATION_SCOPES } from '../api/abbreviation';
import { SurgeryReportModal } from './shared/SurgeryReportModal';
import ShareStudyModal from '../components/ShareStudyModal';

type ApiErr = { response?: { data?: { message?: string } } };

/** Scope viết tắt CĐHA — khai báo ngoài component để tránh refetch mỗi render. */
const RIS_ABBR_SCOPES = [ABBREVIATION_SCOPES.RADIOLOGY] as const;

/** Mở phiếu kết quả CĐHA (PDF blob) ở tab mới. Throw nếu lỗi để caller xử lý. */
const printResultBlob = async (resultId: string): Promise<void> => {
  const res = await risApi.printRadiologyResult(resultId);
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/* ────────────────────────────────────────────────────────────
   RIS v2 — port of design-system-v2/his/project/RIS v2.html
   ──────────────────────────────────────────────────────────── */

type StatusKey = 'scheduled' | 'imaging' | 'reading' | 'reported' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã lên lịch',  tone: 'info' },
  { v: 'imaging',   l: 'Đang chụp',    tone: 'warn' },
  { v: 'reading',   l: 'Chờ đọc phim', tone: 'warn' },
  { v: 'reported',  l: 'Đã đọc',       tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',          tone: 'crit' },
];

const MODALITIES: { v: string; l: string; color: string }[] = [
  { v: 'XR',  l: 'X-Quang',       color: '#0891b2' },
  { v: 'CT',  l: 'CT-Scanner',    color: '#7c3aed' },
  { v: 'MRI', l: 'Cộng hưởng từ', color: '#db2777' },
  { v: 'US',  l: 'Siêu âm',       color: '#16a34a' },
  { v: 'MAM', l: 'Nhũ ảnh',       color: '#ea580c' },
];

const detectModality = (item?: RadiologyOrderItemDto): { v: string; color: string } => {
  const t = (item?.serviceType || item?.serviceCode || '').toUpperCase();
  if (t.includes('CT'))   return { v: 'CT',  color: '#7c3aed' };
  if (t.includes('MRI'))  return { v: 'MRI', color: '#db2777' };
  if (t.includes('US') || t.includes('SIEU') || t.includes('SIÊU')) return { v: 'US', color: '#16a34a' };
  if (t.includes('MAM')) return { v: 'MAM', color: '#ea580c' };
  return { v: 'XR', color: '#0891b2' };
};

const statusKey = (s: string): StatusKey => {
  const x = (s || '').toLowerCase();
  if (x.includes('cancel') || x.includes('hủy')) return 'cancelled';
  if (x.includes('read') || x.includes('xong') || x.includes('approve') || x.includes('duyệt') || x.includes('reported')) return 'reported';
  if (x.includes('reading') || x.includes('chờ đọc')) return 'reading';
  if (x.includes('imaging') || x.includes('progress') || x.includes('chạy') || x.includes('đang')) return 'imaging';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';

// ─────────────── Nhập kết quả CĐHA (enter → final-approve → in) ───────────────

const FormRow: React.FC<{ label: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ label, extra, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: 18 }}>
      <span style={{
        fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.05em', color: 'var(--t-2)',
      }}>{label}</span>
      {extra}
    </div>
    {children}
  </div>
);

const SIGN_TYPES = [
  { id: 'USBToken', name: 'USB Token (chữ ký số CA)' },
  { id: 'SmartCA', name: 'SmartCA (VNPT/Viettel)' },
  { id: 'SignServer', name: 'SignServer (HSM tập trung)' },
  { id: 'eKYC', name: 'eKYC / OTP' },
];

/** Gọi bệnh nhân vào phòng chụp CĐHA. roomId là bắt buộc theo CallPatientDto của backend. */
const CallPatientModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onCalled: () => void;
}> = ({ open, order, rooms, onClose, onCalled }) => {
  const { message } = AntdApp.useApp();
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setRoomId(rooms[0]?.id || '');
  }, [open, rooms]);

  const submit = async () => {
    if (!order) return;
    if (!roomId) { message.warning('Chọn phòng chụp để gọi bệnh nhân'); return; }
    setBusy(true);
    try {
      const r = await risApi.callPatient({
        orderId: order.id,
        roomId,
        useSpeaker: true,
      });
      message.success(r.data?.message || 'Đã gọi bệnh nhân');
      onCalled();
      onClose();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không gọi được bệnh nhân');
    } finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <TermIcon name="user" size={14} /><span>Gọi bệnh nhân vào phòng</span>
      </span>}
      sub={order ? `${order.patientName} · ${order.orderCode}` : ''}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
        <Btn variant="primary" onClick={submit} loading={busy} icon="check">Gọi</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormRow label="Phòng chụp">
          <AbSelect
            options={rooms}
            fieldNames={{ value: 'id', label: 'name' }}
            value={roomId}
            onChange={setRoomId}
            placeholder="— Chọn phòng —"
          />
        </FormRow>
        {order && (
          <div style={{ fontSize: 12.5, color: 'var(--t-2)', padding: '6px 10px', background: 'var(--d-1)', borderRadius: 5 }}>
            <b style={{ color: 'var(--t-1)' }}>{order.patientName}</b>
            {' · '}
            {order.items?.[0]?.serviceName || '—'}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

/** Ký số báo cáo CĐHA — reportId = id của RadiologyResult (báo cáo đọc phim). */
const SignResultModal: React.FC<{
  open: boolean;
  reportId: string | null;
  onClose: () => void;
  onSigned: () => void;
}> = ({ open, reportId, onClose, onSigned }) => {
  const { message } = AntdApp.useApp();
  const [signatureType, setSignatureType] = useState('USBToken');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<risApi.SignatureHistoryDto[]>([]);

  useEffect(() => {
    if (!open || !reportId) return;
    setSignatureType('USBToken'); setPin(''); setOtp('');
    risApi.getSignatureHistory(reportId)
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]));
  }, [open, reportId]);

  const needsPin = signatureType === 'USBToken' || signatureType === 'SignServer';
  const needsOtp = signatureType === 'SmartCA' || signatureType === 'eKYC';

  const submit = async () => {
    if (!reportId) return;
    if (needsPin && !pin.trim()) { message.warning('Nhập mã PIN của token/chứng thư'); return; }
    if (needsOtp && !otp.trim()) { message.warning('Nhập mã OTP'); return; }
    setBusy(true);
    try {
      const r = await risApi.signResult({
        reportId,
        signatureType,
        pin: pin.trim() || undefined,
        otp: otp.trim() || undefined,
      });
      if (r.data?.success) {
        message.success('Đã ký số báo cáo thành công');
        onSigned();
        onClose();
      } else {
        message.error(r.data?.message || 'Ký số thất bại');
      }
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Ký số thất bại');
    } finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <TermIcon name="shield" size={14} /><span>Ký số báo cáo CĐHA</span>
      </span>}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
        <Btn variant="primary" onClick={submit} loading={busy} icon="check">Ký số</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormRow label="Hình thức ký">
          <AbSelect
            options={SIGN_TYPES}
            fieldNames={{ value: 'id', label: 'name' }}
            value={signatureType}
            onChange={setSignatureType}
            placeholder="— Chọn hình thức ký —"
          />
        </FormRow>
        {needsPin && (
          <FormRow label="Mã PIN">
            <Input.Password value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Mã PIN token / chứng thư" />
          </FormRow>
        )}
        {needsOtp && (
          <FormRow label="Mã OTP">
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Mã OTP nhận qua app/SMS" />
          </FormRow>
        )}
        {history.length > 0 && (
          <div className="rec-section" style={{ marginTop: 4 }}>
            <h5><TermIcon name="check" size={11} /> ĐÃ KÝ ({history.length})</h5>
            {history.map((h) => (
              <div key={h.id} style={{ fontSize: 11.5, color: 'var(--t-2)', padding: '3px 0' }}>
                <b style={{ color: h.isValid ? 'var(--s-ok, #16a34a)' : 'var(--s-crit)' }}>{h.signedByName}</b>
                {' · '}{h.signatureType}{' · '}{fmtDT(h.signedTime)}
                {!h.isValid && <span style={{ color: 'var(--s-crit)' }}> · không hợp lệ</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

const ResultEntryModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, order, onClose, onSaved }) => {
  const { message } = AntdApp.useApp();
  const item = order?.items?.[0];
  const [templates, setTemplates] = useState<RadiologyResultTemplateDto[]>([]);
  const [tplId, setTplId] = useState('');
  const [description, setDescription] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [note, setNote] = useState('');
  const [resultId, setResultId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  // PTTT tường trình (G-33) — sinh thiết / thủ thuật dưới hướng dẫn CĐHA
  const [ptttOpen, setPtttOpen] = useState(false);
  // Sinh thiết / GPB (Prompt 8 Đợt 2)
  const [biopsyOpen, setBiopsyOpen] = useState(false);

  // Bung viết tắt inline (MQSoft F2 style) — không cần API call riêng.
  // Hook nạp từ điển một lần và trả hàm expand() chạy local.
  const expand = useAbbrExpansion(RIS_ABBR_SCOPES);

  // Nạp mẫu KQ theo dịch vụ + prefill nếu đã có KQ cũ.
  useEffect(() => {
    const it = order?.items?.[0];
    if (!open || !it) return;
    setTplId(''); setDescription(''); setConclusion(''); setNote(''); setResultId(null);
    if (it.serviceId) {
      risApi.getResultTemplatesByService(it.serviceId)
        .then((r) => setTemplates(Array.isArray(r.data) ? r.data : []))
        .catch(() => setTemplates([]));
    } else {
      setTemplates([]);
    }
    if (it.hasResult) {
      risApi.getRadiologyResult(it.id)
        .then((r) => {
          const d = r.data;
          if (!d) return;
          setResultId(d.id);
          setDescription(d.description || '');
          setConclusion(d.conclusion || '');
          setNote(d.note || '');
        })
        .catch(() => { /* chưa có KQ — bỏ qua */ });
    }
  }, [open, order]);

  const applyTemplate = (id: string) => {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.descriptionTemplate) setDescription(t.descriptionTemplate);
    if (t.conclusionTemplate) setConclusion(t.conclusionTemplate);
    if (t.noteTemplate) setNote(t.noteTemplate);
  };

  // Lưu (enter result) — trả resultId để duyệt/in.
  const persist = async (): Promise<string | null> => {
    if (!item) return null;
    if (!description.trim() && !conclusion.trim()) {
      message.warning('Nhập mô tả hoặc kết luận trước khi lưu');
      return null;
    }
    const res = await risApi.enterRadiologyResult({
      orderItemId: item.id,
      templateId: tplId || undefined,
      description: description.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      note: note.trim() || undefined,
    });
    const id = res.data?.id || resultId;
    if (id) setResultId(id);
    return id ?? null;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const id = await persist();
      if (id) { message.success('Đã lưu báo cáo'); onSaved(); onClose(); }
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể lưu báo cáo');
    } finally { setSaving(false); }
  };

  const handleSaveApprove = async () => {
    setApproving(true);
    try {
      const id = await persist();
      if (!id) return;
      await risApi.finalApproveResult(id, { resultId: id, isFinalApproval: true });
      message.success('Đã lưu & duyệt báo cáo');
      onSaved(); onClose();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể duyệt báo cáo');
    } finally { setApproving(false); }
  };

  const handlePrint = async () => {
    if (!resultId) return;
    setPrinting(true);
    try { await printResultBlob(resultId); }
    catch { message.error('Không in được phiếu'); }
    finally { setPrinting(false); }
  };

  if (!order || !item) return null;
  const busy = saving || approving;

  return (
    <>
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <TermIcon name="file-text" size={14} />
        <span>Nhập kết quả CĐHA</span>
      </span>}
      sub={`${order.patientName} · ${item.serviceName}`}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <Btn
          variant="ghost"
          onClick={() => setBiopsyOpen(true)}
          title="Nhập kết quả sinh thiết / giải phẫu bệnh (GPB) liên quan ca CĐHA"
        >
          <TermIcon name="scissors" size={12} /> Sinh thiết / GPB
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => setPtttOpen(true)}
          title="Tường trình phẫu thuật / thủ thuật dưới hướng dẫn CĐHA (sinh thiết…)"
        >
          <TermIcon name="scissors" size={12} /> Tường trình PTTT
        </Btn>
        <span style={{ flex: 1 }} />
        {resultId && (
          <Btn onClick={() => setSignOpen(true)} disabled={busy}>
            <TermIcon name="shield" size={12} /> Ký số
          </Btn>
        )}
        {resultId && (
          <Btn onClick={handlePrint} loading={printing} icon="print">In phiếu</Btn>
        )}
        <Btn onClick={handleSaveDraft} loading={saving} disabled={approving}>Lưu nháp</Btn>
        <Btn variant="primary" onClick={handleSaveApprove} loading={approving} disabled={saving} icon="check">Lưu &amp; Duyệt</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormRow label="Mẫu kết quả">
          <AbSelect
            options={templates}
            fieldNames={{ value: 'id', label: 'name' }}
            value={tplId}
            onChange={applyTemplate}
            placeholder={templates.length ? '— Chọn mẫu để điền nhanh —' : '(Không có mẫu)'}
          />
        </FormRow>
        <FormRow
          label="Mô tả hình ảnh"
          extra={
            <span style={{ fontSize: 10.5, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
              <TermIcon name="zap" size={10} /> gõ viết tắt + Space để bung
            </span>
          }
        >
          <Input.TextArea
            rows={6}
            value={description}
            onChange={(e) => setDescription(expand(e.target.value))}
            placeholder="Nhập mô tả chi tiết hình ảnh…"
            disabled={busy}
          />
        </FormRow>
        <FormRow
          label="Kết luận"
          extra={
            <span style={{ fontSize: 10.5, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>
              <TermIcon name="zap" size={10} /> gõ viết tắt + Space để bung
            </span>
          }
        >
          <Input.TextArea
            rows={4}
            value={conclusion}
            onChange={(e) => setConclusion(expand(e.target.value))}
            placeholder="Nhập kết luận…"
            disabled={busy}
          />
        </FormRow>
        <FormRow label="Đề nghị / Ghi chú">
          <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập đề nghị (nếu có)…" disabled={busy} />
        </FormRow>
      </div>
    </ModalShell>
    <SignResultModal
      open={signOpen}
      reportId={resultId}
      onClose={() => setSignOpen(false)}
      onSigned={onSaved}
    />
    {/* PTTT tường trình (G-33): biopsy / procedure under imaging guidance */}
    <SurgeryReportModal
      open={ptttOpen}
      onClose={() => setPtttOpen(false)}
      examinationId={order?.visitId ?? null}
      patientName={order?.patientName}
      patientCode={order?.patientCode}
      prefillServiceName={item?.serviceName}
      prefillDiagnosis={order?.diagnosis}
    />
    {/* Sinh thiết / GPB (Prompt 8 Đợt 2) */}
    <BiopsyModal
      open={biopsyOpen}
      order={order}
      onClose={() => setBiopsyOpen(false)}
      onSaved={() => { /* không cần reload — KQ GPB là entity riêng */ }}
    />
    </>
  );
};

// ─────────────── Modal nhập sinh thiết / GPB từ màn KQ CĐHA ───────────────

const BiopsyModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, order, onClose, onSaved }) => {
  const { message } = AntdApp.useApp();
  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [specimenType, setSpecimenType] = useState('biopsy');
  const [specimenSite, setSpecimenSite] = useState('');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');
  const [grossDescription, setGrossDescription] = useState('');
  const [microscopicDescription, setMicroscopicDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    const types = await pathologyApi.getSpecimenTypes();
    setSpecimenTypes(types);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadTypes();
    setSpecimenType('biopsy');
    setSpecimenSite('');
    setClinicalDiagnosis(order?.diagnosis || '');
    setGrossDescription('');
    setMicroscopicDescription('');
    setDiagnosis('');
    setSavedId(null);
  }, [open, order, loadTypes]);

  const handleSave = async () => {
    if (!specimenSite.trim()) { message.warning('Nhập vị trí lấy mẫu'); return; }
    setSaving(true);
    try {
      const result = await pathologyApi.createPathologyResult({
        specimenType: specimenType as 'biopsy' | 'cytology' | 'pap' | 'frozenSection',
        grossDescription,
        microscopicDescription,
        diagnosis,
      } as Parameters<typeof pathologyApi.createPathologyResult>[0]);
      setSavedId(result.id);
      message.success('Đã lưu kết quả sinh thiết / GPB');
      onSaved();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không thể lưu kết quả sinh thiết');
    } finally { setSaving(false); }
  };

  const handlePrint = async () => {
    if (!savedId) { message.warning('Lưu trước khi in'); return; }
    setPrinting(true);
    try {
      const blob = await pathologyApi.printPathologyReport(savedId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { message.error('Không in được phiếu sinh thiết'); }
    finally { setPrinting(false); }
  };

  if (!order) return null;
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <TermIcon name="scissors" size={14} /><span>Nhập sinh thiết / GPB</span>
      </span>}
      sub={`${order.patientName} · ${order.orderCode}`}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <span style={{ flex: 1 }} />
        {savedId && (
          <Btn onClick={handlePrint} loading={printing} icon="print">In phiếu sinh thiết</Btn>
        )}
        <Btn variant="primary" onClick={handleSave} loading={saving} icon="check">Lưu kết quả</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormRow label="Loại mẫu">
          <Select
            value={specimenType}
            onChange={setSpecimenType}
            style={{ width: '100%' }}
            options={specimenTypes.map((t) => ({ label: t.name, value: t.code }))}
          />
        </FormRow>
        <FormRow label="Vị trí lấy mẫu">
          <Input
            value={specimenSite}
            onChange={(e) => setSpecimenSite(e.target.value)}
            placeholder="Mô tả vị trí lấy mẫu (vd: thùy trái tuyến giáp)"
          />
        </FormRow>
        <FormRow label="Chẩn đoán lâm sàng (nghi ngờ)">
          <Input
            value={clinicalDiagnosis}
            onChange={(e) => setClinicalDiagnosis(e.target.value)}
            placeholder="Chẩn đoán trước sinh thiết"
          />
        </FormRow>
        <FormRow label="Mô tả đại thể">
          <Input.TextArea
            rows={3}
            value={grossDescription}
            onChange={(e) => setGrossDescription(e.target.value)}
            placeholder="Mô tả màu sắc, kích thước, tính chất mẫu…"
          />
        </FormRow>
        <FormRow label="Mô tả vi thể">
          <Input.TextArea
            rows={3}
            value={microscopicDescription}
            onChange={(e) => setMicroscopicDescription(e.target.value)}
            placeholder="Đặc điểm tế bào, mô bệnh học…"
          />
        </FormRow>
        <FormRow label="Kết luận GPB">
          <Input.TextArea
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Chẩn đoán giải phẫu bệnh cuối cùng"
          />
        </FormRow>
      </div>
    </ModalShell>
  );
};

// ─────────────── Modal chia sẻ ca chụp (v2 wrapper) ───────────────
// ShareStudyModal đã có đầy đủ HideDemographics — dùng lại không sửa.

const RadiologyV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RadiologyOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fMod, setFMod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<RadiologyOrderDto | null>(null);
  const [result, setResult] = useState<RadiologyResultDto | null>(null);
  const [resultTarget, setResultTarget] = useState<RadiologyOrderDto | null>(null);
  const [callTarget, setCallTarget] = useState<RadiologyOrderDto | null>(null);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [date, setDate] = useState(() => dayjs());
  // Chia sẻ ca chụp (Prompt 8 Đợt 2)
  const [shareCtx, setShareCtx] = useState<{
    studyInstanceUID: string;
    orthancStudyId?: string;
    patientId?: string;
  } | null>(null);
  // Tường trình PTTT từ drawer chi tiết (Prompt 8 DEFER-resolve)
  const [ptttDrawerOpen, setPtttDrawerOpen] = useState(false);
  const [detailPtttMapping, setDetailPtttMapping] = useState<PtttServiceMappingDto | null>(null);
  // Bulk download (Prompt 8 Đợt 2)
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const PAGE_SIZE = 18;

  const reload = () => {
    setLoading(true);
    risApi.getRadiologyOrders(
      date.subtract(7, 'day').format('YYYY-MM-DD'),
      date.format('YYYY-MM-DD'),
    )
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [date]);

  // Nạp danh sách phòng chụp một lần khi mount (dùng cho CallPatientModal)
  useEffect(() => {
    risApi.getRooms()
      .then((r) => setRooms((Array.isArray(r.data) ? r.data : []).map((rm) => ({ id: rm.id, name: rm.name }))))
      .catch(() => setRooms([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load full result when drawer opens
  useEffect(() => {
    setResult(null);
    if (!detail) return;
    const firstItem = detail.items?.[0];
    if (!firstItem?.hasResult) return;
    risApi.getRadiologyResult(firstItem.id)
      .then((r) => setResult(r.data || null))
      .catch(() => setResult(null));
  }, [detail]);

  // Load PTTT mapping khi drawer mở để kiểm tra dịch vụ có mapping hay không
  useEffect(() => {
    setDetailPtttMapping(null);
    if (!detail) return;
    const serviceId = detail.items?.[0]?.serviceId;
    if (!serviceId) return;
    risApi.getPtttMappingByService(serviceId)
      .then((r) => setDetailPtttMapping(r.data || null))
      .catch(() => setDetailPtttMapping(null)); // 404 = không có mapping — ẩn nút
  }, [detail]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fMod) {
        const m = detectModality(r.items?.[0]);
        if (m.v !== fMod) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.orderCode, r.diagnosis,
          ...(r.items || []).map((i) => i.serviceName)].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, fMod, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const kpis = useMemo(() => {
    const reading  = rows.filter((r) => statusKey(r.status) === 'reading').length;
    const reported = rows.filter((r) => statusKey(r.status) === 'reported').length;
    const imaging  = rows.filter((r) => statusKey(r.status) === 'imaging').length;
    const ctScans  = rows.filter((r) => detectModality(r.items?.[0]).v === 'CT').length;
    return {
      total: rows.length,
      reading,
      reported,
      imaging,
      ctScans,
      modalities: MODALITIES.length,
    };
  }, [rows]);

  const columns: ColumnDef<RadiologyOrderDto>[] = [
    { key: 'code', label: 'Mã RIS', width: 130, mono: true, render: (r) => r.orderCode },
    { key: 'time', label: 'Giờ', mono: true, width: 70, render: (r) => fmtHM(r.orderDate) },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.age || '—'}t · {r.gender || '—'}</i>
        </div>
      ),
    },
    {
      key: 'mod', label: 'Modality', width: 80,
      render: (r) => {
        const m = detectModality(r.items?.[0]);
        return (
          <span style={{
            display: 'inline-block', padding: '2px 8px',
            background: m.color, color: '#fff', borderRadius: 3,
            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
          }}>{m.v}</span>
        );
      },
    },
    {
      key: 'proc', label: 'Kỹ thuật',
      render: (r) => {
        const items = r.items || [];
        const first = items[0];
        return (
          <div className="cell-2l">
            <b>{first?.serviceName || '—'}</b>
            <i className="mono">{first?.serviceCode || ''}{items.length > 1 && ` +${items.length - 1}`}</i>
          </div>
        );
      },
    },
    { key: 'reason', label: 'Lý do CĐ', render: (r) => r.diagnosis || r.clinicalInfo || '—' },
    { key: 'doctor', label: 'BS chỉ định', width: 150, render: (r) => r.orderDoctorName || '—' },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  const onPrintRow = async (r: RadiologyOrderDto) => {
    const it = r.items?.[0];
    if (!it?.hasResult) { message.warning('Chưa có kết quả để in'); return; }
    try {
      const res = await risApi.getRadiologyResult(it.id);
      const id = res.data?.id;
      if (!id) { message.warning('Chưa có kết quả để in'); return; }
      await printResultBlob(id);
    } catch { message.error('Không in được phiếu'); }
  };
  const onPrintResult = async () => {
    if (!result?.id) { message.warning('Chưa có kết quả để in'); return; }
    try { await printResultBlob(result.id); }
    catch { message.error('Không in được phiếu'); }
  };
  const onViewer = (r: RadiologyOrderDto) => {
    const firstItem = r.items?.[0];
    if (!firstItem) { message.warning('Không có ảnh DICOM'); return; }
    message.info('Mở DICOM Viewer (TODO)');
  };
  const onStartExam = async (r: RadiologyOrderDto) => {
    try { await risApi.startExam(r.id); message.success('Đã bắt đầu ca chụp'); reload(); }
    catch (e) { message.error((e as ApiErr)?.response?.data?.message || 'Không bắt đầu được ca'); }
  };
  const onCompleteExam = async (r: RadiologyOrderDto) => {
    try { await risApi.completeExam(r.id); message.success('Đã hoàn thành ca chụp'); reload(); }
    catch (e) { message.error((e as ApiErr)?.response?.data?.message || 'Không hoàn thành được ca'); }
  };

  const onShare = (r: RadiologyOrderDto) => {
    // Dùng studyInstanceUID thật từ DicomStudy nếu có; fallback về orderId để StudyShareController
    // vẫn tạo được link (BS cập nhật UID thật sau khi DICOM về).
    setShareCtx({
      studyInstanceUID: r.studyInstanceUID || r.id,
      patientId: r.patientId,
    });
  };

  const onBulkDownload = async (anonymize: boolean) => {
    if (bulkSelected.length === 0) { message.warning('Chọn ít nhất 1 ca để tải'); return; }
    setBulkDownloading(true);
    try {
      const resp = await risApi.bulkExportDicom({ studyIds: bulkSelected, anonymize });
      const blob = new Blob([resp.data as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = anonymize ? 'bulk_anon_export.zip' : 'bulk_export.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message.success(`Đã tải ${bulkSelected.length} study`);
      setBulkSelected([]);
    } catch { message.error('Tải xuống thất bại'); }
    finally { setBulkDownloading(false); }
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng ca', val: kpis.total, sub: 'gần đây' },
          { lbl: 'Chờ đọc phim', val: kpis.reading, sub: 'backlog', tone: 'warn' },
          {
            lbl: 'Đã có KQ', val: kpis.reported,
            sub: kpis.total > 0 ? `${Math.round(kpis.reported / kpis.total * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Đang chụp', val: kpis.imaging, sub: 'tại các phòng', tone: 'warn' },
          { lbl: 'CT/MRI', val: kpis.ctScans, sub: 'cần chuẩn bị', tone: 'info' },
          { lbl: 'Modality', val: kpis.modalities, sub: 'loại máy' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm BN, mã RIS, kỹ thuật, chẩn đoán…"
        />
        <Filter
          value={fMod} onChange={setFMod}
          options={MODALITIES.map((m) => ({ v: m.v, l: `${m.v} · ${m.l}` }))}
          placeholder="▾ Modality"
        />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFMod(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(date.subtract(1, 'day'))}>
          <TermIcon name="chevronL" size={12} />
        </Btn>
        <Btn variant="ghost" onClick={() => setDate(dayjs())}>Hôm nay</Btn>
        <Btn variant="ghost" onClick={() => setDate(date.add(1, 'day'))}>
          <TermIcon name="chevronR" size={12} />
        </Btn>
        <span className="spacer" />
        {bulkSelected.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: 'var(--t-2)' }}>
              {bulkSelected.length} đã chọn
            </span>
            <Btn variant="ghost" onClick={() => void onBulkDownload(false)} loading={bulkDownloading}>
              <TermIcon name="download" size={12} /> Tải ZIP
            </Btn>
            <Btn variant="ghost" onClick={() => void onBulkDownload(true)} loading={bulkDownloading}>
              <TermIcon name="shield" size={12} /> Tải ẩn danh
            </Btn>
            <Btn variant="ghost" onClick={() => setBulkSelected([])}>
              <TermIcon name="x" size={12} /> Bỏ chọn
            </Btn>
          </>
        )}
        <Btn variant="ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/ris-dispatcher')}>
          <TermIcon name="image" size={12} /> DICOM
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/radiology-ops')}>
          <TermIcon name="plus" size={12} /> Chỉ định <kbd>F2</kbd>
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RadiologyOrderDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => {
          const sk = statusKey(r.status);
          return (
            <div className="ab-actions">
              {r.items?.[0]?.hasResult && (
                <ActBtn ic="eye" title="Xem KQ" onClick={() => setDetail(r)} />
              )}
              {(sk === 'scheduled' || sk === 'imaging') && (
                <ActBtn ic="user" title="Gọi bệnh nhân" onClick={() => setCallTarget(r)} />
              )}
              {sk === 'scheduled' && (
                <ActBtn ic="play" title="Bắt đầu chụp" onClick={() => void onStartExam(r)} />
              )}
              {sk === 'imaging' && (
                <ActBtn ic="check" title="Hoàn thành chụp" onClick={() => void onCompleteExam(r)} />
              )}
              {sk !== 'cancelled' && sk !== 'reported' && (
                <ActBtn ic="edit" title="Nhập kết quả" onClick={() => setResultTarget(r)} />
              )}
              {r.items?.[0]?.hasImages && (
                <ActBtn ic="image" title="Xem ảnh DICOM" onClick={() => onViewer(r)} />
              )}
              <ActBtn ic="share" title="Chia sẻ ca chụp (ẩn danh tùy chọn)" onClick={() => onShare(r)} />
              <ActBtn
                ic={bulkSelected.includes(r.id) ? 'check' : 'download'}
                title={bulkSelected.includes(r.id) ? 'Đã chọn tải hàng loạt' : 'Chọn tải hàng loạt'}
                onClick={() => toggleBulkSelect(r.id)}
              />
              <ActBtn ic="print" title="In phiếu" onClick={() => onPrintRow(r)} />
            </div>
          );
        }}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có ca CĐHA nào</div>
          </div>
        )}
      />

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.orderCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.departmentName || '—'} · ${fmtDT(detail.orderDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            {/* Nút PTTT chỉ hiện khi dịch vụ có mapping trong RisSurgeryServiceMappings */}
            {detailPtttMapping && statusKey(detail.status) !== 'cancelled' && (
              <Btn
                onClick={() => setPtttDrawerOpen(true)}
                title={`Tường trình PTTT — mẫu: ${detailPtttMapping.surgeryNarrativeTemplateName || 'tự do'}`}
              >
                <TermIcon name="scissors" size={12} /> Tường trình PTTT
              </Btn>
            )}
            {statusKey(detail.status) !== 'cancelled' && (
              <Btn onClick={() => { setResultTarget(detail); setDetail(null); }}>
                <TermIcon name="edit" size={12} /> {detail.items?.[0]?.hasResult ? 'Sửa KQ' : 'Nhập KQ'}
              </Btn>
            )}
            <Btn onClick={onPrintResult}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
            {detail.items?.[0]?.hasImages && (
              <Btn variant="primary" onClick={() => onViewer(detail)}>
                <TermIcon name="image" size={12} /> Xem ảnh DICOM
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <RadiologyDrawerBody r={detail} result={result} />}
      </DrawerShell>

      <ResultEntryModal
        open={!!resultTarget}
        order={resultTarget}
        onClose={() => setResultTarget(null)}
        onSaved={reload}
      />

      <CallPatientModal
        open={!!callTarget}
        order={callTarget}
        rooms={rooms}
        onClose={() => setCallTarget(null)}
        onCalled={reload}
      />

      {/* Chia sẻ ca chụp với anonymize (Prompt 8 Đợt 2) */}
      <ShareStudyModal
        open={shareCtx !== null}
        onClose={() => setShareCtx(null)}
        studyInstanceUID={shareCtx?.studyInstanceUID || ''}
        orthancStudyId={shareCtx?.orthancStudyId}
        patientId={shareCtx?.patientId}
      />

      {/* Tường trình PTTT từ drawer chi tiết — chỉ hiện khi dịch vụ có mapping */}
      <SurgeryReportModal
        open={ptttDrawerOpen}
        onClose={() => setPtttDrawerOpen(false)}
        examinationId={detail?.visitId ?? null}
        patientId={detail?.patientId}
        patientName={detail?.patientName}
        patientCode={detail?.patientCode}
        prefillServiceName={detailPtttMapping?.template?.surgeryMethod || detail?.items?.[0]?.serviceName}
        prefillDiagnosis={detailPtttMapping?.template?.preOpDiagnosis || detail?.diagnosis}
      />
    </div>
  );
};

const RadiologyDrawerBody: React.FC<{ r: RadiologyOrderDto; result: RadiologyResultDto | null }> = ({ r, result }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || '';
  const m = detectModality(r.items?.[0]);

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{
            padding: '2px 8px', background: m.color, color: '#fff',
            borderRadius: 3, fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}>{m.v}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Tuổi · Giới</span><span>{r.age || '—'} tuổi · {r.gender || '—'}</span>
          <span>BS chỉ định</span><span>{r.orderDoctorName || '—'}</span>
          {r.diagnosis && (<><span>Chẩn đoán</span><span>{r.diagnosis}</span></>)}
          {r.clinicalInfo && (<><span>Lâm sàng</span><span>{r.clinicalInfo}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="image" size={11} /> KỸ THUẬT CĐHA ({r.items?.length || 0})</h5>
        {(r.items || []).map((it) => (
          <div key={it.id} style={{
            padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, fontSize: 12.5,
          }}>
            <div>
              <b style={{ color: 'var(--t-0)' }}>{it.serviceName}</b>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                <span className="mono">{it.serviceCode}</span>
                {it.startTime && <> · Bắt đầu {fmtHM(it.startTime)}</>}
                {it.endTime && <> · Xong {fmtHM(it.endTime)}</>}
                {it.technicianName && <> · KTV {it.technicianName}</>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {it.hasResult && <span className="chip ok">KQ</span>}
              {it.hasImages && <span className="chip info">DICOM</span>}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className="rec-section">
          <h5><TermIcon name="file-text" size={11} /> BÁO CÁO ĐỌC PHIM</h5>
          <div style={{
            padding: 14, background: 'var(--d-1)',
            border: '1px solid var(--line)', borderRadius: 6,
            fontSize: 13, lineHeight: 1.6, color: 'var(--t-1)',
            whiteSpace: 'pre-wrap',
          }}>
            {result.description && (<><b>Mô tả:</b> {result.description}<br /><br /></>)}
            {result.conclusion && (<><b>Kết luận:</b> {result.conclusion}</>)}
            {!result.description && !result.conclusion && <span style={{ color: 'var(--t-3)' }}>Chưa có nội dung báo cáo</span>}
          </div>
          {result.approvedBy && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t-2)' }}>
              {result.approvedBy} · {fmtDT(result.approvedTime)}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default RadiologyV2;
