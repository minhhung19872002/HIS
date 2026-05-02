import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getGuidanceBatches } from '../api/clinicalGuidance';
import type { GuidanceBatchDto } from '../api/clinicalGuidance';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const TYPE_LABEL: Record<number, string> = {
  0: 'Khám chữa bệnh', 1: 'Đào tạo', 2: 'Chuyển giao KT', 3: 'Hỗ trợ',
};
const STATUS_LABEL: Record<number, string> = {
  0: 'Lên kế hoạch', 1: 'Đang triển khai', 2: 'Hoàn tất', 3: 'Hủy',
};

type SKey = 'planning' | 'inprogress' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'planning' as SKey,   l: 'Lên KH',         tone: 'warn' as const },
  { v: 'inprogress' as SKey, l: 'Đang triển khai', tone: 'info' as const },
  { v: 'completed' as SKey,  l: 'Hoàn tất',       tone: 'ok' as const },
  { v: 'cancelled' as SKey,  l: 'Hủy',            tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'planning' : n === 1 ? 'inprogress' : n === 2 ? 'completed' : 'cancelled';

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');
const PER = 18;

const ClinicalGuidanceV2: React.FC = () => {
  const [items, setItems] = useState<GuidanceBatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<GuidanceBatchDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getGuidanceBatches({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as GuidanceBatchDto[];
      setItems(list);
    } catch { ti('Không tải được danh sách chỉ đạo tuyến'); }
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
      if (fType && String(r.guidanceType) !== fType) return false;
      if (!k) return true;
      return [r.title, r.batchCode, r.targetFacility]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<GuidanceBatchDto>[] = [
    { key: 'code', label: 'Mã đợt', code: true, render: (r) => r.batchCode },
    { key: 'title', label: 'Nội dung', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.title}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>→ {r.targetFacility}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.guidanceType] || '—'}</StatusBadge>
    ) },
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.startDate).format('DD/MM')}–{dayjs(r.endDate).format('DD/MM/YY')}</div>
        <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1} ngày</div>
      </div>
    ) },
    { key: 'budget', label: 'Ngân sách', mono: true, render: (r) => r.budget ? `${fmt(r.budget)} đ` : '—' },
    { key: 'cnt', label: 'Hoạt động', mono: true, render: (r) => r.activityCount || 0 },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: GuidanceBatchDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="activity" title="Hoạt động" onClick={() => tk(`Mở hoạt động ${r.batchCode}`)} />
    </div>
  );

  const totalBudget = items.reduce((s, b) => s + (b.budget || 0), 0);

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng đợt', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang triển khai', val: counts.inprogress || 0, sub: 'hiện tại', tone: 'info' },
        { lbl: 'Đã hoàn tất', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Tổng ngân sách', val: Math.round(totalBudget / 1_000_000), unit: 'tr', sub: 'VND', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm nội dung / cơ sở / mã đợt…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại đợt" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở đợt chỉ đạo mới')}>
          <Ico name="plus" size={12} /> Đợt mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<GuidanceBatchDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có đợt chỉ đạo'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.title : ''}
        sub={sel ? `${sel.batchCode} · ${sel.targetFacility}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở danh sách hoạt động')}>
            <Ico name="activity" size={12} /> Hoạt động
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in báo cáo')}>
            <Ico name="print" size={12} /> In báo cáo
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Đợt chỉ đạo">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.batchCode}</span></DrField>
            <DrField lbl="Tiêu đề">{sel.title}</DrField>
            <DrField lbl="Cơ sở đích">{sel.targetFacility}</DrField>
            <DrField lbl="Loại">{TYPE_LABEL[sel.guidanceType] || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Thời gian & nguồn lực">
            <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Số ngày"><span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(sel.endDate).diff(dayjs(sel.startDate), 'day') + 1}</span></DrField>
            {sel.teamMembers && <DrField lbl="Thành viên">{sel.teamMembers}</DrField>}
            {sel.budget !== undefined && <DrField lbl="Ngân sách"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(sel.budget)} đ</span></DrField>}
            <DrField lbl="Số hoạt động"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.activityCount || 0}</span></DrField>
          </DrSec>
          {sel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ fontSize: 13, color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default ClinicalGuidanceV2;
