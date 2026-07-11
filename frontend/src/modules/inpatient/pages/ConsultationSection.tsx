import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select } from 'antd';
import {
  SearchBox, DataTable, StatusBadge, ActBtn, Btn, DrawerShell, ModalShell,
  StatusTabs, DrSec, DrField, tk, te,
  type ColumnDef, type StatusTab,
} from '../../../pages-v2/_v2kit';
import { fmtDateTime } from '../../../utils/format';
import TermIcon from '../../../layouts/terminal/Icon';
import {
  getConsultations, createConsultation, completeConsultation, approveConsultation, printConsultation,
  type ConsultationDto, type CreateConsultationDto, type InpatientListDto,
} from '../api/inpatient';
import { getSigners, type EmrSignerCatalogDto } from '../../emr/api/emrAdmin';

/* ── Issue #2: tab Hội chẩn nội trú — list / tạo / hoàn thành / in biên bản.
   Backend persist từ mig 99 (InpatientConsultations). api client đã có sẵn. ── */

type CsKey = 'all' | 'waiting' | 'doing' | 'done' | 'pending_approval' | 'approved' | 'rejected';
const CS_TABS: StatusTab<CsKey>[] = [
  { v: 'all', l: 'Tất cả', tone: 'info' },
  { v: 'waiting', l: 'Chờ hội chẩn', tone: 'warn' },
  { v: 'doing', l: 'Đang hội chẩn', tone: 'info' },
  { v: 'done', l: 'Hoàn thành', tone: 'ok' },
  { v: 'pending_approval', l: 'Chờ duyệt LĐ', tone: 'warn' },
  { v: 'approved', l: 'Đã duyệt', tone: 'ok' },
  { v: 'rejected', l: 'Từ chối', tone: 'crit' },
];
const csKey = (s: number): CsKey => (s === 2 ? 'done' : s === 1 ? 'doing' : 'waiting');
// Map approvalStatus -> tab key (for drug consultations type=3)
const csApprovalKey = (c: ConsultationDto): CsKey | null => {
  if (c.consultationType !== 3) return null;
  if (c.approvalStatus === 1) return 'pending_approval';
  if (c.approvalStatus === 2) return 'approved';
  if (c.approvalStatus === 3) return 'rejected';
  return null;
};
const CS_TONE: Record<CsKey, 'ok' | 'info' | 'warn' | 'crit'> = {
  all: 'info', waiting: 'warn', doing: 'info', done: 'ok',
  pending_approval: 'warn', approved: 'ok', rejected: 'crit',
};
const CS_LABEL: Record<Exclude<CsKey, 'all'>, string> = {
  waiting: 'Chờ hội chẩn', doing: 'Đang hội chẩn', done: 'Hoàn thành',
  pending_approval: 'Chờ duyệt LĐ', approved: 'Đã duyệt', rejected: 'Từ chối',
};

const TYPE_OPTS = [
  { value: 1, label: 'Hội chẩn khoa' },
  { value: 2, label: 'Hội chẩn bệnh viện' },
  { value: 3, label: 'Hội chẩn thuốc dấu *' },
  { value: 4, label: 'Hội chẩn PTTT' },
];

const fmtDT = (c: ConsultationDto) =>
  `${dayjs(c.consultationDate).format('DD/MM/YYYY')}${c.consultationTime ? ` ${c.consultationTime.slice(0, 5)}` : ''}`;

const ConsultationSection: React.FC<{ inpatients: InpatientListDto[]; active: boolean }> = ({ inpatients, active }) => {
  const [items, setItems] = useState<ConsultationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CsKey>('all');
  const [sel, setSel] = useState<ConsultationDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [completing, setCompleting] = useState<ConsultationDto | null>(null);
  const [approving, setApproving] = useState<ConsultationDto | null>(null);

  const byAdmission = useMemo(
    () => new Map(inpatients.map((p) => [p.admissionId, p])),
    [inpatients],
  );
  const patientOf = useCallback(
    (c: ConsultationDto) => byAdmission.get(c.admissionId),
    [byAdmission],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getConsultations();
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch {
      setItems([]);
      te('Không tải được danh sách hội chẩn');
    } finally {
      setLoading(false);
    }
  }, []);
  // Chỉ load khi tab đang mở (side-effect gắn `active` — không chạy nền khi ở tab khác).
  useEffect(() => { if (active) void load(); }, [active, load]);

  const csCounts = useMemo<Record<string, number>>(() => {
    const c: Record<string, number> = { all: items.length, waiting: 0, doing: 0, done: 0, pending_approval: 0, approved: 0, rejected: 0 };
    items.forEach((i) => {
      c[csKey(i.status)] += 1;
      const ak = csApprovalKey(i);
      if (ak) c[ak] += 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (status !== 'all') {
        const approvalTab = csApprovalKey(c);
        const statusTab = csKey(c.status);
        // approval tabs: filter by approvalStatus
        if (status === 'pending_approval' || status === 'approved' || status === 'rejected') {
          if (approvalTab !== status) return false;
        } else if (statusTab !== status) {
          return false;
        }
      }
      if (!q) return true;
      const p = patientOf(c);
      return [p?.patientName, p?.patientCode, c.chairmanName, c.secretaryName, c.location, c.reason]
        .some((s) => (s || '').toLowerCase().includes(q));
    });
  }, [items, search, status, patientOf]);

  const onPrint = useCallback(async (c: ConsultationDto) => {
    try {
      const r = await printConsultation(c.id);
      const raw = r.data as Blob;
      if (!raw || raw.size === 0) { te('Chưa có dữ liệu biên bản để in'); return; }
      const blob = raw.type ? raw : new Blob([raw], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      te('In biên bản thất bại');
    }
  }, []);

  const columns: ColumnDef<ConsultationDto>[] = useMemo(() => [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (c) => {
        const p = patientOf(c);
        return p ? (
          <div className="cell-2l">
            <strong>{p.patientName}</strong>
            <span className="mono">{p.patientCode} · {p.departmentName}</span>
          </div>
        ) : <span style={{ color: 'var(--t-2)' }}>— (đã xuất viện)</span>;
      },
    },
    { key: 'type', label: 'Loại', render: (c) => c.consultationTypeName },
    { key: 'when', label: 'Thời gian', mono: true, width: 130, render: (c) => fmtDT(c) },
    { key: 'location', label: 'Địa điểm', render: (c) => c.location || '—' },
    { key: 'chairman', label: 'Chủ trì', render: (c) => c.chairmanName || '—' },
    { key: 'members', label: 'TV', mono: true, width: 44, render: (c) => String(c.members?.length ?? 0) },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (c) => {
        const k = csKey(c.status);
        return <StatusBadge tone={CS_TONE[k]} dot>{CS_LABEL[k as Exclude<CsKey, 'all'>]}</StatusBadge>;
      },
    },
    {
      key: 'approval', label: 'Duyệt LĐ', width: 110,
      render: (c) => {
        if (c.consultationType !== 3) return null;
        const ak = csApprovalKey(c);
        if (!ak) return <StatusBadge tone="info" dot>Chưa trình</StatusBadge>;
        return <StatusBadge tone={CS_TONE[ak]} dot>{CS_LABEL[ak as Exclude<CsKey, 'all'>]}</StatusBadge>;
      },
    },
  ], [patientOf]);

  return (
    <>
      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN, chủ trì, địa điểm, lý do…" />
        <StatusTabs<CsKey> value={status} onChange={setStatus} tabs={CS_TABS} counts={csCounts} />
        <span className="spacer" />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} cuộc hội chẩn
        </span>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <TermIcon name="plus" size={12} /> Mời hội chẩn
        </Btn>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading
          ? <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', padding: 'var(--space-24)' }}>Đang tải hội chẩn…</div>
          : (
            <DataTable<ConsultationDto>
              columns={columns}
              data={filtered}
              rowKey={(c) => c.id}
              onRowClick={(c) => setSel(c)}
              actions={(c) => (
                <>
                  {c.status < 2 && (
                    <ActBtn ic="check" title="Hoàn thành hội chẩn"
                      onClick={() => setCompleting(c)} />
                  )}
                  {c.consultationType === 3 && c.approvalStatus !== 2 && (
                    <ActBtn ic="shield" title="Duyệt / Từ chối (Lãnh đạo)"
                      onClick={() => setApproving(c)} />
                  )}
                  <ActBtn ic="printer" title="In biên bản" onClick={() => void onPrint(c)} />
                </>
              )}
            />
          )}
      </div>

      {/* ── Drawer chi tiết ── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel ? (patientOf(sel)?.patientName || 'Hội chẩn') : ''}
        sub={sel ? `${sel.consultationTypeName} · ${fmtDT(sel)}` : undefined}
        footer={sel && (
          <>
            {sel.status < 2 && (
              <Btn variant="primary" onClick={() => { setCompleting(sel); }}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </Btn>
            )}
            {sel.consultationType === 3 && sel.approvalStatus !== 2 && (
              <Btn variant="primary" onClick={() => { setApproving(sel); }}>
                <TermIcon name="shield" size={12} /> Duyệt / Từ chối
              </Btn>
            )}
            <Btn variant="ghost" onClick={() => void onPrint(sel)}>
              <TermIcon name="printer" size={12} /> In biên bản
            </Btn>
          </>
        )}
      >
        {sel && (
          <>
            <DrSec title="Thông tin chung">
              <div className="rec-kv">
                <DrField lbl="Loại">{sel.consultationTypeName}</DrField>
                <DrField lbl="Thời gian">{fmtDT(sel)}</DrField>
                <DrField lbl="Địa điểm">{sel.location || '—'}</DrField>
                <DrField lbl="Trạng thái">
                  <StatusBadge tone={CS_TONE[csKey(sel.status)]} dot>
                    {CS_LABEL[csKey(sel.status) as Exclude<CsKey, 'all'>]}
                  </StatusBadge>
                </DrField>
                <DrField lbl="Chủ trì">{sel.chairmanName || '—'}</DrField>
                <DrField lbl="Thư ký">{sel.secretaryName || '—'}</DrField>
              </div>
            </DrSec>
            <DrSec title="Nội dung">
              <DrField lbl="Lý do hội chẩn">{sel.reason || '—'}</DrField>
              <DrField lbl="Tóm tắt lâm sàng">{sel.clinicalFindings || '—'}</DrField>
              {sel.labResults && <DrField lbl="KQ xét nghiệm">{sel.labResults}</DrField>}
              {sel.imageResults && <DrField lbl="KQ CĐHA">{sel.imageResults}</DrField>}
            </DrSec>
            <DrSec title={`Thành viên (${sel.members?.length ?? 0})`}>
              {(sel.members?.length ?? 0) === 0 && <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Chưa có thành viên</div>}
              {sel.members?.map((m) => (
                <div key={m.doctorId} className="rec-kv" style={{ marginBottom: 'var(--space-4)' }}>
                  <DrField lbl={m.doctorName || 'BS'}>{m.opinion || 'Chưa có ý kiến'}</DrField>
                </div>
              ))}
            </DrSec>
            {sel.status === 2 && (
              <DrSec title="Kết luận">
                <DrField lbl="Kết luận hội chẩn">{sel.conclusion || '—'}</DrField>
                <DrField lbl="Hướng điều trị">{sel.treatment || '—'}</DrField>
              </DrSec>
            )}
            {sel.consultationType === 3 && sel.approvalStatus > 0 && (
              <DrSec title="Duyệt lãnh đạo">
                <div className="rec-kv">
                  <DrField lbl="Kết quả duyệt">
                    {(() => {
                      const ak = csApprovalKey(sel);
                      return ak ? <StatusBadge tone={CS_TONE[ak]} dot>{CS_LABEL[ak as Exclude<CsKey, 'all'>]}</StatusBadge> : null;
                    })()}
                  </DrField>
                  {sel.approvedByName && <DrField lbl="Người duyệt">{sel.approvedByName}</DrField>}
                  {sel.approvedAt && <DrField lbl="Thời điểm">{fmtDateTime(sel.approvedAt)}</DrField>}
                  {sel.approvalNote && <DrField lbl="Ghi chú">{sel.approvalNote}</DrField>}
                </div>
              </DrSec>
            )}
          </>
        )}
      </DrawerShell>

      <CreateConsultationModal
        open={createOpen}
        inpatients={inpatients}
        onClose={() => setCreateOpen(false)}
        onDone={() => { setCreateOpen(false); void load(); }}
      />

      <CompleteConsultationModal
        target={completing}
        onClose={() => setCompleting(null)}
        onDone={(updated) => {
          setCompleting(null);
          setSel((s) => (s && s.id === updated.id ? updated : s));
          void load();
        }}
      />

      <ApproveConsultationModal
        target={approving}
        onClose={() => setApproving(null)}
        onDone={(updated) => {
          setApproving(null);
          setSel((s) => (s && s.id === updated.id ? updated : s));
          void load();
        }}
      />
    </>
  );
};

/* ── Modal mời hội chẩn (pattern raw useState như AdmitModal) ── */
const CreateConsultationModal: React.FC<{
  open: boolean;
  inpatients: InpatientListDto[];
  onClose: () => void;
  onDone: () => void;
}> = ({ open, inpatients, onClose, onDone }) => {
  const [admissionId, setAdmissionId] = useState('');
  const [type, setType] = useState(1);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [chairmanId, setChairmanId] = useState('');
  const [secretaryId, setSecretaryId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [clinical, setClinical] = useState('');
  const [signers, setSigners] = useState<EmrSignerCatalogDto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // reset form mỗi lần mở
    setAdmissionId(''); setType(1); setDate(dayjs().format('YYYY-MM-DD')); setTime('');
    setLocation(''); setChairmanId(''); setSecretaryId(''); setMemberIds([]);
    setReason(''); setClinical('');
    getSigners().then(setSigners).catch(() => setSigners([]));
  }, [open]);

  const patientOpts = useMemo(() => inpatients.map((p) => ({
    value: p.admissionId,
    label: `${p.patientName} · ${p.patientCode} · ${p.departmentName}${p.bedName ? ` · ${p.bedName}` : ''}`,
  })), [inpatients]);

  const signerOpts = useMemo(() => signers.map((s) => ({
    value: s.userId,
    label: s.title ? `${s.fullName} — ${s.title}` : s.fullName,
  })), [signers]);

  const submit = async () => {
    if (!admissionId) { te('Chọn bệnh nhân hội chẩn'); return; }
    if (!chairmanId || !secretaryId) { te('Chọn chủ trì và thư ký'); return; }
    if (!reason.trim()) { te('Nhập lý do hội chẩn'); return; }
    setSaving(true);
    try {
      const dto: CreateConsultationDto = {
        admissionId,
        consultationType: type,
        consultationDate: `${date}T00:00:00`,
        consultationTime: time ? `${time}:00` : undefined,
        location: location.trim() || undefined,
        chairmanId,
        secretaryId,
        memberIds: memberIds.filter((m) => m !== chairmanId && m !== secretaryId),
        reason: reason.trim(),
        clinicalFindings: clinical.trim() || undefined,
      };
      await createConsultation(dto);
      tk('Đã tạo cuộc hội chẩn');
      onDone();
    } catch {
      te('Tạo hội chẩn thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Mời hội chẩn"
      size="md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Tạo hội chẩn'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
        <DrField lbl="Bệnh nhân *">
          <Select showSearch value={admissionId || undefined} onChange={setAdmissionId}
            options={patientOpts} optionFilterProp="label" placeholder="Chọn BN nội trú"
            style={{ width: '100%' }} size="small" />
        </DrField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-8)' }}>
          <DrField lbl="Loại hội chẩn *">
            <Select value={type} onChange={setType} options={TYPE_OPTS} style={{ width: '100%' }} size="small" />
          </DrField>
          <DrField lbl="Ngày *">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} size="small" />
          </DrField>
          <DrField lbl="Giờ">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} size="small" />
          </DrField>
        </div>
        <DrField lbl="Địa điểm">
          <Input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="VD: Phòng giao ban khoa" size="small" />
        </DrField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
          <DrField lbl="Chủ trì *">
            <Select showSearch value={chairmanId || undefined} onChange={setChairmanId}
              options={signerOpts} optionFilterProp="label" placeholder="Chọn BS chủ trì"
              style={{ width: '100%' }} size="small" />
          </DrField>
          <DrField lbl="Thư ký *">
            <Select showSearch value={secretaryId || undefined} onChange={setSecretaryId}
              options={signerOpts} optionFilterProp="label" placeholder="Chọn thư ký"
              style={{ width: '100%' }} size="small" />
          </DrField>
        </div>
        <DrField lbl="Thành viên tham gia">
          <Select mode="multiple" showSearch value={memberIds} onChange={setMemberIds}
            options={signerOpts} optionFilterProp="label" placeholder="Chọn các BS tham gia"
            style={{ width: '100%' }} size="small" maxTagCount={4} />
        </DrField>
        <DrField lbl="Lý do hội chẩn *">
          <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)}
            rows={2} placeholder="Lý do mời hội chẩn" />
        </DrField>
        <DrField lbl="Tóm tắt lâm sàng">
          <Input.TextArea value={clinical} onChange={(e) => setClinical(e.target.value)}
            rows={3} placeholder="Diễn biến, tình trạng hiện tại, đã điều trị gì…" />
        </DrField>
      </div>
    </ModalShell>
  );
};

/* ── Modal hoàn thành hội chẩn ── */
const CompleteConsultationModal: React.FC<{
  target: ConsultationDto | null;
  onClose: () => void;
  onDone: (updated: ConsultationDto) => void;
}> = ({ target, onClose, onDone }) => {
  const [conclusion, setConclusion] = useState('');
  const [treatment, setTreatment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) { setConclusion(target.conclusion || ''); setTreatment(target.treatment || ''); }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    if (!conclusion.trim()) { te('Nhập kết luận hội chẩn'); return; }
    setSaving(true);
    try {
      const r = await completeConsultation(target.id, conclusion.trim(), treatment.trim() || undefined);
      tk('Đã hoàn thành hội chẩn');
      onDone(r.data);
    } catch {
      te('Hoàn thành hội chẩn thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={!!target}
      onClose={onClose}
      title="Hoàn thành hội chẩn"
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" onClick={() => void submit()} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Hoàn thành'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
        <DrField lbl="Kết luận hội chẩn *">
          <Input.TextArea value={conclusion} onChange={(e) => setConclusion(e.target.value)}
            rows={3} placeholder="Kết luận thống nhất của hội đồng" />
        </DrField>
        <DrField lbl="Hướng điều trị">
          <Input.TextArea value={treatment} onChange={(e) => setTreatment(e.target.value)}
            rows={3} placeholder="Kế hoạch điều trị tiếp theo" />
        </DrField>
      </div>
    </ModalShell>
  );
};

/* ── Modal duyệt / từ chối hội chẩn thuốc dấu * (F1.4) ── */
const ApproveConsultationModal: React.FC<{
  target: ConsultationDto | null;
  onClose: () => void;
  onDone: (updated: ConsultationDto) => void;
}> = ({ target, onClose, onDone }) => {
  const [decision, setDecision] = useState<number>(2); // 2=Duyệt, 3=Từ chối
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) { setDecision(2); setNote(''); }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const r = await approveConsultation(target.id, decision, note.trim() || undefined);
      tk(decision === 2 ? 'Đã duyệt hội chẩn' : 'Đã từ chối hội chẩn');
      onDone(r.data);
    } catch {
      te('Thao tác duyệt thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={!!target}
      onClose={onClose}
      title="Duyệt hội chẩn thuốc dấu *"
      size="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant={decision === 3 ? 'crit' : 'primary'} onClick={() => void submit()} disabled={saving}>
            {saving ? 'Đang lưu…' : decision === 2 ? 'Duyệt' : 'Từ chối'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
        <DrField lbl="Quyết định *">
          <Select
            value={decision}
            onChange={setDecision}
            options={[
              { value: 2, label: 'Duyệt' },
              { value: 3, label: 'Từ chối' },
            ]}
            style={{ width: '100%' }}
            size="small"
          />
        </DrField>
        <DrField lbl="Ghi chú">
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={decision === 3 ? 'Lý do từ chối (bắt buộc khi từ chối)' : 'Ghi chú thêm (tùy chọn)'}
          />
        </DrField>
      </div>
    </ModalShell>
  );
};

export default ConsultationSection;
