import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchIncidents, getIncidentStats } from '../api/foodSafety';
import type { FoodSafetyIncident, FoodSafetyStats } from '../api/foodSafety';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = { 0: 'Báo cáo', 1: 'Điều tra', 2: 'Xác nhận', 3: 'Đóng' };
const SEVERITY_LABEL: Record<number, string> = { 1: 'Nhẹ', 2: 'Vừa', 3: 'Nặng', 4: 'Nguy kịch' };
const SEVERITY_TONE: Record<number, 'ok' | 'info' | 'warn' | 'crit'> = { 1: 'ok', 2: 'info', 3: 'warn', 4: 'crit' };

type SKey = 'reported' | 'investigating' | 'confirmed' | 'closed';
const STATUS_TABS = [
  { v: 'reported' as SKey,      l: 'Báo cáo',     tone: 'info' as const },
  { v: 'investigating' as SKey, l: 'Điều tra',    tone: 'warn' as const },
  { v: 'confirmed' as SKey,     l: 'Xác nhận',    tone: 'crit' as const },
  { v: 'closed' as SKey,        l: 'Đóng',        tone: 'ok' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'reported' : n === 1 ? 'investigating' : n === 2 ? 'confirmed' : 'closed';

const PER = 18;

const FoodSafetyV2: React.FC = () => {
  const [items, setItems] = useState<FoodSafetyIncident[]>([]);
  const [stats, setStats] = useState<FoodSafetyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fLoc, setFLoc] = useState('');
  const [fSev, setFSev] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<FoodSafetyIncident | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchIncidents({ keyword: search }), getIncidentStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được vụ ngộ độc thực phẩm'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const locTypes = useMemo(() => {
    const set = new Set(items.map((r) => r.locationType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.investigationStatus) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.investigationStatus) !== stab) return false;
      if (fLoc && r.locationType !== fLoc) return false;
      if (fSev && r.severity !== Number(fSev)) return false;
      if (!k) return true;
      return [r.location, r.incidentCode, r.description, r.suspectedFood]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fLoc, fSev]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<FoodSafetyIncident>[] = [
    { key: 'code', label: 'Mã vụ', code: true, render: (r) => r.incidentCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.incidentDate).format('DD/MM/YYYY') },
    { key: 'loc', label: 'Địa điểm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.location}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.locationType}</div>
      </div>
    ) },
    { key: 'aff', label: 'Người AH', mono: true, render: (r) => (
      <span style={{ color: r.totalAffected > 50 ? 'var(--a-rd-text)' : r.totalAffected > 10 ? 'var(--a-or-text)' : undefined }}>
        {r.totalAffected}
      </span>
    ) },
    { key: 'hosp', label: 'Nhập viện', mono: true, render: (r) => r.hospitalized || 0 },
    { key: 'death', label: 'Tử vong', mono: true, render: (r) => r.deaths
      ? <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{r.deaths}</span>
      : <span style={{ color: 'var(--t-2)' }}>0</span>
    },
    { key: 'sev', label: 'Mức độ', render: (r) => (
      <StatusBadge tone={SEVERITY_TONE[r.severity] || 'info'} dot>{SEVERITY_LABEL[r.severity] || '—'}</StatusBadge>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.investigationStatus));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.investigationStatus] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: FoodSafetyIncident) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.investigationStatus < 2 && (
        <ActBtn ic="activity" title="Cập nhật điều tra" onClick={() => tk(`Mở điều tra ${r.incidentCode}`)} />
      )}
    </div>
  );

  const sevOpts = [
    { v: '1', l: 'Nhẹ' }, { v: '2', l: 'Vừa' }, { v: '3', l: 'Nặng' }, { v: '4', l: 'Nguy kịch' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng vụ', val: stats?.totalIncidents ?? items.length, sub: 'tổng số' },
        { lbl: 'Đang điều tra', val: stats?.activeInvestigations ?? counts.investigating ?? 0, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Người ảnh hưởng', val: stats?.totalAffected ?? items.reduce((s, i) => s + (i.totalAffected || 0), 0), sub: 'tổng AH', tone: 'info' },
        { lbl: 'Tử vong', val: items.reduce((s, i) => s + (i.deaths || 0), 0), sub: 'liên quan', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm địa điểm / mã vụ / mô tả…" />
        <Filter value={fLoc} onChange={setFLoc} options={locTypes} placeholder="▾ Loại địa điểm" />
        <Filter value={fSev} onChange={setFSev} options={sevOpts} placeholder="▾ Mức độ" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFLoc(''); setFSev(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở báo cáo vụ mới')}>
          <Ico name="plus" size={12} /> Báo cáo vụ
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<FoodSafetyIncident>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có vụ ngộ độc'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Vụ ${sel.incidentCode}` : ''}
        sub={sel ? `${sel.location} · ${dayjs(sel.incidentDate).format('DD/MM/YYYY')}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in báo cáo')}>
            <Ico name="print" size={12} /> In báo cáo
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở cập nhật')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Vụ việc">
            <DrField lbl="Mã vụ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.incidentCode}</span></DrField>
            <DrField lbl="Ngày xảy ra">{dayjs(sel.incidentDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Báo cáo lúc">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Địa điểm">{sel.location}</DrField>
            <DrField lbl="Loại">{sel.locationType}</DrField>
            {sel.locationAddress && <DrField lbl="Địa chỉ">{sel.locationAddress}</DrField>}
            <DrField lbl="Mô tả">{sel.description}</DrField>
            {sel.suspectedFood && <DrField lbl="Thực phẩm nghi">{sel.suspectedFood}</DrField>}
            {sel.suspectedCause && <DrField lbl="Nguyên nhân nghi">{sel.suspectedCause}</DrField>}
          </DrSec>
          <DrSec title="Thiệt hại">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="Tổng người ảnh hưởng" value={sel.totalAffected} />
              <Line label="Nhập viện" value={sel.hospitalized} tone="warn" />
              <Line label="Tử vong" value={sel.deaths} tone={sel.deaths > 0 ? 'crit' : undefined} />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Mức độ" value={SEVERITY_LABEL[sel.severity] || '—'} tone={SEVERITY_TONE[sel.severity]} bold />
            </div>
          </DrSec>
          <DrSec title="Điều tra">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.investigationStatus))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.investigationStatus] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Người báo cáo">{sel.reportedByName || sel.reportedBy}</DrField>
            <DrField lbl="Cán bộ điều tra">{sel.investigatorName || '—'}</DrField>
            {sel.investigationFindings && <DrField lbl="Kết quả ĐT">{sel.investigationFindings}</DrField>}
            {sel.correctiveActions && <DrField lbl="Biện pháp KP">{sel.correctiveActions}</DrField>}
            {sel.closedDate && <DrField lbl="Ngày đóng vụ">{dayjs(sel.closedDate).format('DD/MM/YYYY')}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn'; bold?: boolean }> = ({ label, value, tone, bold }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default FoodSafetyV2;
