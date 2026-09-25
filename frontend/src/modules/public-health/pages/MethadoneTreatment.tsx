import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import { message } from 'antd';
import {
  searchMethadonePatients, updatePatient, recordDose, recordUrineTest, getDosingHistory, enrollPatient,
} from '../api/methadone';
import type { MethadonePatient, DoseRecord } from '../api/methadone';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { apiClient } from '../../../services/apiClient';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, Btn,
  DrawerShell, ModalShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { RowActions, RefreshButton } from '../../../components/actions';
import { SortTh, useSortableRows } from '../../../components/table';

const DOSE_RULES = [
  { required: true, message: 'Nhập liều' },
  { validator: (_: unknown, value: number) => (value === undefined || value === null || (value > 0 && value <= 300))
      ? Promise.resolve() : Promise.reject(new Error('Liều hợp lệ: > 0 và ≤ 300 mg')) },
];

// Edit thông tin điều trị (PUT /public-health/methadone/patients/{id}) — chỉ các trường BE lưu thật.
const MTD_FIELDS: CrudFieldCfg[] = [
  { key: 'currentDose', label: 'Liều hiện tại (mg)', type: 'number', required: true, rules: DOSE_RULES },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Đang điều trị' }, { value: 1, label: 'Tạm ngưng' }, { value: 2, label: 'Hoàn thành' },
    { value: 3, label: 'Chuyển cơ sở' }, { value: 4, label: 'Bỏ trị' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

interface PatientOption { id: string; patientCode: string; fullName: string }

const PHASE_LABEL: Record<string, string> = {
  induction: 'Khởi liều', stabilization: 'Ổn định', maintenance: 'Duy trì', tapering: 'Giảm liều',
  '1': 'Khởi liều', '2': 'Ổn định', '3': 'Duy trì', '4': 'Giảm liều',
};
const PHASE_TONE: Record<string, 'ok' | 'info' | 'warn'> = {
  induction: 'warn', '1': 'warn',
  stabilization: 'info', '2': 'info',
  maintenance: 'ok', '3': 'ok',
  tapering: 'info', '4': 'info',
};

type SKey = 'active' | 'suspended' | 'discharged' | 'transferred' | 'dropped';
const STATUS_TABS = [
  { v: 'active' as SKey,      l: 'Đang điều trị', tone: 'ok' as const },
  { v: 'suspended' as SKey,   l: 'Tạm dừng',      tone: 'warn' as const },
  { v: 'discharged' as SKey,  l: 'Hoàn thành',    tone: 'info' as const },
  { v: 'transferred' as SKey, l: 'Chuyển',        tone: 'info' as const },
  { v: 'dropped' as SKey,     l: 'Bỏ trị',        tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'active' : n === 1 ? 'suspended' : n === 2 ? 'discharged' : n === 3 ? 'transferred' : 'dropped';
const phaseKey = (p?: string) => (p || '').toLowerCase();

const PER = 18;

// BE CreateMethadoneDosingDto.Status: 0=Given, 1=Missed, 2=Refused, 3=Holiday
const DOSE_STATUS: Record<number, string> = { 0: 'Đã cấp', 1: 'Bỏ liều', 2: 'Từ chối', 3: 'Nghỉ lễ' };

const MethadoneTreatmentV2: React.FC = () => {
  const [items, setItems] = useState<MethadonePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SKey | 'all'>('all');
  const [fPhase, setFPhase] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<MethadonePatient | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchMethadonePatients({ keyword: search });
      setItems(normalizeArrayResponse<MethadonePatient>(r));
    } catch { ti('Không tải được BN methadone'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const phases = useMemo(() => {
    const set = new Set(items.map((r) => r.phase).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: PHASE_LABEL[phaseKey(v)] || v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fPhase && r.phase !== fPhase) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.phone, r.address]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fPhase]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));

  const cols: ColumnDef<MethadonePatient>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
          {r.patientCode}
        </div>
      </div>
    ) },
    { key: 'enroll', label: 'Đăng ký', mono: true, render: (r) => dayjs(r.enrollmentDate).format('DD/MM/YYYY') },
    { key: 'phase', label: 'Pha', render: (r) => (
      <StatusBadge tone={PHASE_TONE[phaseKey(r.phase)] || 'info'}>{PHASE_LABEL[phaseKey(r.phase)] || r.phase}</StatusBadge>
    ) },
    { key: 'dose', label: 'Liều', mono: true, render: (r) => <b>{r.currentDose} mg</b> },
    { key: 'last', label: 'Liều cuối', mono: true, render: (r) => r.lastDoseDate ? dayjs(r.lastDoseDate).format('DD/MM/YYYY') : '—' },
    { key: 'miss', label: 'Bỏ liều', mono: true, render: (r) => r.missedDoses > 0
      ? <span style={{ color: 'var(--a-or-text)', fontWeight: 600 }}>{r.missedDoses}</span>
      : <span style={{ color: 'var(--t-2)' }}>0</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openEdit = (r: MethadonePatient) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  // ── Đăng ký BN mới ───────────────────────────────────────────────────────
  // BE enroll cần PatientId của BN đã có trong HIS (form cũ chỉ nhập họ tên → không thể lưu).
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [patientOpts, setPatientOpts] = useState<PatientOption[]>([]);
  const searchPatients = useCallback((kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    apiClient.post<unknown>('/patients/search', { keyword: kw.trim(), page: 1, pageSize: 20 })
      .then((r) => setPatientOpts(normalizeArrayResponse<PatientOption>(r.data)))
      .catch(() => { /* đang gõ dở — không toast */ });
  }, []);
  const enrollFields = useMemo<CrudFieldCfg[]>(() => [
    { key: 'patientId', label: 'Bệnh nhân', type: 'autocomplete', required: true,
      options: patientOpts.map((p) => ({ value: p.id, label: `${p.patientCode} — ${p.fullName}` })),
      onSearch: searchPatients, debounce: 300, placeholder: 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…' },
    { key: 'enrollmentDate', label: 'Ngày đăng ký', type: 'date', required: true },
    { key: 'currentDose', label: 'Liều khởi đầu (mg)', type: 'number', required: true, placeholder: 'mg', rules: DOSE_RULES },
    { key: 'notes', label: 'Ghi chú', type: 'textarea', placeholder: 'Tiền sử, ghi chú...' },
  ], [patientOpts, searchPatients]);

  // ── Cấp liều ──────────────────────────────────────────────────────────────
  const [doseTarget, setDoseTarget] = useState<MethadonePatient | null>(null);
  const [doseAmt, setDoseAmt] = useState('');
  const [doseType, setDoseType] = useState('witnessed');
  // Kết quả lần cấp (BE Status 0=Đã cấp · 1=Bỏ liều · 2=Từ chối · 3=Nghỉ lễ) + ngày — trước đây chỉ ghi được
  // "Đã cấp" hôm nay → cột/KPI "Bỏ liều" không bao giờ tăng từ UI, liều mang về cho ngày mai không ghi được.
  const [doseStatus, setDoseStatus] = useState(0);
  const [doseDate, setDoseDate] = useState('');
  const [doseSubmitting, setDoseSubmitting] = useState(false);

  const openDose = (r: MethadonePatient) => {
    setDoseTarget(r);
    setDoseAmt(String(r.currentDose));
    setDoseType(r.doseType || 'witnessed');
    setDoseStatus(0);
    setDoseDate(dayjs().format('YYYY-MM-DD'));
  };

  const submitDose = async () => {
    if (!doseTarget) return;
    const given = doseStatus === 0;
    const amt = given ? parseFloat(doseAmt) : 0;
    if (given && (!amt || amt <= 0)) { message.error('Vui lòng nhập liều hợp lệ'); return; }
    if (given && doseTarget.currentDose > 0 && amt > doseTarget.currentDose) {
      message.error(`Liều cấp vượt liều chỉ định (${doseTarget.currentDose} mg) — cập nhật liều điều trị trước`);
      return;
    }
    setDoseSubmitting(true);
    try {
      // Hôm nay → để api gửi giờ VN hiện tại (BE chặn cấp liều lần 2 cùng ngày VN); ngày khác → gửi ngày đã chọn.
      const isToday = !doseDate || doseDate === dayjs().format('YYYY-MM-DD');
      await recordDose({
        patientId: doseTarget.id,
        doseAmount: amt,
        doseType,
        status: doseStatus,
        doseDate: isToday ? undefined : doseDate,
      });
      tk(given ? `Đã cấp liều ${amt} mg cho ${doseTarget.patientName}`
        : `Đã ghi nhận "${DOSE_STATUS[doseStatus]}" cho ${doseTarget.patientName}`);
      setDoseTarget(null);
      load();
    } catch (e) { message.error(friendlyErrorMessage(e, 'Cấp liều thất bại')); }
    finally { setDoseSubmitting(false); }
  };

  // ── Chọn BN khi mở Cấp liều / XN từ thanh công cụ ─────────────────────────
  const [pickFor, setPickFor] = useState<'dose' | 'urine' | null>(null);
  const [pickId, setPickId] = useState('');
  const pickOptions = useMemo(
    () => items.filter((p) => pickFor === 'urine' || p.status === 0)
      .map((p) => ({ v: p.id, l: `${p.patientCode} — ${p.patientName}` })),
    [items, pickFor],
  );
  const confirmPick = () => {
    const p = items.find((x) => x.id === pickId);
    if (!p) { message.warning('Chọn bệnh nhân'); return; }
    const mode = pickFor;
    setPickFor(null);
    if (mode === 'dose') openDose(p); else openUrine(p);
  };

  // ── XN nước tiểu ──────────────────────────────────────────────────────────
  const [urineTarget, setUrineTarget] = useState<MethadonePatient | null>(null);
  const [morphine, setMorphine] = useState('negative');
  const [amphetamine, setAmphetamine] = useState('negative');
  const [thc, setThc] = useState('negative');
  const [methadoneResult, setMethadoneResult] = useState('positive');
  const [benzodiazepine, setBenzodiazepine] = useState('negative');
  const [urineSubmitting, setUrineSubmitting] = useState(false);

  const openUrine = (r?: MethadonePatient) => {
    setUrineTarget(r || null);
    setMorphine('negative'); setAmphetamine('negative'); setThc('negative');
    setMethadoneResult('positive'); setBenzodiazepine('negative');
  };

  const submitUrine = async () => {
    if (!urineTarget) { message.error('Chọn bệnh nhân trước'); return; }
    setUrineSubmitting(true);
    try {
      await recordUrineTest({
        patientId: urineTarget.id,
        morphine, amphetamine, thc,
        methadone: methadoneResult,
        benzodiazepine,
      });
      tk(`Đã ghi XN nước tiểu cho ${urineTarget.patientName}`);
      setUrineTarget(null);
      load();
    } catch (e) { message.error(friendlyErrorMessage(e, 'Ghi XN nước tiểu thất bại')); }
    finally { setUrineSubmitting(false); }
  };

  // ── Lịch sử cấp liều ──────────────────────────────────────────────────────
  const [histTarget, setHistTarget] = useState<MethadonePatient | null>(null);
  const [histRows, setHistRows] = useState<DoseRecord[]>([]);

  const histSort = useSortableRows(histRows, {
    when: (r) => r.doseDate,
    dose: (r) => r.doseAmount,
    type: (r) => r.doseType,
    by: (r) => r.administeredBy,
    st: (r) => r.status,
  });
  const [histLoading, setHistLoading] = useState(false);

  const openHistory = async (r: MethadonePatient) => {
    setHistTarget(r);
    setHistRows([]);
    setHistLoading(true);
    try {
      const rows = await getDosingHistory({ patientId: r.id });
      setHistRows(rows);
    } catch { ti('Không tải được lịch sử cấp liều'); }
    finally { setHistLoading(false); }
  };


  const actions = (r: MethadonePatient) => (
    <div className="ab-actions">
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setSel(r) },
        { key: 'urine', icon: 'activity', label: 'XN nước tiểu', onClick: () => openUrine(r) },
        // Cấp liều chỉ hiện với BN đang điều trị (status === 0) — giữ nguyên điều kiện lâm sàng của v2 cũ
        { key: 'dose', icon: 'check', label: 'Cấp liều', primary: true,
          hidden: r.status !== 0, onClick: () => openDose(r) },
        { key: 'edit', icon: 'edit', label: 'Sửa điều trị', onClick: () => openEdit(r) },
      ]} />
    </div>
  );

  const avgDose = items.length > 0 ? Math.round(items.reduce((s, p) => s + p.currentDose, 0) / items.length) : 0;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng BN', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang điều trị', val: counts.active || 0, sub: `${Math.round(((counts.active || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Có bỏ liều', val: items.filter((p) => p.missedDoses > 0).length, sub: 'cần theo dõi', tone: 'warn' },
        { lbl: 'TB liều', val: avgDose, unit: 'mg', sub: 'trung bình', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / SĐT / địa chỉ…" />
        <Filter value={fPhase} onChange={setFPhase} options={phases} placeholder="▾ Pha điều trị" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFPhase(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <RefreshButton onRefresh={async () => { await load(); }} />
        {/* Trước đây 2 nút này tự lấy BN "đang điều trị" ĐẦU TIÊN trong danh sách → cấp liều/ghi XN nhầm người.
            Nay mở hộp chọn bệnh nhân. */}
        <Btn variant="ghost" onClick={() => { setPickFor('urine'); setPickId(''); }}>
          <Ico name="activity" size={12} /> XN nước tiểu
        </Btn>
        <Btn variant="primary" onClick={() => { setPickFor('dose'); setPickId(''); }}>
          <Ico name="check" size={12} /> Cấp liều
        </Btn>
        <Btn variant="primary" onClick={() => setEnrollOpen(true)}>
          <Ico name="user-plus" size={12} /> Đăng ký BN mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<MethadonePatient>
        columns={cols} data={filtered} page={page} perPage={PER} onSortChange={() => setPage(0)} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        loading={loading}
        empty="Chưa có BN methadone"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.patientCode} · ${sel.currentDose}mg/ngày` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) { openHistory(sel); setSel(null); } }}>
            <Ico name="activity" size={12} /> Lịch sử
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa điều trị
          </Btn>
          {sel && sel.status === 0 && (
            <Btn onClick={() => { openDose(sel); setSel(null); }}>
              <Ico name="check" size={12} /> Cấp liều
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
          </DrSec>
          <DrSec title="Điều trị">
            <DrField lbl="Đăng ký">{dayjs(sel.enrollmentDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Pha điều trị">
              <StatusBadge tone={PHASE_TONE[phaseKey(sel.phase)] || 'info'} dot>{PHASE_LABEL[phaseKey(sel.phase)] || sel.phase}</StatusBadge>
            </DrField>
            <DrField lbl="Liều hiện tại"><b style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{sel.currentDose} mg/ngày</b></DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Theo dõi">
            <DrField lbl="Liều cuối">{sel.lastDoseDate ? dayjs(sel.lastDoseDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Bỏ liều">
              <span style={{ color: sel.missedDoses > 0 ? 'var(--a-or-text)' : undefined, fontWeight: sel.missedDoses > 0 ? 600 : 400 }}>
                {sel.missedDoses}
              </span>
            </DrField>
            {sel.urineTestDate && <DrField lbl="XN nước tiểu cuối">{dayjs(sel.urineTestDate).format('DD/MM/YYYY')}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title="Cập nhật điều trị Methadone"
        sub={crudInit ? String(crudInit.patientName || '') : ''}
        fields={MTD_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v) => {
          if (crudInit?.id) await updatePatient(String(crudInit.id), v);
          tk('Đã cập nhật điều trị');
          load();
        }}
      />

      {/* ── Đăng ký BN mới ── */}
      <CrudModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Đăng ký bệnh nhân Methadone"
        fields={enrollFields}
        initial={null}
        size="lg"
        onSubmit={async (v) => {
          await enrollPatient({
            patientId: String(v.patientId || ''),
            enrollmentDate: v.enrollmentDate ? String(v.enrollmentDate) : undefined,
            currentDose: Number(v.currentDose),
            notes: v.notes ? String(v.notes) : undefined,
          });
          tk('Đã đăng ký bệnh nhân Methadone');
          load();
        }}
      />

      {/* ── Modal Cấp liều ── */}
      <ModalShell
        open={!!doseTarget}
        onClose={() => setDoseTarget(null)}
        title="Cấp liều Methadone"
        sub={doseTarget ? `${doseTarget.patientName} · ${doseTarget.patientCode}` : ''}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setDoseTarget(null)}>Huỷ</Btn>
          <Btn variant="primary" onClick={submitDose} disabled={doseSubmitting}>
            <Ico name="check" size={12} /> {doseSubmitting ? 'Đang lưu…' : doseStatus === 0 ? 'Xác nhận cấp liều' : 'Ghi nhận'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Kết quả</span>
            <select
              value={doseStatus}
              onChange={(e) => setDoseStatus(Number(e.target.value))}
              style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
            >
              {Object.entries(DOSE_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Ngày</span>
            <input
              type="date"
              value={doseDate}
              onChange={(e) => setDoseDate(e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
            />
          </div>
          {doseStatus === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Liều (mg) <span style={{ color: 'var(--s-crit)' }}>*</span></span>
              <input
                type="number" min={1} step={0.5}
                value={doseAmt}
                onChange={(e) => setDoseAmt(e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Hình thức</span>
            <select
              value={doseType}
              onChange={(e) => setDoseType(e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
            >
              <option value="witnessed">Uống có giám sát</option>
              <option value="takeHome">Mang về</option>
            </select>
          </div>
        </div>
      </ModalShell>

      {/* ── Chọn bệnh nhân (từ thanh công cụ) ── */}
      <ModalShell
        open={!!pickFor}
        onClose={() => setPickFor(null)}
        title={pickFor === 'dose' ? 'Cấp liều — chọn bệnh nhân' : 'XN nước tiểu — chọn bệnh nhân'}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setPickFor(null)}>Huỷ</Btn>
          <Btn variant="primary" onClick={confirmPick}>Tiếp tục</Btn>
        </>}
      >
        <Filter value={pickId} onChange={setPickId} options={pickOptions}
          placeholder={pickFor === 'dose' ? '▾ Bệnh nhân đang điều trị' : '▾ Bệnh nhân'} />
      </ModalShell>

      {/* ── Modal XN nước tiểu ── */}
      <ModalShell
        open={!!urineTarget}
        onClose={() => setUrineTarget(null)}
        title="Ghi kết quả XN nước tiểu"
        sub={urineTarget ? `${urineTarget.patientName} · ${urineTarget.patientCode}` : ''}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setUrineTarget(null)}>Huỷ</Btn>
          <Btn variant="primary" onClick={submitUrine} disabled={urineSubmitting}>
            <Ico name="check" size={12} /> {urineSubmitting ? 'Đang lưu…' : 'Ghi kết quả'}
          </Btn>
        </>}
      >
        {([
          ['Morphine', morphine, setMorphine],
          ['Amphetamine', amphetamine, setAmphetamine],
          ['THC (cần sa)', thc, setThc],
          ['Methadone', methadoneResult, setMethadoneResult],
          ['Benzodiazepine', benzodiazepine, setBenzodiazepine],
        ] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{lbl}</span>
            <select
              value={val}
              onChange={(e) => setter(e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '4px 8px', fontSize: 'var(--fs-md)' }}
            >
              <option value="negative">Âm tính</option>
              <option value="positive">Dương tính</option>
            </select>
          </div>
        ))}
      </ModalShell>

      {/* ── Drawer Lịch sử cấp liều ── */}
      <DrawerShell
        open={!!histTarget}
        onClose={() => { setHistTarget(null); setHistRows([]); }}
        size="lg"
        title={histTarget ? `Lịch sử — ${histTarget.patientName}` : ''}
        sub={histTarget ? histTarget.patientCode : ''}
        footer={<Btn variant="ghost" onClick={() => { setHistTarget(null); setHistRows([]); }}>Đóng</Btn>}
      >
        {histLoading && <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Đang tải…</div>}
        {!histLoading && histRows.length === 0 && (
          <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)' }}>Chưa có lịch sử cấp liều</div>
        )}
        {!histLoading && histRows.length > 0 && (
          <table className="ab-tbl">
            <thead>
              <tr>
                <SortTh s={histSort} k="when">Ngày</SortTh>
                <SortTh s={histSort} k="dose">Liều (mg)</SortTh>
                <SortTh s={histSort} k="type">Hình thức</SortTh>
                <SortTh s={histSort} k="by">Người cấp</SortTh>
                <SortTh s={histSort} k="st">Trạng thái</SortTh>
              </tr>
            </thead>
            <tbody>
              {histSort.rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{dayjs(row.doseDate).format('DD/MM/YYYY')}</td>
                  <td className="mono"><b>{row.doseAmount}</b></td>
                  <td>{row.doseType === 'witnessed' ? 'Có giám sát' : 'Mang về'}</td>
                  <td>{row.administeredBy || '—'}</td>
                  <td>{DOSE_STATUS[row.status] || row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>
    </div>
  );
};

export default MethadoneTreatmentV2;
