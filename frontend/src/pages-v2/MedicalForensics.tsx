import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchCases } from '../api/forensic';
import type { ForensicCase } from '../api/forensic';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const TYPE_LABEL: Record<string, string> = {
  disability: 'Giám định KT', driver: 'Lái xe', employment: 'Việc làm',
  insurance: 'Bảo hiểm', court: 'Toà án',
};

type SKey = 'pending' | 'examining' | 'completed' | 'approved';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ',          tone: 'warn' as const },
  { v: 'examining' as SKey, l: 'Đang khám',    tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Xong',         tone: 'info' as const },
  { v: 'approved' as SKey,  l: 'Đã duyệt',     tone: 'ok' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : n === 1 ? 'examining' : n === 2 ? 'completed' : 'approved';

const PER = 18;

const MedicalForensicsV2: React.FC = () => {
  const [items, setItems] = useState<ForensicCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<ForensicCase | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchCases({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as ForensicCase[];
      setItems(list);
    } catch { ti('Không tải được ca giám định'); }
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
      if (fType && r.caseType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.caseCode, r.requestingOrganization]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<ForensicCase>[] = [
    { key: 'code', label: 'Mã ca', code: true, render: (r) => r.caseCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.caseType] || r.caseType}</StatusBadge>
    ) },
    { key: 'org', label: 'Cơ quan YC', render: (r) => <span style={{ fontSize: 12 }}>{r.requestingOrganization}</span> },
    { key: 'pct', label: '% mất KN', mono: true, render: (r) => r.disabilityPercent !== undefined
      ? <span style={{ fontWeight: 600, color: r.disabilityPercent >= 81 ? 'var(--a-rd-text)' : r.disabilityPercent >= 61 ? 'var(--a-or-text)' : undefined }}>
          {r.disabilityPercent}%
        </span>
      : '—'
    },
    { key: 'exam', label: 'BS giám định', render: (r) => r.examinerName || '—' },
    { key: 'date', label: 'Ngày YC', mono: true, render: (r) => dayjs(r.requestDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: ForensicCase) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 2 && (
        <ActBtn ic="check" title="Duyệt kết luận" onClick={() => tk(`Duyệt ${r.caseCode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng ca', val: items.length, sub: 'tất cả' },
        { lbl: 'Chờ khám', val: counts.pending || 0, sub: 'cần xếp lịch', tone: 'warn' },
        { lbl: 'Đang khám', val: counts.examining || 0, sub: 'đang xử lý', tone: 'info' },
        { lbl: 'Đã duyệt', val: counts.approved || 0, sub: `${Math.round(((counts.approved || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ca / cơ quan…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại giám định" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở ca giám định mới')}>
          <Ico name="plus" size={12} /> Ca mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ForensicCase>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có ca giám định'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Ca ${sel.caseCode}` : ''}
        sub={sel ? `${sel.patientName} · ${TYPE_LABEL[sel.caseType] || sel.caseType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in biên bản')}>
            <Ico name="print" size={12} /> In biên bản
          </button>
          {sel && sel.status === 2 && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã duyệt'); setSel(null); }}>
              <Ico name="check" size={12} /> Duyệt
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Yêu cầu giám định">
            <DrField lbl="Mã ca"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.caseCode}</span></DrField>
            <DrField lbl="Loại">{TYPE_LABEL[sel.caseType] || sel.caseType}</DrField>
            <DrField lbl="Cơ quan YC">{sel.requestingOrganization}</DrField>
            <DrField lbl="Mục đích">{sel.purpose}</DrField>
            <DrField lbl="Ngày YC">{dayjs(sel.requestDate).format('DD/MM/YYYY')}</DrField>
          </DrSec>
          <DrSec title="Đối tượng">
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode}</span></DrField>
          </DrSec>
          <DrSec title="Kết quả">
            {sel.examinerName && <DrField lbl="BS giám định">{sel.examinerName}</DrField>}
            {sel.disabilityPercent !== undefined && (
              <DrField lbl="% mất KN">
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: sel.disabilityPercent >= 81 ? 'var(--a-rd-text)' : sel.disabilityPercent >= 61 ? 'var(--a-or-text)' : undefined }}>
                  {sel.disabilityPercent}%
                </span>
              </DrField>
            )}
            {sel.conclusion && <DrField lbl="Kết luận">{sel.conclusion}</DrField>}
            {sel.approvedBy && (
              <DrField lbl="Duyệt bởi">{sel.approvedBy} {sel.approvedAt && `(${dayjs(sel.approvedAt).format('DD/MM/YYYY')})`}</DrField>
            )}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default MedicalForensicsV2;
