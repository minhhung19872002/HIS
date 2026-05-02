import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getRecordCodes } from '../api/medicalRecordPlanning';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

interface RecordCode {
  id: string;
  recordCode: string;
  examinationId?: string;
  patientCode?: string;
  patientName?: string;
  departmentName?: string;
  doctorName?: string;
  assignedDate?: string;
  assignedByName?: string;
  status: number;
  statusName: string;
  createdAt: string;
}

type SKey = 'unused' | 'assigned' | 'completed' | 'pending' | 'cancelled';
const STATUS_TABS = [
  { v: 'unused' as SKey,    l: 'Chưa dùng',  tone: 'warn' as const },
  { v: 'assigned' as SKey,  l: 'Đã gán',     tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',   tone: 'ok' as const },
  { v: 'pending' as SKey,   l: 'Treo',       tone: 'warn' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',        tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'unused' : n === 1 ? 'assigned' : n === 2 ? 'completed' : n === 3 ? 'pending' : 'cancelled';

const PER = 18;

const MedicalRecordPlanningV2: React.FC = () => {
  const [items, setItems] = useState<RecordCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<RecordCode | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getRecordCodes({ pageIndex: 0, pageSize: 200, keyword: search || undefined });
      const list = ((r.data as { items?: RecordCode[] })?.items || []) as RecordCode[];
      setItems(list);
    } catch { ti('Không tải được mã BA'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
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
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.recordCode, r.patientName, r.patientCode, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<RecordCode>[] = [
    { key: 'code', label: 'Mã BA', code: true, render: (r) => r.recordCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) : <span style={{ color: 'var(--t-2)' }}>Chưa gán</span> },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'date', label: 'Ngày gán', mono: true, render: (r) => r.assignedDate ? dayjs(r.assignedDate).format('DD/MM HH:mm') : '—' },
    { key: 'by', label: 'Người gán', render: (r) => r.assignedByName || '—' },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName}</StatusBadge>;
    } },
  ];

  const actions = (r: RecordCode) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="user" title="Gán BN" onClick={() => tk(`Mở gán BN cho ${r.recordCode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng mã BA', val: items.length, sub: 'tất cả' },
        { lbl: 'Chưa dùng', val: counts.unused || 0, sub: 'sẵn dùng', tone: 'warn' },
        { lbl: 'Đã gán', val: counts.assigned || 0, sub: 'đang dùng', tone: 'info' },
        { lbl: 'Hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã BA…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở cấp dải mã BA')}>
          <Ico name="plus" size={12} /> Cấp dải mã
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<RecordCode>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có mã BA'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `Mã BA ${sel.recordCode}` : ''}
        sub={sel ? sel.statusName : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => tk('Mở gán BN')}>
              <Ico name="user" size={12} /> Gán BN
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Mã BA">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Tạo lúc">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Sử dụng">
            <DrField lbl="Bệnh nhân">{sel.patientName || '—'}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode || '—'}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="BS">{sel.doctorName || '—'}</DrField>
            {sel.assignedDate && <DrField lbl="Ngày gán">{dayjs(sel.assignedDate).format('DD/MM/YYYY HH:mm')}</DrField>}
            <DrField lbl="Người gán">{sel.assignedByName || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default MedicalRecordPlanningV2;
