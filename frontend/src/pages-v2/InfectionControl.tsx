import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getHAICases } from '../api/infectionControl';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type Row = {
  id: string;
  caseCode?: string;
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  bedNumber?: string;
  infectionType?: string;
  infectionTypeName?: string;
  infectionSite?: string;
  onsetDate?: string;
  diagnosisDate?: string;
  organism?: string;
  isMDRO?: boolean;
  mdroType?: string;
  resistancePattern?: string;
  daysSinceAdmission?: number;
  hasCentralLine?: boolean;
  centralLineDays?: number | null;
  hasUrinaryCatheter?: boolean;
  catheterDays?: number | null;
  onVentilator?: boolean;
  ventilatorDays?: number | null;
  deviceAssociated?: boolean;
  deviceType?: string;
  deviceDays?: number;
  isOutbreakRelated?: boolean;
  status?: string | number;
  statusName?: string;
  severity?: string | number;
  severityName?: string;
  riskFactors?: string[];
  reportedBy?: string;
  reportedAt?: string;
  requiresIsolation?: boolean;
};

const SEVERITY_LABEL: Record<string, string> = { Mild: 'Nhẹ', Moderate: 'Vừa', Severe: 'Nặng' };
const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { Mild: 'ok', Moderate: 'warn', Severe: 'crit' };

type SKey = 'suspected' | 'confirmed' | 'resolved' | 'excluded';
const STATUS_TABS = [
  { v: 'suspected' as SKey, l: 'Nghi ngờ',  tone: 'warn' as const },
  { v: 'confirmed' as SKey, l: 'Xác định',  tone: 'crit' as const },
  { v: 'resolved' as SKey,  l: 'Đã giải quyết', tone: 'ok' as const },
  { v: 'excluded' as SKey,  l: 'Loại trừ',  tone: 'info' as const },
];

const sKey = (st: string | number | undefined): SKey => {
  const k = String(st || '').toLowerCase();
  if (k === 'confirmed' || k === '1') return 'confirmed';
  if (k === 'resolved' || k === '2') return 'resolved';
  if (k === 'excluded' || k === '3' || k === 'deceased') return 'excluded';
  return 'suspected';
};

const isDevice = (r: Row) => r.deviceAssociated || r.hasCentralLine || r.hasUrinaryCatheter || r.onVentilator;

const PER = 18;

const InfectionControlV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fInfType, setFInfType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getHAICases({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được ca HAI'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const infTypes = useMemo(() => {
    const set = new Set(items.map((r) => r.infectionTypeName || r.infectionType).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
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
      const t = r.infectionTypeName || r.infectionType;
      if (fInfType && t !== fInfType) return false;
      if (!k) return true;
      return [r.caseCode, r.patientName, r.patientCode, r.organism, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fInfType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã ca', code: true, render: (r) => r.caseCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode || '—'}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'inf', label: 'Loại NK', render: (r) => r.infectionTypeName || r.infectionType || '—' },
    { key: 'org', label: 'Mầm bệnh', render: (r) => (
      <div>
        <div style={{ fontSize: 12 }}>{r.organism || '—'}</div>
        {r.isMDRO && <StatusBadge tone="crit" dot>MDRO</StatusBadge>}
      </div>
    ) },
    { key: 'days', label: 'Ngày NV', mono: true, render: (r) => r.daysSinceAdmission ?? '—' },
    { key: 'dev', label: 'Thiết bị', render: (r) => isDevice(r)
      ? <StatusBadge tone="warn" dot>{r.hasCentralLine ? 'CL' : r.hasUrinaryCatheter ? 'UC' : r.onVentilator ? 'Vent' : 'TB'}</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'sev', label: 'Mức', render: (r) => {
      const s = String(r.severity || '');
      const t = SEVERITY_TONE[s] || 'info';
      return <StatusBadge tone={t} dot>{r.severityName || SEVERITY_LABEL[s] || '—'}</StatusBadge>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {sKey(r.status) === 'suspected' && (
        <ActBtn ic="check" title="Xác nhận" onClick={() => tk(`Xác nhận ${r.caseCode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng ca HAI', val: items.length, sub: 'tất cả' },
        { lbl: 'MDRO', val: items.filter((c) => c.isMDRO).length, sub: 'kháng đa thuốc', tone: 'crit' },
        { lbl: 'Liên quan TB', val: items.filter(isDevice).length, sub: 'CLABSI/CAUTI/VAP', tone: 'warn' },
        { lbl: 'Ổ dịch', val: items.filter((c) => c.isOutbreakRelated).length, sub: 'cluster', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ca / mầm bệnh…" />
        <Filter value={fInfType} onChange={setFInfType} options={infTypes} placeholder="▾ Loại NK" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFInfType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở cách ly')}>
          <Ico name="alert" size={12} /> Cách ly
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở báo cáo HAI')}>
          <Ico name="plus" size={12} /> Báo cáo HAI
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có ca HAI'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Ca HAI ${sel.caseCode || '—'}` : ''}
        sub={sel ? `${sel.patientName || '—'} · ${sel.organism || sel.infectionTypeName || '—'}` : ''}
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
          <DrSec title="Bệnh nhân & vị trí">
            <DrField lbl="Mã ca"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.caseCode || '—'}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Giường">{sel.bedNumber || '—'}</DrField>
          </DrSec>
          <DrSec title="Nhiễm khuẩn">
            <DrField lbl="Loại NK">{sel.infectionTypeName || sel.infectionType || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.infectionSite || '—'}</DrField>
            {sel.onsetDate && <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>}
            {sel.diagnosisDate && <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Ngày sau NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.daysSinceAdmission ?? '—'}</span></DrField>
            <DrField lbl="Mầm bệnh">{sel.organism || '—'}</DrField>
            <DrField lbl="MDRO">
              {sel.isMDRO
                ? <StatusBadge tone="crit" dot>{sel.mdroType || 'Có'}</StatusBadge>
                : <span style={{ color: 'var(--t-2)' }}>Không</span>}
            </DrField>
            {sel.resistancePattern && <DrField lbl="Kháng">{sel.resistancePattern}</DrField>}
          </DrSec>
          {(sel.hasCentralLine || sel.hasUrinaryCatheter || sel.onVentilator || sel.deviceAssociated) && (
            <DrSec title="Thiết bị xâm lấn">
              {sel.hasCentralLine && <DrField lbl="Catheter TMTT">{sel.centralLineDays ?? '?'} ngày</DrField>}
              {sel.hasUrinaryCatheter && <DrField lbl="Sonde tiểu">{sel.catheterDays ?? '?'} ngày</DrField>}
              {sel.onVentilator && <DrField lbl="Thở máy">{sel.ventilatorDays ?? '?'} ngày</DrField>}
              {sel.deviceAssociated && sel.deviceType && (
                <DrField lbl="TB khác">{sel.deviceType}{sel.deviceDays ? ` · ${sel.deviceDays} ngày` : ''}</DrField>
              )}
            </DrSec>
          )}
          <DrSec title="Đánh giá">
            <DrField lbl="Mức độ">
              <StatusBadge tone={SEVERITY_TONE[String(sel.severity || '')] || 'info'} dot>
                {sel.severityName || SEVERITY_LABEL[String(sel.severity || '')] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Liên quan ổ dịch">{sel.isOutbreakRelated ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Cách ly">{sel.requiresIsolation ? 'Có' : 'Không'}</DrField>
            {sel.riskFactors && sel.riskFactors.length > 0 && (
              <DrField lbl="Yếu tố nguy cơ">{sel.riskFactors.join(', ')}</DrField>
            )}
            <DrField lbl="Người báo cáo">{sel.reportedBy || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default InfectionControlV2;
