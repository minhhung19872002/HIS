import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getAnalyzers, getLabconnectStatus } from '../api/lisConfig';
import type { AnalyzerDto, LabconnectStatusDto } from '../api/lisConfig';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const CONN_LABEL: Record<string, string> = {
  Connected: 'Đã kết nối', Disconnected: 'Mất kết nối', Unknown: 'Không rõ',
};
const CONN_TONE: Record<string, 'ok' | 'crit' | 'warn'> = {
  Connected: 'ok', Disconnected: 'crit', Unknown: 'warn',
};

type SKey = 'connected' | 'disconnected' | 'inactive';
const STATUS_TABS = [
  { v: 'connected' as SKey,    l: 'Đã kết nối', tone: 'ok' as const },
  { v: 'disconnected' as SKey, l: 'Mất KN',     tone: 'crit' as const },
  { v: 'inactive' as SKey,     l: 'Tắt',        tone: 'warn' as const },
];

const sKey = (r: AnalyzerDto): SKey => {
  if (!r.isActive) return 'inactive';
  return r.connectionStatus === 'Connected' ? 'connected' : 'disconnected';
};

const PER = 18;

const LISConfigV2: React.FC = () => {
  const [items, setItems] = useState<AnalyzerDto[]>([]);
  const [labconn, setLabconn] = useState<LabconnectStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fProto, setFProto] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AnalyzerDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, lc] = await Promise.all([
        getAnalyzers(),
        getLabconnectStatus().catch(() => ({ data: null as LabconnectStatusDto | null })),
      ]);
      setItems(r.data || []);
      setLabconn(lc.data || null);
    } catch { ti('Không tải được cấu hình LIS'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const protos = useMemo(() => {
    const set = new Set(items.map((r) => r.connectionType).filter(Boolean));
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
      if (fProto && r.connectionType !== fProto) return false;
      if (!k) return true;
      return [r.name, r.model, r.manufacturer, r.ipAddress]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fProto]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<AnalyzerDto>[] = [
    { key: 'name', label: 'Máy XN', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.manufacturer}</div>
      </div>
    ) },
    { key: 'model', label: 'Model', code: true, render: (r) => r.model },
    { key: 'proto', label: 'Protocol', render: (r) => (
      <div>
        <StatusBadge tone="info">{r.connectionType}</StatusBadge>
        {r.protocolVersion && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>v{r.protocolVersion}</div>}
      </div>
    ) },
    { key: 'addr', label: 'Địa chỉ', mono: true, render: (r) =>
      r.ipAddress ? `${r.ipAddress}:${r.port}` : (r.baudRate ? `${r.baudRate} bps` : '—')
    },
    { key: 'conn', label: 'Kết nối', render: (r) => (
      <StatusBadge tone={CONN_TONE[r.connectionStatus || 'Unknown'] || 'warn'} dot>
        {CONN_LABEL[r.connectionStatus || 'Unknown'] || '—'}
      </StatusBadge>
    ) },
    { key: 'last', label: 'Lần cuối', mono: true, render: (r) => r.lastConnectedAt ? dayjs(r.lastConnectedAt).format('DD/MM HH:mm') : '—' },
    { key: 'active', label: 'Bật', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge>
    },
  ];

  const actions = (r: AnalyzerDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => tk(`Test KN ${r.name}`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Máy XN', val: items.length, sub: 'tổng' },
        { lbl: 'Đang KN', val: counts.connected || 0, sub: `${Math.round(((counts.connected || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Mất KN', val: counts.disconnected || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'LabConnect', val: labconn?.isConnected ? 'OK' : 'OFF', sub: labconn?.isConnected ? 'hoạt động' : 'chưa cấu hình', tone: labconn?.isConnected ? 'ok' : 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / hãng / model / IP…" />
        <Filter value={fProto} onChange={setFProto} options={protos} placeholder="▾ Protocol" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFProto(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở LabConnect')}>
          <Ico name="activity" size={12} /> LabConnect
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở thêm máy XN')}>
          <Ico name="plus" size={12} /> Thêm máy
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<AnalyzerDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có máy XN cấu hình'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? sel.name : ''}
        sub={sel ? `${sel.manufacturer} · ${sel.model}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Test kết nối')}>
            <Ico name="refresh" size={12} /> Test KN
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Mở chỉnh sửa')}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Tên">{sel.name}</DrField>
            <DrField lbl="Hãng">{sel.manufacturer}</DrField>
            <DrField lbl="Model"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.model}</span></DrField>
            <DrField lbl="Mô tả">{sel.description || '—'}</DrField>
          </DrSec>
          <DrSec title="Cấu hình kết nối">
            <DrField lbl="Protocol">{sel.connectionType}</DrField>
            {sel.protocolVersion && <DrField lbl="Phiên bản">v{sel.protocolVersion}</DrField>}
            {sel.ipAddress && <DrField lbl="IP · Port"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.ipAddress}:{sel.port}</span></DrField>}
            {sel.baudRate && <DrField lbl="Baud rate"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.baudRate} bps</span></DrField>}
            <DrField lbl="Bật">
              {sel.isActive
                ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
                : <StatusBadge tone="warn" dot>Tắt</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Kết nối">
              <StatusBadge tone={CONN_TONE[sel.connectionStatus || 'Unknown'] || 'warn'} dot>
                {CONN_LABEL[sel.connectionStatus || 'Unknown'] || '—'}
              </StatusBadge>
            </DrField>
            {sel.lastConnectedAt && <DrField lbl="Lần cuối KN">{dayjs(sel.lastConnectedAt).format('DD/MM/YYYY HH:mm')}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default LISConfigV2;
