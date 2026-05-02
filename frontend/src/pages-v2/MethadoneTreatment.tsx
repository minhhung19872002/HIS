import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchMethadonePatients } from '../api/methadone';
import type { MethadonePatient } from '../api/methadone';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchMethadonePatients({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MethadonePatient[];
      setItems(list);
    } catch { ti('Không tải được BN methadone'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const phases = useMemo(() => {
    const set = new Set(items.map((r) => r.phase).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: PHASE_LABEL[v] || v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

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
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
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

  const actions = (r: MethadonePatient) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="check" title="Cấp liều hôm nay" onClick={() => tk(`Cấp liều cho ${r.patientName}`)} />
      )}
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
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFPhase(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở XN nước tiểu')}>
          <Ico name="activity" size={12} /> XN nước tiểu
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở cấp liều hôm nay')}>
          <Ico name="check" size={12} /> Cấp liều
        </button>
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
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở lịch sử cấp liều')}>
            <Ico name="activity" size={12} /> Lịch sử
          </button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => tk('Cấp liều')}>
              <Ico name="check" size={12} /> Cấp liều
            </button>
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
    </div>
  );
};

export default MethadoneTreatmentV2;
