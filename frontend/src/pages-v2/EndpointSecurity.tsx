import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getDevices } from '../api/endpointSecurity';
import type { EndpointDeviceDto } from '../api/endpointSecurity';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type SKey = 'compliant' | 'noncompliant' | 'offline';
const STATUS_TABS = [
  { v: 'compliant' as SKey,    l: 'Tuân thủ',     tone: 'ok' as const },
  { v: 'noncompliant' as SKey, l: 'Chưa tuân thủ', tone: 'crit' as const },
  { v: 'offline' as SKey,      l: 'Ngắt kết nối',  tone: 'warn' as const },
];

const sKey = (r: EndpointDeviceDto): SKey => {
  const last = r.lastSeenAt ? dayjs(r.lastSeenAt) : null;
  const offline = !last || last.isBefore(dayjs().subtract(7, 'day'));
  if (offline) return 'offline';
  return r.isCompliant ? 'compliant' : 'noncompliant';
};

const PER = 18;

const EndpointSecurityV2: React.FC = () => {
  const [items, setItems] = useState<EndpointDeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fOs, setFOs] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<EndpointDeviceDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await getDevices(search || undefined);
      const list = (r?.data?.items || (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []))) as EndpointDeviceDto[];
      setItems(list);
    } catch { ti('Không tải được danh sách máy'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const oses = useMemo(() => {
    const set = new Set(items.map((r) => r.operatingSystem).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fOs && r.operatingSystem !== fOs) return false;
      if (!k) return true;
      return [r.hostname, r.ipAddress, r.macAddress, r.assignedUser, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fOs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<EndpointDeviceDto>[] = [
    { key: 'host', label: 'Hostname', code: true, render: (r) => r.hostname },
    { key: 'net', label: 'IP · MAC', mono: true, render: (r) => (
      <div>
        <div>{r.ipAddress || '—'}</div>
        <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{r.macAddress || '—'}</div>
      </div>
    ) },
    { key: 'os', label: 'OS', render: (r) => `${r.operatingSystem || '—'} ${r.osVersion || ''}`.trim() },
    { key: 'av', label: 'AV', render: (r) => (
      <div>
        <div style={{ fontSize: 12 }}>{r.antivirusName || '—'}</div>
        {r.antivirusLastUpdate && <div style={{ fontSize: 10, color: 'var(--t-2)' }}>upd {dayjs(r.antivirusLastUpdate).format('DD/MM')}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'user', label: 'NSD', render: (r) => r.assignedUser || '—' },
    { key: 'last', label: 'Last seen', mono: true, render: (r) => {
      if (!r.lastSeenAt) return '—';
      const d = dayjs(r.lastSeenAt);
      const days = dayjs().diff(d, 'day');
      const tone = days > 7 ? 'var(--a-rd-text)' : days > 1 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM HH:mm')}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: EndpointDeviceDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Làm mới trạng thái" onClick={() => tk(`Refresh ${r.hostname}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng máy', val: items.length, sub: 'tất cả' },
        { lbl: 'Tuân thủ', val: counts.compliant || 0, sub: `${Math.round(((counts.compliant || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Vi phạm', val: counts.noncompliant || 0, sub: 'cần khắc phục', tone: 'crit' },
        { lbl: 'Mất kết nối', val: counts.offline || 0, sub: '> 7 ngày', tone: 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm hostname / IP / MAC / NSD…" />
        <Filter value={fOs} onChange={setFOs} options={oses} placeholder="▾ Hệ điều hành" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFOs(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở SecurityIncidents')}>
          <Ico name="alert" size={12} /> Sự cố ATTT
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Đăng ký máy mới')}>
          <Ico name="plus" size={12} /> Thêm máy
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<EndpointDeviceDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có máy nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.hostname : ''}
        sub={sel ? `${sel.ipAddress || '—'} · ${sel.operatingSystem || '—'}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã quét')}>
            <Ico name="activity" size={12} /> Quét bảo mật
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở cập nhật')}>
            <Ico name="edit" size={12} /> Cập nhật
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Hostname"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.hostname}</span></DrField>
            <DrField lbl="IP"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.ipAddress || '—'}</span></DrField>
            <DrField lbl="MAC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.macAddress || '—'}</span></DrField>
            <DrField lbl="OS">{sel.operatingSystem || '—'} {sel.osVersion || ''}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="NSD">{sel.assignedUser || '—'}</DrField>
          </DrSec>
          <DrSec title="Antivirus">
            <DrField lbl="AV">{sel.antivirusName || '—'}</DrField>
            <DrField lbl="AV trạng thái">{sel.antivirusStatus || '—'}</DrField>
            {sel.antivirusLastUpdate && <DrField lbl="AV cập nhật">{dayjs(sel.antivirusLastUpdate).format('DD/MM/YYYY HH:mm')}</DrField>}
          </DrSec>
          <DrSec title="Tuân thủ & kết nối">
            <DrField lbl="Tuân thủ">
              {sel.isCompliant
                ? <StatusBadge tone="ok" dot>Đạt</StatusBadge>
                : <StatusBadge tone="crit" dot>Vi phạm</StatusBadge>}
            </DrField>
            {sel.complianceNotes && <DrField lbl="Ghi chú TT">{sel.complianceNotes}</DrField>}
            <DrField lbl="Last seen">{sel.lastSeenAt ? dayjs(sel.lastSeenAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Agent version">{sel.agentVersion || '—'}</DrField>
            <DrField lbl="Trạng thái">{sel.statusText}</DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default EndpointSecurityV2;
