import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchHealthCheckups, getHealthCheckupStats } from '../api/healthCheckup';
import type { HealthCheckup, HealthCheckupStats } from '../api/healthCheckup';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đang khám', 2: 'Hoàn thành', 3: 'Đã chứng nhận',
};

type SKey = 'pending' | 'progress' | 'done' | 'certified';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ',           tone: 'warn' as const },
  { v: 'progress' as SKey,  l: 'Đang khám',     tone: 'info' as const },
  { v: 'done' as SKey,      l: 'Hoàn thành',    tone: 'info' as const },
  { v: 'certified' as SKey, l: 'Đã chứng nhận', tone: 'ok' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : n === 1 ? 'progress' : n === 2 ? 'done' : 'certified';

const CONCL_LABEL: Record<string, string> = {
  pass: 'Đạt', fail: 'Không đạt', conditional: 'Có điều kiện',
};
const CONCL_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  pass: 'ok', conditional: 'warn', fail: 'crit',
};

const PER = 18;

const HealthCheckupV2: React.FC = () => {
  const [items, setItems] = useState<HealthCheckup[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fComp, setFComp] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HealthCheckup | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        searchHealthCheckups({ keyword: search, pageSize: 200 }),
        getHealthCheckupStats(),
      ]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được KSK'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const companies = useMemo(() => {
    const set = new Set(items.map((r) => r.companyName).filter(Boolean) as string[]);
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
      if (fComp && r.companyName !== fComp) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.checkupCode, r.companyName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fComp]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<HealthCheckup>[] = [
    { key: 'code', label: 'Mã KSK', code: true, render: (r) => r.checkupCode },
    { key: 'pt', label: 'Đối tượng', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nữ'} · {r.patientCode}</div>
      </div>
    ) },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.checkupDate).format('DD/MM/YYYY') },
    { key: 'type', label: 'Loại', render: (r) => r.checkupType },
    { key: 'comp', label: 'Công ty', render: (r) => r.companyName || '—' },
    { key: 'doc', label: 'BS khám', render: (r) => r.examDoctor },
    { key: 'concl', label: 'Kết luận', render: (r) => r.conclusion ? (
      <StatusBadge tone={CONCL_TONE[r.conclusion] || 'info'} dot>{CONCL_LABEL[r.conclusion] || r.conclusion}</StatusBadge>
    ) : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: HealthCheckup) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="print" title="In phiếu" onClick={() => tk(`In phiếu ${r.checkupCode}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng KSK', val: stats?.totalCheckups ?? items.length, sub: 'tất cả' },
        { lbl: 'Hôm nay', val: stats?.todayCount ?? 0, sub: 'đã khám', tone: 'info' },
        { lbl: 'Đạt', val: stats?.passCount ?? items.filter((c) => c.conclusion === 'pass').length, sub: `${Math.round(((stats?.passCount ?? 0) / Math.max(1, stats?.totalCheckups ?? items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Không đạt', val: stats?.failCount ?? items.filter((c) => c.conclusion === 'fail').length, sub: 'cần điều trị', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã KSK / công ty…" />
        <Filter value={fComp} onChange={setFComp} options={companies} placeholder="▾ Công ty" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFComp(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở chiến dịch KSK')}>
          <Ico name="plus" size={12} /> KSK mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HealthCheckup>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có khám SK'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.checkupCode} · ${sel.checkupType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in giấy chứng nhận')}>
            <Ico name="print" size={12} /> In giấy CN
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở cập nhật')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Đối tượng">
            <DrField lbl="Mã KSK"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.checkupCode}</span></DrField>
            <DrField lbl="Họ tên">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Giới tính">{sel.gender === 1 ? 'Nam' : 'Nữ'}</DrField>
            <DrField lbl="Ngày sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            {sel.companyName && <DrField lbl="Công ty">{sel.companyName}</DrField>}
            {sel.groupName && <DrField lbl="Nhóm">{sel.groupName}</DrField>}
          </DrSec>
          <DrSec title="Khám">
            <DrField lbl="Loại">{sel.checkupType}</DrField>
            <DrField lbl="Ngày khám">{dayjs(sel.checkupDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="BS khám">{sel.examDoctor}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Khám chuyên khoa">
            {sel.internalMedicine && <DrField lbl="Nội khoa">{sel.internalMedicine}</DrField>}
            {sel.surgery && <DrField lbl="Ngoại khoa">{sel.surgery}</DrField>}
            {sel.ophthalmology && <DrField lbl="Mắt">{sel.ophthalmology}</DrField>}
            {sel.entExam && <DrField lbl="TMH">{sel.entExam}</DrField>}
            {sel.dentalExam && <DrField lbl="RHM">{sel.dentalExam}</DrField>}
            {sel.dermatology && <DrField lbl="Da liễu">{sel.dermatology}</DrField>}
            {sel.gynecology && <DrField lbl="Phụ khoa">{sel.gynecology}</DrField>}
            {sel.psychiatry && <DrField lbl="Tâm thần">{sel.psychiatry}</DrField>}
          </DrSec>
          <DrSec title="Kết luận">
            <DrField lbl="KQ XN">{sel.labResults || '—'}</DrField>
            <DrField lbl="X-quang">{sel.xrayResults || '—'}</DrField>
            <DrField lbl="Kết luận">
              {sel.conclusion ? (
                <StatusBadge tone={CONCL_TONE[sel.conclusion] || 'info'} dot>{CONCL_LABEL[sel.conclusion] || sel.conclusion}</StatusBadge>
              ) : '—'}
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default HealthCheckupV2;
