import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchPrenatal } from '../api/reproductiveHealth';
import type { PrenatalRecord } from '../api/reproductiveHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const RISK_LABEL: Record<string, string> = {
  low: 'Thấp', medium: 'Trung bình', high: 'Cao', very_high: 'Rất cao',
};
const RISK_TONE: Record<string, 'ok' | 'info' | 'warn' | 'crit'> = {
  low: 'ok', medium: 'warn', high: 'crit', very_high: 'crit',
};

type SKey = 'active' | 'delivered' | 'completed' | 'cancelled';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Đang theo dõi', tone: 'info' as const },
  { v: 'delivered' as SKey, l: 'Đã sinh',       tone: 'ok' as const },
  { v: 'completed' as SKey, l: 'Hoàn tất',      tone: 'ok' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',           tone: 'warn' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'active' : n === 1 ? 'delivered' : n === 2 ? 'completed' : 'cancelled';

const PER = 18;

const ReproductiveHealthV2: React.FC = () => {
  const [items, setItems] = useState<PrenatalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fRisk, setFRisk] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<PrenatalRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchPrenatal({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as PrenatalRecord[];
      setItems(list);
    } catch { ti('Không tải được hồ sơ tiền sản'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fRisk && r.riskLevel !== fRisk) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.recordCode, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fRisk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<PrenatalRecord>[] = [
    { key: 'code', label: 'Mã HS', code: true, render: (r) => r.recordCode },
    { key: 'pt', label: 'Thai phụ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode} · DOB {dayjs(r.dateOfBirth).format('DD/MM/YYYY')}</div>
      </div>
    ) },
    { key: 'weeks', label: 'Tuần thai', mono: true, render: (r) => `${r.gestationalWeeks} w` },
    { key: 'edd', label: 'Sinh dự kiến', mono: true, render: (r) => {
      const d = dayjs(r.expectedDeliveryDate);
      const days = d.diff(today, 'day');
      const tone = days < 14 && days >= 0 ? 'var(--a-or-text)' : days < 0 ? 'var(--a-rd-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM/YYYY')}</span>;
    } },
    { key: 'gp', label: 'G/P', mono: true, render: (r) => `${r.gravida}/${r.para}` },
    { key: 'blood', label: 'Nhóm máu', mono: true, render: (r) => r.bloodType || '—' },
    { key: 'risk', label: 'Nguy cơ', render: (r) => (
      <StatusBadge tone={RISK_TONE[r.riskLevel] || 'info'} dot>{RISK_LABEL[r.riskLevel] || r.riskLevel}</StatusBadge>
    ) },
    { key: 'visits', label: 'Lần khám', mono: true, render: (r) => r.visitCount || 0 },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: PrenatalRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="activity" title="Khám tiền sản" onClick={() => tk(`Mở khám ${r.patientName}`)} />
      )}
    </div>
  );

  const riskOpts = Object.entries(RISK_LABEL).map(([v, l]) => ({ v, l }));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Đang theo dõi', val: counts.active || 0, sub: 'thai phụ', tone: 'info' },
        { lbl: 'Nguy cơ cao', val: items.filter((p) => p.riskLevel === 'high' || p.riskLevel === 'very_high').length, sub: 'cần chú ý', tone: 'crit' },
        { lbl: 'Sắp sinh', val: items.filter((p) => {
          const d = dayjs(p.expectedDeliveryDate);
          return d.diff(today, 'day') < 28 && d.isAfter(today);
        }).length, sub: '< 4 tuần', tone: 'warn' },
        { lbl: 'Đã sinh', val: counts.delivered || 0, sub: 'tổng số', tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm thai phụ / mã HS…" />
        <Filter value={fRisk} onChange={setFRisk} options={riskOpts} placeholder="▾ Nguy cơ" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFRisk(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở KHHGD')}>
          <Ico name="user" size={12} /> KHHGD
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở thêm thai phụ')}>
          <Ico name="plus" size={12} /> Đăng ký
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<PrenatalRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ tiền sản'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.recordCode} · ${sel.gestationalWeeks} tuần thai` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in sổ KSK')}>
            <Ico name="print" size={12} /> In sổ KSK
          </button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => tk('Mở khám')}>
              <Ico name="activity" size={12} /> Khám
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Thai phụ">
            <DrField lbl="Mã HS"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.recordCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            {sel.bloodType && <DrField lbl="Nhóm máu">{sel.bloodType}</DrField>}
            <DrField lbl="G/P (lần)"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.gravida} / {sel.para}</span></DrField>
          </DrSec>
          <DrSec title="Thai kỳ">
            <DrField lbl="Tuần thai"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.gestationalWeeks} tuần</span></DrField>
            <DrField lbl="Sinh dự kiến">{dayjs(sel.expectedDeliveryDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Còn">{Math.max(0, dayjs(sel.expectedDeliveryDate).diff(today, 'day'))} ngày</DrField>
            <DrField lbl="Nguy cơ">
              <StatusBadge tone={RISK_TONE[sel.riskLevel] || 'info'} dot>{RISK_LABEL[sel.riskLevel] || sel.riskLevel}</StatusBadge>
            </DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Theo dõi">
            <DrField lbl="BS">{sel.doctorName}</DrField>
            <DrField lbl="Lần khám"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.visitCount || 0}</span></DrField>
            <DrField lbl="Khám gần">{sel.lastVisitDate ? dayjs(sel.lastVisitDate).format('DD/MM/YYYY') : '—'}</DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default ReproductiveHealthV2;
