import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchTreatments } from '../api/traditionalMedicine';
import type { TraditionalTreatment } from '../api/traditionalMedicine';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const TYPE_LABEL: Record<string, string> = {
  acupuncture: 'Châm cứu', herbal: 'Thuốc bắc', massage: 'Xoa bóp',
  cupping: 'Giác hơi', moxibustion: 'Cứu ngải', combined: 'Kết hợp',
};

type SKey = 'active' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Đang điều trị', tone: 'info' as const },
  { v: 'completed' as SKey, l: 'Hoàn thành',    tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',           tone: 'crit' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'active' : n === 1 ? 'completed' : 'cancelled';

const PER = 18;

const TraditionalMedicineV2: React.FC = () => {
  const [items, setItems] = useState<TraditionalTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<TraditionalTreatment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchTreatments({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as TraditionalTreatment[];
      setItems(list);
    } catch { ti('Không tải được phác đồ YHCT'); }
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
      if (fType && r.treatmentType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.treatmentCode, r.diagnosis, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<TraditionalTreatment>[] = [
    { key: 'code', label: 'Mã PĐ', code: true, render: (r) => r.treatmentCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'type', label: 'Phương pháp', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.treatmentType] || r.treatmentType}</StatusBadge>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => <span style={{ fontSize: 12 }}>{r.diagnosis}</span> },
    { key: 'sess', label: 'Tiến độ', mono: true, render: (r) => {
      const total = r.totalSessions || 0;
      const done = r.completedSessions || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return (
        <div>
          <div>{done}/{total || '?'}</div>
          {total > 0 && <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{pct}%</div>}
        </div>
      );
    } },
    { key: 'doc', label: 'BS điều trị', render: (r) => r.doctorName },
    { key: 'date', label: 'Bắt đầu', mono: true, render: (r) => dayjs(r.startDate).format('DD/MM/YYYY') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: TraditionalTreatment) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="activity" title="Ghi buổi điều trị" onClick={() => tk(`Ghi buổi cho ${r.patientName}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng phác đồ', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang điều trị', val: counts.active || 0, sub: 'BN hiện tại', tone: 'info' },
        { lbl: 'Châm cứu', val: items.filter((t) => t.treatmentType === 'acupuncture' || t.treatmentType === 'combined').length, sub: 'phác đồ', tone: 'warn' },
        { lbl: 'Hoàn thành', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã phác đồ / chẩn đoán…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Phương pháp" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở phác đồ mới')}>
          <Ico name="plus" size={12} /> Phác đồ mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TraditionalTreatment>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phác đồ YHCT'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Phác đồ ${sel.treatmentCode}` : ''}
        sub={sel ? `${sel.patientName} · ${TYPE_LABEL[sel.treatmentType] || sel.treatmentType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Mở đơn thuốc bắc')}>
            <Ico name="file-text" size={12} /> Đơn thuốc bắc
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Ghi buổi điều trị')}>
            <Ico name="activity" size={12} /> Ghi buổi
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin phác đồ">
            <DrField lbl="Mã phác đồ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.treatmentCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Phương pháp">
              <StatusBadge tone="info">{TYPE_LABEL[sel.treatmentType] || sel.treatmentType}</StatusBadge>
            </DrField>
            <DrField lbl="Chẩn đoán YHCT">{sel.diagnosis}</DrField>
            <DrField lbl="BS điều trị">{sel.doctorName}</DrField>
          </DrSec>
          <DrSec title="Lịch trình">
            <DrField lbl="Bắt đầu">{dayjs(sel.startDate).format('DD/MM/YYYY')}</DrField>
            {sel.endDate && <DrField lbl="Kết thúc">{dayjs(sel.endDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Số buổi"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {sel.completedSessions || 0}/{sel.totalSessions || '?'}
            </span></DrField>
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

export default TraditionalMedicineV2;
