import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import client from '../api/client';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

interface SpecialtyRecord {
  id: string;
  patientCode: string;
  patientName: string;
  gender: string;
  dateOfBirth: string;
  specialtyType: string;
  createdAt: string;
  doctorName: string;
  departmentName: string;
  diagnosisIcd: string;
  diagnosisText: string;
  status: number;
}

const SPECIALTIES: { key: string; label: string }[] = [
  { key: 'surgical', label: 'Ngoại' }, { key: 'internal', label: 'Nội' },
  { key: 'obstetrics', label: 'Sản' }, { key: 'pediatrics', label: 'Nhi' },
  { key: 'dental', label: 'RHM' }, { key: 'ent', label: 'TMH' },
  { key: 'traditional', label: 'YHCT' }, { key: 'hematology', label: 'Huyết học' },
  { key: 'oncology', label: 'Ung bướu' }, { key: 'burns', label: 'Bỏng' },
  { key: 'psychiatry', label: 'Tâm thần' }, { key: 'dermatology', label: 'Da liễu' },
  { key: 'ophthalmology', label: 'Mắt' }, { key: 'infectious', label: 'Truyền nhiễm' },
];

const SPECIALTY_LABEL: Record<string, string> = SPECIALTIES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }), {} as Record<string, string>,
);

type StatusKey = 'draft' | 'active' | 'closed';
const STATUS_TABS = [
  { v: 'draft' as StatusKey,  l: 'Nháp',     tone: 'warn' as const },
  { v: 'active' as StatusKey, l: 'Đang điều trị', tone: 'info' as const },
  { v: 'closed' as StatusKey, l: 'Đã kết thúc',  tone: 'ok' as const },
];

const statusKey = (n: number): StatusKey => n === 0 ? 'draft' : n === 2 ? 'closed' : 'active';
const PER = 18;

const SpecialtyEMRV2: React.FC = () => {
  const [items, setItems] = useState<SpecialtyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fSpec, setFSpec] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SpecialtyRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/specialty-emr/search', {
        params: { pageIndex: 0, pageSize: 200 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data?.data || res.data?.items || res.data || []) as any[];
      const rows: SpecialtyRecord[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        gender: r.gender || '',
        dateOfBirth: r.dateOfBirth || '',
        specialtyType: r.specialtyType || '',
        createdAt: r.createdAt || '',
        doctorName: r.doctorName || '',
        departmentName: r.departmentName || '',
        diagnosisIcd: r.diagnosisIcd || '',
        diagnosisText: r.diagnosisText || '',
        status: r.status ?? 1,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ chuyên khoa'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fSpec && r.specialtyType !== fSpec) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.diagnosisIcd, r.diagnosisText].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fSpec]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // By specialty distribution (top 5)
  const bySpecialty = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((r) => map.set(r.specialtyType, (map.get(r.specialtyType) || 0) + 1));
    return Array.from(map.entries())
      .map(([k, v]) => ({ k, l: SPECIALTY_LABEL[k] || k, n: v }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [items]);

  const last7d = items.filter((r) => r.createdAt && dayjs(r.createdAt).isAfter(dayjs().subtract(7, 'day'))).length;

  const cols: ColumnDef<SpecialtyRecord>[] = [
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode} · {r.gender || '?'}</div>
      </div>
    ) },
    { key: 'spec', label: 'Chuyên khoa', render: (r) => (
      <span className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>
        {SPECIALTY_LABEL[r.specialtyType] || r.specialtyType}
      </span>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'icd', label: 'ICD', mono: true, render: (r) => r.diagnosisIcd || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <span style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.diagnosisText}>
        {r.diagnosisText || '—'}
      </span>
    ) },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY') : '—' },
    { key: 'status', label: 'TT', render: (r) => {
      const s = statusKey(r.status);
      const tone = s === 'closed' ? 'ok' : s === 'active' ? 'info' : 'warn';
      return <StatusBadge tone={tone} dot>{STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: SpecialtyRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Tải PDF" onClick={() => tk(`Đã tải PDF cho ${r.patientCode}`)} />
      <ActBtn ic="print" title="In" onClick={() => tk('Đã in HSBA chuyên khoa')} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng HSBA chuyên khoa', val: items.length, sub: `${SPECIALTIES.length} CK` },
        { lbl: '7 ngày qua', val: last7d, sub: 'mới tạo', tone: 'info' },
        { lbl: 'Đang điều trị', val: counts.active || 0, sub: 'active', tone: 'info' },
        { lbl: 'Đã kết thúc', val: counts.closed || 0, sub: 'closed', tone: 'ok' },
        { lbl: 'Nháp', val: counts.draft || 0, sub: 'draft', tone: 'warn' },
        { lbl: 'CK chính', val: bySpecialty[0]?.l || '—', sub: bySpecialty[0] ? `${bySpecialty[0].n} HSBA` : '' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / ICD / chẩn đoán…" />
        <Filter
          value={fSpec} onChange={setFSpec}
          options={SPECIALTIES.map((s) => ({ v: s.key, l: s.label }))}
          placeholder="▾ Chuyên khoa"
        />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFSpec(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Tạo HSBA chuyên khoa mới')}>
          <Ico name="plus" size={12} /> HSBA mới
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      {bySpecialty.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--d-1)' }}>
          <div style={{ fontSize: 10, color: 'var(--t-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>TOP 5 CHUYÊN KHOA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {bySpecialty.map((s) => (
              <div key={s.k} style={{ padding: '8px 10px', background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{s.l}</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--t-0)' }}>{s.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable<SpecialtyRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ chuyên khoa'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `HSBA · ${sel.patientName}` : ''}
        sub={sel ? `${sel.patientCode} · ${SPECIALTY_LABEL[sel.specialtyType] || sel.specialtyType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã tải PDF')}>
            <Ico name="download" size={12} /> Tải PDF
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in HSBA chuyên khoa')}>
            <Ico name="print" size={12} /> In HSBA
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Giới tính">{sel.gender || '—'}</DrField>
            <DrField lbl="Sinh">{sel.dateOfBirth ? dayjs(sel.dateOfBirth).format('DD/MM/YYYY') : '—'}</DrField>
          </DrSec>
          <DrSec title="HSBA chuyên khoa">
            <DrField lbl="Chuyên khoa">
              <span className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>
                {SPECIALTY_LABEL[sel.specialtyType] || sel.specialtyType}
              </span>
            </DrField>
            <DrField lbl="Khoa">{sel.departmentName}</DrField>
            <DrField lbl="Bác sĩ">{sel.doctorName}</DrField>
            <DrField lbl="Tạo lúc">{sel.createdAt ? dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
          </DrSec>
          <DrSec title="Chẩn đoán">
            <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diagnosisIcd}</span></DrField>
            <DrField lbl="Nội dung">{sel.diagnosisText || '—'}</DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="HSBA">
              <StatusBadge tone={statusKey(sel.status) === 'closed' ? 'ok' : statusKey(sel.status) === 'active' ? 'info' : 'warn'} dot>
                {STATUS_TABS.find((x) => x.v === statusKey(sel.status))?.l}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default SpecialtyEMRV2;
