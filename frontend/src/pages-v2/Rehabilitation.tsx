import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getReferrals } from '../api/rehabilitation';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type Row = {
  id: string;
  referralCode?: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  patientAge?: number;
  patientGender?: string;
  rehabType?: string;
  rehabTypeName?: string;
  diagnosis?: string;
  primaryDiagnosis?: string;
  diagnosisIcd?: string;
  diagnosisICD?: string;
  sourceDepartment?: string;
  referringDoctor?: string;
  referringDepartmentName?: string;
  referringDoctorName?: string;
  priority?: number;
  priorityName?: string;
  urgency?: string;
  rehabGoals?: string;
  goals?: string;
  precautions?: string;
  referralReason?: string;
  specificRequests?: string;
  status?: string | number;
  statusName?: string;
  referralDate?: string;
  acceptedDate?: string;
};

const URGENCY_LABEL: Record<string, string> = { Routine: 'Thường', Urgent: 'Khẩn', Stat: 'Cấp cứu' };
const URGENCY_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = { Routine: 'ok', Urgent: 'warn', Stat: 'crit' };

type SKey = 'pending' | 'accepted' | 'progress' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ',           tone: 'warn' as const },
  { v: 'accepted' as SKey,  l: 'Chấp nhận',     tone: 'info' as const },
  { v: 'progress' as SKey,  l: 'Đang điều trị', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',      tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy/Từ chối',   tone: 'crit' as const },
];

const sKey = (st: string | number | undefined): SKey => {
  const k = String(st || '').toLowerCase();
  if (k === 'pending' || k === '0') return 'pending';
  if (k === 'accepted' || k === '1') return 'accepted';
  if (k === 'inprogress' || k === '2') return 'progress';
  if (k === 'completed' || k === '3') return 'completed';
  return 'cancelled';
};

const PER = 18;

const RehabilitationV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReferrals({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được giấy giới thiệu PHCN'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.rehabTypeName || r.rehabType).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const dx = (r: Row) => r.diagnosis || r.primaryDiagnosis || '';
  const dxIcd = (r: Row) => r.diagnosisIcd || r.diagnosisICD || '';
  const dept = (r: Row) => r.referringDepartmentName || r.sourceDepartment || '';
  const doc = (r: Row) => r.referringDoctorName || r.referringDoctor || '';
  const urgencyText = (r: Row) => {
    if (r.priority) return r.priority >= 3 ? 'Stat' : (r.priority === 2 ? 'Urgent' : 'Routine');
    return r.urgency || 'Routine';
  };

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && (r.rehabTypeName || r.rehabType) !== fType) return false;
      if (!k) return true;
      return [r.referralCode, r.patientName, r.patientCode, dx(r), dxIcd(r)]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã GT', code: true, render: (r) => r.referralCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
          {r.patientCode || '—'}
          {r.patientAge !== undefined && r.patientAge > 0 && ` · ${r.patientAge}t`}
        </div>
      </div>
    ) },
    { key: 'type', label: 'Loại PHCN', render: (r) => (
      <StatusBadge tone="info">{r.rehabTypeName || r.rehabType || '—'}</StatusBadge>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <div>
        <div style={{ fontSize: 12 }}>{dx(r) || '—'}</div>
        {dxIcd(r) && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{dxIcd(r)}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa GT', render: (r) => dept(r) || '—' },
    { key: 'date', label: 'Ngày GT', mono: true, render: (r) => r.referralDate ? dayjs(r.referralDate).format('DD/MM/YYYY') : '—' },
    { key: 'pri', label: 'Ưu tiên', render: (r) => {
      const u = urgencyText(r);
      return <StatusBadge tone={URGENCY_TONE[u] || 'info'} dot>{URGENCY_LABEL[u] || u}</StatusBadge>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {sKey(r.status) === 'pending' && (
        <ActBtn ic="check" title="Chấp nhận" onClick={() => tk(`Đã chấp nhận ${r.referralCode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng giấy GT', val: items.length, sub: 'tất cả' },
        { lbl: 'Khẩn / Cấp cứu', val: items.filter((r) => urgencyText(r) === 'Urgent' || urgencyText(r) === 'Stat').length, sub: 'cần xếp lịch', tone: 'warn' },
        { lbl: 'Đã chấp nhận', val: counts.accepted || 0, sub: 'đang lập KH', tone: 'info' },
        { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã GT / chẩn đoán…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại PHCN" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở giấy GT mới')}>
          <Ico name="plus" size={12} /> Giấy GT
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có giấy giới thiệu PHCN'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Giấy GT ${sel.referralCode || '—'}` : ''}
        sub={sel ? `${sel.patientName || '—'} · ${sel.rehabTypeName || sel.rehabType || '—'}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in giấy GT')}>
            <Ico name="print" size={12} /> In giấy GT
          </button>
          {sel && sKey(sel.status) === 'pending' && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã chấp nhận'); setSel(null); }}>
              <Ico name="check" size={12} /> Chấp nhận
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Họ tên">{sel.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || '—'}</span></DrField>
            {sel.patientAge !== undefined && sel.patientAge > 0 && <DrField lbl="Tuổi · GT">{sel.patientAge}t · {sel.patientGender || '—'}</DrField>}
          </DrSec>
          <DrSec title="Yêu cầu PHCN">
            <DrField lbl="Loại">{sel.rehabTypeName || sel.rehabType || '—'}</DrField>
            <DrField lbl="Ưu tiên">
              <StatusBadge tone={URGENCY_TONE[urgencyText(sel)] || 'info'} dot>
                {URGENCY_LABEL[urgencyText(sel)] || urgencyText(sel)}
              </StatusBadge>
            </DrField>
            <DrField lbl="Chẩn đoán">{dx(sel) || '—'}</DrField>
            {dxIcd(sel) && <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{dxIcd(sel)}</span></DrField>}
            <DrField lbl="Mục tiêu">{sel.rehabGoals || sel.goals || '—'}</DrField>
            <DrField lbl="Yêu cầu cụ thể">{sel.specificRequests || sel.referralReason || '—'}</DrField>
            {sel.precautions && <DrField lbl="Lưu ý">{sel.precautions}</DrField>}
          </DrSec>
          <DrSec title="Người giới thiệu">
            <DrField lbl="Khoa GT">{dept(sel) || '—'}</DrField>
            <DrField lbl="BS GT">{doc(sel) || '—'}</DrField>
            {sel.referralDate && <DrField lbl="Ngày GT">{dayjs(sel.referralDate).format('DD/MM/YYYY')}</DrField>}
            {sel.acceptedDate && <DrField lbl="Chấp nhận">{dayjs(sel.acceptedDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default RehabilitationV2;
