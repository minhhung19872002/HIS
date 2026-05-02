import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchVaccinations } from '../api/immunization';
import type { Vaccination } from '../api/immunization';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Lên lịch', 1: 'Đã tiêm', 2: 'Bỏ lịch', 3: 'Hoãn',
};

type SKey = 'scheduled' | 'completed' | 'missed' | 'deferred';
const STATUS_TABS = [
  { v: 'scheduled' as SKey, l: 'Lên lịch', tone: 'warn' as const },
  { v: 'completed' as SKey, l: 'Đã tiêm',  tone: 'ok' as const },
  { v: 'missed' as SKey,    l: 'Bỏ lịch',  tone: 'crit' as const },
  { v: 'deferred' as SKey,  l: 'Hoãn',     tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'scheduled' : n === 1 ? 'completed' : n === 2 ? 'missed' : 'deferred';

const PER = 18;

const ImmunizationV2: React.FC = () => {
  const [items, setItems] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fVac, setFVac] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Vaccination | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchVaccinations({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as Vaccination[];
      setItems(list);
    } catch { ti('Không tải được lịch tiêm'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();

  const vaccines = useMemo(() => {
    const set = new Set(items.map((r) => r.vaccineName).filter(Boolean));
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
      if (fVac && r.vaccineName !== fVac) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.vaccineName, r.vaccineCode, r.lotNumber]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fVac]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Vaccination>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode} · {dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</div>
      </div>
    ) },
    { key: 'vac', label: 'Vaccine', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.vaccineName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.vaccineCode}</div>
      </div>
    ) },
    { key: 'dose', label: 'Mũi', mono: true, render: (r) => `${r.doseNumber}/${r.totalDoses}` },
    { key: 'lot', label: 'Lô', code: true, render: (r) => r.lotNumber },
    { key: 'date', label: 'Tiêm', mono: true, render: (r) => dayjs(r.vaccinationDate).format('DD/MM/YYYY') },
    { key: 'next', label: 'Mũi tiếp', mono: true, render: (r) => {
      if (!r.nextDueDate) return '—';
      const d = dayjs(r.nextDueDate);
      const days = d.diff(today, 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM/YYYY')}</span>;
    } },
    { key: 'ae', label: 'Phản ứng', render: (r) => r.adverseEvent
      ? <StatusBadge tone="crit" dot>Có</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Vaccination) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="check" title="Đánh dấu đã tiêm" onClick={() => tk(`Đã tiêm ${r.patientName}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng mũi', val: items.length, sub: 'tất cả' },
        { lbl: 'Đã tiêm', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Đến hạn 30d', val: items.filter((v) => v.nextDueDate && dayjs(v.nextDueDate).diff(today, 'day') < 30 && dayjs(v.nextDueDate).isAfter(today)).length, sub: 'cần nhắc', tone: 'warn' },
        { lbl: 'Phản ứng có hại', val: items.filter((v) => v.adverseEvent).length, sub: 'báo cáo', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / vaccine / lô…" />
        <Filter value={fVac} onChange={setFVac} options={vaccines} placeholder="▾ Vaccine" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFVac(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở chiến dịch tiêm chủng')}>
          <Ico name="activity" size={12} /> Chiến dịch
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở ghi nhận tiêm')}>
          <Ico name="plus" size={12} /> Ghi nhận
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Vaccination>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có mũi tiêm'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.vaccineName} · Mũi ${sel.doseNumber}/${sel.totalDoses}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in sổ tiêm chủng')}>
            <Ico name="print" size={12} /> In sổ
          </button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã tiêm'); setSel(null); }}>
              <Ico name="check" size={12} /> Đánh dấu đã tiêm
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
          </DrSec>
          <DrSec title="Vaccine">
            <DrField lbl="Tên">{sel.vaccineName}</DrField>
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.vaccineCode}</span></DrField>
            <DrField lbl="Số lô"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.lotNumber}</span></DrField>
            <DrField lbl="Mũi"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.doseNumber} / {sel.totalDoses}</span></DrField>
          </DrSec>
          <DrSec title="Tiêm">
            <DrField lbl="Ngày tiêm">{dayjs(sel.vaccinationDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Đường dùng">{sel.route}</DrField>
            <DrField lbl="Vị trí">{sel.site}</DrField>
            <DrField lbl="Người tiêm">{sel.administeredBy}</DrField>
            {sel.nextDueDate && (
              <DrField lbl="Mũi tiếp theo">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{dayjs(sel.nextDueDate).format('DD/MM/YYYY')}</span>
                <span style={{ marginLeft: 8, color: 'var(--t-2)', fontSize: 11 }}>
                  ({dayjs(sel.nextDueDate).diff(today, 'day')} ngày)
                </span>
              </DrField>
            )}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          {(sel.adverseEvent || sel.notes) && (
            <DrSec title="Sau tiêm">
              {sel.adverseEvent && (
                <DrField lbl="Phản ứng">
                  <span style={{ color: 'var(--a-rd-text)', fontWeight: 600 }}>{sel.adverseEvent}</span>
                </DrField>
              )}
              {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default ImmunizationV2;
