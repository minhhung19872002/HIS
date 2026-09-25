import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, message } from 'antd';
import {
  searchTreatments, createTreatment, updateTreatment,
  createHerbalPrescription, getHerbalPrescriptions, getHerbs, completeTreatment, cancelTreatment,
} from '../api/traditionalMedicine';
import type { TraditionalTreatment, HerbalPrescription, HerbItem } from '../api/traditionalMedicine';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { apiClient } from '../../../services/apiClient';
import { RowActions, RefreshButton } from '../../../components/actions';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, CrudModal, tk, te, ti, tw, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

// QA-R11: the form asked for a "Mã phác đồ" (BE generates it — typed value discarded), a free-text patient name
// (no patientId → herbal Rx never billed), "Mã BN" / "Kết thúc" / "Trạng thái" (not in the BE DTO — silently
// ignored, e.g. choosing "Đã huỷ" changed nothing). Patient is now picked from the patient list; end/cancel are
// row actions (Kết thúc ĐT / Hủy ĐT).
const TM_FIELDS_COMMON: CrudFieldCfg[] = [
  { key: 'treatmentType', label: 'Phương pháp', type: 'select', required: true, options: [
    { value: 'acupuncture', label: 'Châm cứu' }, { value: 'herbal', label: 'Thuốc bắc' },
    { value: 'massage', label: 'Xoa bóp' }, { value: 'cupping', label: 'Giác hơi' },
    { value: 'moxibustion', label: 'Cứu ngải' }, { value: 'combined', label: 'Kết hợp' }] },
  { key: 'diagnosis', label: 'Chẩn đoán', required: true },
  { key: 'startDate', label: 'Bắt đầu', type: 'date', required: true },
  { key: 'doctorName', label: 'BS điều trị' },
  { key: 'totalSessions', label: 'Tổng số buổi', type: 'number' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const TYPE_LABEL: Record<string, string> = {
  acupuncture: 'Châm cứu', herbal: 'Thuốc bắc', massage: 'Xoa bóp',
  cupping: 'Giác hơi', moxibustion: 'Cứu ngải', combined: 'Kết hợp',
};

type SKey = 'active' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Đang điều trị', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành',    tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',           tone: 'crit' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'active' : n === 1 ? 'completed' : 'cancelled';

const PER = 18;

const TraditionalMedicineV2: React.FC = () => {
  const [items, setItems] = useState<TraditionalTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TraditionalTreatment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchTreatments({ keyword: search });
      setItems(normalizeArrayResponse<TraditionalTreatment>(r));
    } catch { ti('Không tải được phác đồ YHCT'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.treatmentType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.treatmentCode, r.diagnosis, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));

  const cols: ColumnDef<TraditionalTreatment>[] = [
    { key: 'code', label: 'Mã PĐ', code: true, render: (r) => r.treatmentCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'type', label: 'Phương pháp', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.treatmentType] || r.treatmentType}</StatusBadge>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.diagnosis}</span> },
    { key: 'sess', label: 'Tiến độ', mono: true, render: (r) => {
      const total = r.totalSessions || 0;
      const done = r.completedSessions || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return (
        <div>
          <div>{done}/{total || '?'}</div>
          {total > 0 && <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{pct}%</div>}
        </div>
      );
    } },
    { key: 'doc', label: 'BS điều trị', render: (r) => r.doctorName },
    { key: 'date', label: 'Bắt đầu', mono: true, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [patientOpts, setPatientOpts] = useState<{ id: string; patientCode: string; fullName: string }[]>([]);
  const searchPatients = useCallback((kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    apiClient.post<unknown>('/patients/search', { keyword: kw.trim(), page: 1, pageSize: 20 })
      .then((r) => setPatientOpts(normalizeArrayResponse<{ id: string; patientCode: string; fullName: string }>(r.data)))
      .catch(() => { /* đang gõ dở — không toast */ });
  }, []);
  const tmFields = useMemo<CrudFieldCfg[]>(() => [
    crudInit?.id
      ? { key: 'patientName', label: 'Bệnh nhân', disabledOnEdit: true }
      : { key: 'patientId', label: 'Bệnh nhân', type: 'autocomplete', required: true,
          options: patientOpts.map((pt) => ({ value: pt.id, label: `${pt.patientCode} — ${pt.fullName}` })),
          onSearch: searchPatients, debounce: 300, placeholder: 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…',
          // QA-R11: the autocomplete also accepts free text → BE 400 INVALID_REFERENCE. Only a picked patient id passes.
          rules: [{ required: true, message: 'Chọn bệnh nhân từ danh sách' }, {
            validator: (_: unknown, v: unknown) => (!v || patientOpts.some((pt) => pt.id === v)
              ? Promise.resolve() : Promise.reject(new Error('Chọn bệnh nhân từ danh sách'))),
          }], },
    ...TM_FIELDS_COMMON,
  ], [crudInit, patientOpts, searchPatients]);
  const openCreate = () => { setCrudInit({ treatmentType: 'acupuncture' }); setCrudOpen(true); };

  // ── Hủy đợt điều trị (QA-R11) ──
  const [cancelTarget, setCancelTarget] = useState<TraditionalTreatment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const submitCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) { tw('Nhập lý do hủy'); return; }
    setCancelBusy(true);
    try {
      await cancelTreatment(cancelTarget.id, cancelReason.trim());
      tk('Đã hủy đợt điều trị');
      setCancelTarget(null);
      load();
    } catch (e) { te(friendlyErrorMessage(e, 'Hủy đợt điều trị thất bại')); }
    finally { setCancelBusy(false); }
  };
  const openEdit = (r: TraditionalTreatment) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  // ── Đơn thuốc bắc ────────────────────────────────────────────────────────
  const [rxTarget, setRxTarget] = useState<TraditionalTreatment | null>(null);
  const [rxList, setRxList] = useState<HerbalPrescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxFormOpen, setRxFormOpen] = useState(false);
  // F6: đơn thuốc bắc structured — chọn vị từ danh mục (Medicine type=2) + số gram/thang.
  type RxRow = { medicineId: string; name: string; unit: string; unitPrice: number; quantity: number };
  const [herbCatalog, setHerbCatalog] = useState<HerbItem[]>([]);
  const [rxRows, setRxRows] = useState<RxRow[]>([]);
  const [rxThang, setRxThang] = useState('1');
  const [rxDosage, setRxDosage] = useState('');
  const [rxPrep, setRxPrep] = useState('');
  const [rxDuration, setRxDuration] = useState('7');
  const [rxDurationUnit, setRxDurationUnit] = useState<'ngày' | 'tuần' | 'tháng'>('ngày');
  const [rxSubmitting, setRxSubmitting] = useState(false);

  const rxThangNum = Math.max(1, parseInt(rxThang, 10) || 1);
  const rxTotal = rxRows.reduce((s, r) => s + r.unitPrice * r.quantity, 0) * rxThangNum;

  const openRx = async (r: TraditionalTreatment) => {
    setRxTarget(r);
    setRxList([]);
    setRxLoading(true);
    if (herbCatalog.length === 0) {
      try { setHerbCatalog(await getHerbs()); }
      catch (e) { tw(friendlyErrorMessage(e, 'Không tải được danh mục vị thuốc. Danh sách chọn vị sẽ trống.')); }
    }
    try {
      const rows = await getHerbalPrescriptions(r.id);
      setRxList(rows);
    } catch { ti('Không tải được đơn thuốc bắc'); }
    finally { setRxLoading(false); }
  };

  const addRxRow = () => setRxRows((p) => [...p, { medicineId: '', name: '', unit: 'g', unitPrice: 0, quantity: 0 }]);
  const updateRxRow = (idx: number, patch: Partial<RxRow>) =>
    setRxRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRxRow = (idx: number) => setRxRows((p) => p.filter((_, i) => i !== idx));
  const pickHerb = (idx: number, medicineId: string) => {
    const h = herbCatalog.find((x) => x.id === medicineId);
    if (h) updateRxRow(idx, { medicineId: h.id, name: h.name, unit: h.unit, unitPrice: h.unitPrice });
    else updateRxRow(idx, { medicineId: '' });
  };

  const submitRx = async () => {
    if (!rxTarget) return;
    const valid = rxRows.filter((r) => r.medicineId && r.quantity > 0);
    if (valid.length === 0) { message.error('Chọn ít nhất 1 vị thuốc và nhập số lượng'); return; }
    setRxSubmitting(true);
    try {
      const ingredients = JSON.stringify(valid.map((r) => ({
        medicineId: r.medicineId, name: r.name, quantity: r.quantity, unit: r.unit,
      })));
      await createHerbalPrescription(rxTarget.id, {
        prescriptionDate: new Date().toISOString(),
        ingredients,
        dosage: rxDosage.trim(),
        preparation: rxPrep.trim(),
        duration: parseInt(rxDuration, 10) || 7,
        durationUnit: rxDurationUnit,
        quantity: rxThangNum, // số thang
      });
      tk('Đã tạo đơn thuốc bắc + vào viện phí');
      setRxFormOpen(false);
      setRxRows([]); setRxThang('1'); setRxDosage(''); setRxPrep(''); setRxDuration('7'); setRxDurationUnit('ngày');
      const rows = await getHerbalPrescriptions(rxTarget.id);
      setRxList(rows);
      load();
    } catch (e) { message.error(friendlyErrorMessage(e, 'Tạo đơn thuốc bắc thất bại')); }
    finally { setRxSubmitting(false); }
  };

  // Confirm do RowActions đảm nhiệm (action 'done' có `confirm`) — không bọc cf() để tránh hỏi 2 lần.
  const handleComplete = async (r: TraditionalTreatment) => {
    try {
      await completeTreatment(r.id);
      tk('Đã kết thúc điều trị');
      load();
    } catch (e) { te(friendlyErrorMessage(e, 'Kết thúc thất bại')); }
  };

  const actions = (r: TraditionalTreatment) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye',  label: 'Chi tiết', primary: true, onClick: () => setSel(r) },
        { key: 'edit', icon: 'edit', label: 'Sửa',      primary: true, hidden: r.status !== 0, onClick: () => openEdit(r) },
        { key: 'done', icon: 'check', label: 'Kết thúc ĐT', tone: 'warn',
          hidden: r.status !== 0,
          confirm: `Kết thúc điều trị cho "${r.patientName}"?`,
          onClick: () => handleComplete(r) },
        { key: 'cancel', icon: 'x', label: 'Hủy ĐT', tone: 'danger',
          hidden: r.status !== 0,
          onClick: () => { setCancelReason(''); setCancelTarget(r); } },
      ]} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phác đồ', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang điều trị', val: counts.active || 0, sub: 'BN hiện tại', tone: 'info' },
        { lbl: 'Châm cứu', val: items.filter((t) => t.treatmentType === 'acupuncture' || t.treatmentType === 'combined').length, sub: 'phác đồ', tone: 'warn' },
        { lbl: 'Hoàn thành', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã phác đồ / chẩn đoán…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Phương pháp" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await load() }} />
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Phác đồ mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TraditionalTreatment>
        columns={cols} data={filtered} page={page} perPage={PER} onSortChange={() => setPage(0)} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions} loading={loading}
        empty={'Chưa có phác đồ YHCT'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Phác đồ ${sel.treatmentCode}` : ''}
        sub={sel ? `${sel.patientName} · ${TYPE_LABEL[sel.treatmentType] || sel.treatmentType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) { openRx(sel); setSel(null); } }}>
            <Ico name="file-text" size={12} /> Đơn thuốc bắc
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa phác đồ
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin phác đồ">
            <DrField lbl="Mã phác đồ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.treatmentCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Phương pháp">
              <StatusBadge tone="info">{TYPE_LABEL[sel.treatmentType] || sel.treatmentType}</StatusBadge>
            </DrField>
            <DrField lbl="Chẩn đoán YHCT">{sel.diagnosis}</DrField>
            <DrField lbl="BS điều trị">{sel.doctorName}</DrField>
          </DrSec>
          <DrSec title="Lịch trình">
            <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>
            {sel.endDate && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Số buổi"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {sel.completedSessions || 0}/{sel.totalSessions || '?'}
            </span></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật phác đồ YHCT' : 'Phác đồ YHCT mới'}
        fields={tmFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateTreatment(String(crudInit.id), v);
          else await createTreatment(v);
          tk(editing ? 'Đã cập nhật phác đồ' : 'Đã tạo phác đồ');
          load();
        }}
      />

      <ModalShell
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        size="md"
        title={cancelTarget ? `Hủy đợt điều trị · ${cancelTarget.patientName}` : 'Hủy đợt điều trị'}
        footer={<>
          <Btn variant="ghost" onClick={() => setCancelTarget(null)}>Đóng</Btn>
          <Btn variant="primary" disabled={cancelBusy} onClick={submitCancel}>{cancelBusy ? 'Đang hủy…' : 'Hủy đợt điều trị'}</Btn>
        </>}
      >
        <div style={{ marginBottom: 'var(--space-6)', color: 'var(--t-1)' }}>Lý do hủy <span className="hui-req">*</span></div>
        <Input.TextArea rows={3} value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)} placeholder="BN chuyển viện / không tiếp tục điều trị…" />
      </ModalShell>

      {/* ── Drawer Đơn thuốc bắc ── */}
      <DrawerShell
        open={!!rxTarget}
        onClose={() => { setRxTarget(null); setRxList([]); }}
        size="lg"
        title={rxTarget ? `Đơn thuốc bắc — ${rxTarget.patientName}` : ''}
        sub={rxTarget ? `Phác đồ ${rxTarget.treatmentCode}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => { setRxTarget(null); setRxList([]); }}>Đóng</Btn>
          <Btn variant="primary" onClick={() => setRxFormOpen(true)}>
            <Ico name="plus" size={12} /> Tạo đơn mới
          </Btn>
        </>}
      >
        {rxLoading && <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Đang tải…</div>}
        {!rxLoading && rxList.length === 0 && (
          <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Chưa có đơn thuốc bắc nào</div>
        )}
        {!rxLoading && rxList.map((rx) => (
          <DrSec key={rx.id} title={`Đơn ${rx.prescriptionCode || rx.id.slice(0, 8)}`}>
            <DrField lbl="Ngày kê">{dayjs(rx.prescriptionDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Thành phần"><span style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-sm)' }}>{rx.ingredients}</span></DrField>
            {rx.dosage && <DrField lbl="Liều dùng">{rx.dosage}</DrField>}
            {rx.preparation && <DrField lbl="Cách bào chế">{rx.preparation}</DrField>}
            <DrField lbl="Thời gian"><span style={{ fontFamily: 'var(--font-mono)' }}>{rx.duration} {rx.durationUnit}</span></DrField>
            <DrField lbl="BS kê">{rx.doctorName || '—'}</DrField>
          </DrSec>
        ))}
      </DrawerShell>

      {/* ── Modal tạo đơn thuốc bắc mới ── */}
      <ModalShell
        open={rxFormOpen}
        onClose={() => setRxFormOpen(false)}
        title="Tạo đơn thuốc bắc"
        sub={rxTarget ? `${rxTarget.patientName} · ${rxTarget.treatmentCode}` : ''}
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setRxFormOpen(false)}>Huỷ</Btn>
          <Btn variant="primary" onClick={submitRx} disabled={rxSubmitting}>
            <Ico name="check" size={12} /> {rxSubmitting ? 'Đang lưu…' : 'Tạo đơn'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          {/* Herb-picker: chọn vị thuốc từ danh mục + số gram mỗi thang */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Thành phần bài thuốc (vị · gram/thang) *</span>
              <Btn variant="ghost" onClick={addRxRow}><Ico name="plus" size={11} /> Thêm vị</Btn>
            </div>
            {rxRows.length === 0 && (
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-3)', padding: '6px 0' }}>Chưa có vị thuốc — bấm “Thêm vị”.</div>
            )}
            {rxRows.map((row, idx) => {
              const herb = herbCatalog.find((x) => x.id === row.medicineId);
              return (
                <div key={idx} style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
                  <select value={row.medicineId} onChange={(e) => pickHerb(idx, e.target.value)}
                    style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 4, padding: '6px 8px', fontSize: 'var(--fs-md)' }}>
                    <option value="">— Chọn vị thuốc —</option>
                    {herbCatalog.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} ({h.unitPrice.toLocaleString('vi-VN')}đ/{h.unit}, tồn {h.stock})</option>
                    ))}
                  </select>
                  <input type="number" min={0} value={row.quantity || ''} placeholder="g/thang"
                    onChange={(e) => updateRxRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    style={{ width: 90, border: '1px solid var(--line)', borderRadius: 4, padding: '6px 8px', fontSize: 'var(--fs-md)' }} />
                  <span style={{ width: 70, fontSize: 'var(--fs-sm)', color: 'var(--t-2)', textAlign: 'right' }}>
                    {herb ? (herb.unitPrice * row.quantity).toLocaleString('vi-VN') + 'đ' : ''}
                  </span>
                  <ActBtn ic="trash" title="Xoá vị" tone="crit" onClick={() => removeRxRow(idx)} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Số thang *</span>
              <input type="number" min={1} value={rxThang} onChange={(e) => setRxThang(e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 'var(--fs-md)' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Thời gian dùng</span>
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <input type="number" min={1} value={rxDuration} onChange={(e) => setRxDuration(e.target.value)}
                  style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 'var(--fs-md)' }} />
                <select value={rxDurationUnit} onChange={(e) => setRxDurationUnit(e.target.value as 'ngày' | 'tuần' | 'tháng')}
                  style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 8px', fontSize: 'var(--fs-md)' }}>
                  <option value="ngày">ngày</option>
                  <option value="tuần">tuần</option>
                  <option value="tháng">tháng</option>
                </select>
              </div>
            </div>
          </div>
          {([['Liều dùng', rxDosage, setRxDosage], ['Cách bào chế', rxPrep, setRxPrep]] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
            <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>{lbl}</span>
              <input value={val} onChange={(e) => setter(e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 'var(--fs-md)' }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--t-1)' }}>
            Tạm tính: {rxTotal.toLocaleString('vi-VN')}đ <span style={{ fontWeight: 400, color: 'var(--t-3)', marginLeft: 'var(--space-6)' }}>({rxThangNum} thang)</span>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default TraditionalMedicineV2;
