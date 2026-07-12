import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { message } from 'antd';
import {
  searchMethadonePatients, updatePatient, recordDose, recordUrineTest, getDosingHistory, enrollPatient,
} from '../modules/public-health/api/methadone';
import type { MethadonePatient, DoseRecord } from '../modules/public-health/api/methadone';
import { normalizeArrayResponse } from '../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

// Đăng ký BN mới vào chương trình Methadone (enrollPatient). Liều khởi đầu 5-200mg — port verbatim từ v1 (InputNumber min={5} max={200}).
const ENROLL_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Họ tên', required: true, placeholder: 'Họ và tên bệnh nhân' },
  { key: 'gender', label: 'Giới tính', type: 'select', options: [
    { value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }] },
  { key: 'dateOfBirth', label: 'Ngày sinh', type: 'date' },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'phone', label: 'Số điện thoại' },
  { key: 'enrollmentDate', label: 'Ngày đăng ký', type: 'date', required: true },
  { key: 'currentDose', label: 'Liều khởi đầu (mg)', type: 'number', required: true, placeholder: 'mg', rules: [
    { required: true, message: 'Nhập liều khởi đầu' },
    { validator: (_: unknown, value: number) => (value === undefined || value === null || (value >= 5 && value <= 200))
        ? Promise.resolve() : Promise.reject(new Error('Liều khởi đầu hợp lệ: 5-200mg')) },
  ] },
  { key: 'doseType', label: 'Hình thức uống', type: 'select', required: true, options: [
    { value: 'witnessed', label: 'Uống tại chỗ' }, { value: 'takeHome', label: 'Mang về' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea', placeholder: 'Tiền sử, ghi chú...' },
];

// Edit thông tin điều trị (updatePatient). Tránh field 'phase' do drift int/string ở DB.
const MTD_FIELDS: CrudFieldCfg[] = [
  { key: 'currentDose', label: 'Liều hiện tại (mg)', type: 'number', required: true },
  { key: 'doseType', label: 'Hình thức cấp', type: 'select', options: [
    { value: 'witnessed', label: 'Uống có giám sát' }, { value: 'takeHome', label: 'Mang về' }] },
  { key: 'attendingDoctor', label: 'BS điều trị' },
  { key: 'missedDoses', label: 'Số lần bỏ liều', type: 'number' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Đang điều trị' }, { value: 1, label: 'Tạm ngưng' }, { value: 2, label: 'Ra khỏi CT' }, { value: 3, label: 'Chuyển đi' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

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

type SKey = 'active' | 'suspended' | 'discharged' | 'transferred';
const STATUS_TABS = [
  { v: 'active' as SKey,      l: 'Đang điều trị', tone: 'ok' as const },
  { v: 'suspended' as SKey,   l: 'Tạm dừng',      tone: 'warn' as const },
  { v: 'discharged' as SKey,  l: 'Ra điều trị',   tone: 'info' as const },
  { v: 'transferred' as SKey, l: 'Chuyển',        tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'active' : n === 1 ? 'suspended' : n === 2 ? 'discharged' : 'transferred';

const PER = 18;

const MethadoneTreatmentV2: React.FC = () => {
  const [items, setItems] = useState<MethadonePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
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
    return Array.from(set).map((v) => ({ v, l: PHASE_LABEL[v] || v }));
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
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<MethadonePatient>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
          {r.patientCode} · {r.gender === 1 ? 'Nam' : 'Nữ'}
        </div>
      </div>
    ) },
    { key: 'enroll', label: 'Đăng ký', mono: true, render: (r) => dayjs(r.enrollmentDate).format('DD/MM/YYYY') },
    { key: 'phase', label: 'Pha', render: (r) => (
      <StatusBadge tone={PHASE_TONE[r.phase] || 'info'}>{PHASE_LABEL[r.phase] || r.phase}</StatusBadge>
    ) },
    { key: 'dose', label: 'Liều', mono: true, render: (r) => <b>{r.currentDose} mg</b> },
    { key: 'type', label: 'PP', render: (r) => r.doseType === 'witnessed' ? 'Uống tại CS' : 'Mang về' },
    { key: 'last', label: 'Liều cuối', mono: true, render: (r) => r.lastDoseDate ? dayjs(r.lastDoseDate).format('DD/MM HH:mm') : '—' },
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
  const [enrollOpen, setEnrollOpen] = useState(false);

  // ── Cấp liều ──────────────────────────────────────────────────────────────
  const [doseTarget, setDoseTarget] = useState<MethadonePatient | null>(null);
  const [doseAmt, setDoseAmt] = useState('');
  const [doseType, setDoseType] = useState('witnessed');
  const [doseSubmitting, setDoseSubmitting] = useState(false);

  const openDose = (r: MethadonePatient) => {
    setDoseTarget(r);
    setDoseAmt(String(r.currentDose));
    setDoseType(r.doseType || 'witnessed');
  };

  const submitDose = async () => {
    if (!doseTarget) return;
    const amt = parseFloat(doseAmt);
    if (!amt || amt <= 0) { message.error('Vui lòng nhập liều hợp lệ'); return; }
    setDoseSubmitting(true);
    try {
      await recordDose({
        patientId: doseTarget.id,
        doseDate: new Date().toISOString(),
        doseAmount: amt,
        doseType,
      });
      tk(`Đã cấp liều ${amt} mg cho ${doseTarget.patientName}`);
      setDoseTarget(null);
      load();
    } catch { message.error('Cấp liều thất bại'); }
    finally { setDoseSubmitting(false); }
  };

  // ── XN nước tiểu ──────────────────────────────────────────────────────────
  const [urineTarget, setUrineTarget] = useState<MethadonePatient | null>(null);
  const [morphine, setMorphine] = useState('negative');
  const [amphetamine, setAmphetamine] = useState('negative');
  const [thc, setThc] = useState('negative');
  const [urineSubmitting, setUrineSubmitting] = useState(false);

  const openUrine = (r?: MethadonePatient) => {
    setUrineTarget(r || null);
    setMorphine('negative'); setAmphetamine('negative'); setThc('negative');
  };

  const submitUrine = async () => {
    if (!urineTarget) { message.error('Chọn bệnh nhân trước'); return; }
    setUrineSubmitting(true);
    try {
      await recordUrineTest({
        patientId: urineTarget.id,
        testDate: new Date().toISOString(),
        morphine, amphetamine, thc,
        methadone: 'positive',
        benzodiazepine: 'negative',
      });
      tk(`Đã ghi XN nước tiểu cho ${urineTarget.patientName}`);
      setUrineTarget(null);
      load();
    } catch { message.error('Ghi XN nước tiểu thất bại'); }
    finally { setUrineSubmitting(false); }
  };

  // ── Lịch sử cấp liều ──────────────────────────────────────────────────────
  const [histTarget, setHistTarget] = useState<MethadonePatient | null>(null);
  const [histRows, setHistRows] = useState<DoseRecord[]>([]);
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

  const DOSE_STATUS: Record<number, string> = { 0: 'Đã lên lịch', 1: 'Đã cấp', 2: 'Bỏ liều', 3: 'Từ chối' };

  const actions = (r: MethadonePatient) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="XN nước tiểu" onClick={() => openUrine(r)} />
      {r.status === 0 && <ActBtn ic="check" title="Cấp liều" onClick={() => openDose(r)} />}
      <ActBtn ic="edit" title="Sửa điều trị" onClick={() => openEdit(r)} />
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
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => {
          const active = items.find((p) => p.status === 0);
          if (active) openUrine(active);
          else message.warning('Chọn bệnh nhân từ danh sách để ghi XN');
        }}>
          <Ico name="activity" size={12} /> XN nước tiểu
        </Btn>
        <Btn variant="primary" onClick={() => {
          const active = items.find((p) => p.status === 0);
          if (active) openDose(active); else message.warning('Chọn bệnh nhân từ danh sách');
        }}>
          <Ico name="check" size={12} /> Cấp liều
        </Btn>
        <Btn variant="primary" onClick={() => setEnrollOpen(true)}>
          <Ico name="user-plus" size={12} /> Đăng ký BN mới
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<MethadonePatient>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có BN methadone'}
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
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="SĐT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.phone}</span></DrField>
            <DrField lbl="Địa chỉ">{sel.address}</DrField>
          </DrSec>
          <DrSec title="Điều trị">
            <DrField lbl="Đăng ký">{dayjs(sel.enrollmentDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Pha điều trị">
              <StatusBadge tone={PHASE_TONE[sel.phase] || 'info'} dot>{PHASE_LABEL[sel.phase] || sel.phase}</StatusBadge>
            </DrField>
            <DrField lbl="Liều hiện tại"><b style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{sel.currentDose} mg/ngày</b></DrField>
            <DrField lbl="PP cấp">{sel.doseType === 'witnessed' ? 'Uống tại cơ sở' : 'Mang về'}</DrField>
            <DrField lbl="BS phụ trách">{sel.attendingDoctor}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Theo dõi">
            <DrField lbl="Liều cuối">{sel.lastDoseDate ? dayjs(sel.lastDoseDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
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
        fields={ENROLL_FIELDS}
        initial={null}
        size="lg"
        onSubmit={async (v) => {
          await enrollPatient(v);
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
            <Ico name="check" size={12} /> {doseSubmitting ? 'Đang lưu…' : 'Xác nhận cấp liều'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Liều (mg) <span style={{ color: 'var(--s-crit)' }}>*</span></span>
            <input
              type="number" min={1} step={0.5}
              value={doseAmt}
              onChange={(e) => setDoseAmt(e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '6px 10px', fontSize: 14 }}
            />
          </div>
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
              <tr><th>Ngày</th><th>Liều (mg)</th><th>Hình thức</th><th>Người cấp</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {histRows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{dayjs(row.doseDate).format('DD/MM/YYYY HH:mm')}</td>
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
