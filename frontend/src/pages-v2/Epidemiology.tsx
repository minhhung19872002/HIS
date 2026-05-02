import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchDiseaseReports, getEpiStats } from '../api/epidemiology';
import type { DiseaseReport, EpiStats } from '../api/epidemiology';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = { 0: 'Nháp', 1: 'Đã gửi', 2: 'Xác nhận', 3: 'Đóng' };

type SKey = 'draft' | 'submitted' | 'confirmed' | 'closed';
const STATUS_TABS = [
  { v: 'draft' as SKey,     l: 'Nháp',      tone: 'warn' as const },
  { v: 'submitted' as SKey, l: 'Đã gửi',    tone: 'info' as const },
  { v: 'confirmed' as SKey, l: 'Xác nhận',  tone: 'ok' as const },
  { v: 'closed' as SKey,    l: 'Đóng',      tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'draft' : n === 1 ? 'submitted' : n === 2 ? 'confirmed' : 'closed';

const GROUP_TONE: Record<string, 'crit' | 'warn' | 'info'> = { A: 'crit', B: 'warn', C: 'info' };

const PER = 18;

const EpidemiologyV2: React.FC = () => {
  const [items, setItems] = useState<DiseaseReport[]>([]);
  const [stats, setStats] = useState<EpiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fGroup, setFGroup] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<DiseaseReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchDiseaseReports({ keyword: search }), getEpiStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được báo cáo dịch tễ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fGroup && r.diseaseGroup !== fGroup) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.reportCode, r.diseaseName, r.diseaseCode]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<DiseaseReport>[] = [
    { key: 'code', label: 'Mã BC', code: true, render: (r) => r.reportCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.age}t</div>
      </div>
    ) },
    { key: 'dis', label: 'Bệnh', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.diseaseName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.diseaseCode}</div>
      </div>
    ) },
    { key: 'grp', label: 'Nhóm', render: (r) => (
      <StatusBadge tone={GROUP_TONE[r.diseaseGroup] || 'info'} dot>{r.diseaseGroup}</StatusBadge>
    ) },
    { key: 'addr', label: 'Địa chỉ', render: (r) => <span style={{ fontSize: 12 }}>{r.address}</span> },
    { key: 'date', label: 'Báo cáo', mono: true, render: (r) => dayjs(r.reportDate).format('DD/MM/YYYY') },
    { key: 'lab', label: 'XN', render: (r) => r.labConfirmed
      ? <StatusBadge tone="ok" dot>Khẳng định</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: DiseaseReport) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="send" title="Gửi báo cáo" onClick={() => tk(`Đã gửi ${r.reportCode}`)} />
      )}
    </div>
  );

  const groupOpts = [
    { v: 'A', l: 'Nhóm A · đặc biệt nguy hiểm' },
    { v: 'B', l: 'Nhóm B · nguy hiểm' },
    { v: 'C', l: 'Nhóm C · ít nguy hiểm' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng báo cáo', val: stats?.totalReports ?? items.length, sub: 'tổng số' },
        { lbl: 'XN khẳng định', val: stats?.confirmedCases ?? items.filter((r) => r.labConfirmed).length, sub: 'có chắc chắn', tone: 'info' },
        { lbl: 'Ổ dịch', val: stats?.activeOutbreaks ?? 0, sub: 'đang hoạt động', tone: 'warn' },
        { lbl: 'Tử vong', val: stats?.deathCount ?? 0, sub: 'liên quan', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã BC / bệnh…" />
        <Filter value={fGroup} onChange={setFGroup} options={groupOpts} placeholder="▾ Nhóm bệnh" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFGroup(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở quản lý ổ dịch')}>
          <Ico name="alert" size={12} /> Ổ dịch
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở báo cáo bệnh mới')}>
          <Ico name="plus" size={12} /> Báo cáo mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<DiseaseReport>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có báo cáo dịch tễ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `BC ${sel.reportCode}` : ''}
        sub={sel ? `${sel.diseaseName} · ${sel.patientName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in báo cáo')}>
            <Ico name="print" size={12} /> In BC
          </button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã gửi'); setSel(null); }}>
              <Ico name="send" size={12} /> Gửi báo cáo
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.reportCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Tuổi · GT">{sel.age} tuổi · {sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Địa chỉ">{sel.address}</DrField>
          </DrSec>
          <DrSec title="Bệnh">
            <DrField lbl="Tên bệnh">{sel.diseaseName}</DrField>
            <DrField lbl="Mã bệnh"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diseaseCode}</span></DrField>
            <DrField lbl="Nhóm">
              <StatusBadge tone={GROUP_TONE[sel.diseaseGroup] || 'info'} dot>Nhóm {sel.diseaseGroup}</StatusBadge>
            </DrField>
            <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="XN khẳng định">
              {sel.labConfirmed ? <StatusBadge tone="ok" dot>Có</StatusBadge> : <StatusBadge tone="warn" dot>Chưa</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Báo cáo">
            <DrField lbl="Ngày BC">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="BS báo cáo">{sel.reportingDoctor}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.outcome && <DrField lbl="Diễn biến">{sel.outcome}</DrField>}
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
            {sel.outbreakId && <DrField lbl="Liên quan ổ dịch"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.outbreakId}</span></DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default EpidemiologyV2;
