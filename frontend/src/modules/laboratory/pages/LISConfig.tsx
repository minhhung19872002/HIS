import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getAnalyzers, getLabconnectStatus, createAnalyzer, updateAnalyzer, deleteAnalyzer,
  testAnalyzerConnection, syncLabconnect,
} from '../api/lisConfig';
import type { AnalyzerDto, LabconnectStatusDto, CreateAnalyzerDto } from '../api/lisConfig';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, tk, ti, tw, te, cf, useTabCounts,
  type ColumnDef, type CrudFieldCfg,
} from '../../../pages-v2/_v2kit';

const ANALYZER_FIELDS: CrudFieldCfg[] = [
  { key: 'name', label: 'Tên máy XN', required: true },
  { key: 'manufacturer', label: 'Hãng sản xuất', required: true },
  { key: 'model', label: 'Model', required: true },
  { key: 'connectionType', label: 'Protocol', type: 'select', required: true, options: [
    { value: 'HL7', label: 'HL7' }, { value: 'ASTM', label: 'ASTM' }, { value: 'Serial', label: 'Serial' }] },
  { key: 'protocolVersion', label: 'Phiên bản protocol', placeholder: 'VD: 2.5.1' },
  { key: 'ipAddress', label: 'Địa chỉ IP', placeholder: 'VD: 192.168.1.50' },
  { key: 'port', label: 'Port', type: 'number', placeholder: 'VD: 8080' },
  { key: 'baudRate', label: 'Baud rate (Serial)', type: 'number', placeholder: 'VD: 9600' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'isActive', label: 'Kích hoạt', type: 'switch' },
];

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
  const navigate = useNavigate();
  const [items, setItems] = useState<AnalyzerDto[]>([]);
  const [labconn, setLabconn] = useState<LabconnectStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fProto, setFProto] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AnalyzerDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ connectionType: 'HL7', isActive: true }); setCrudOpen(true); };
  const openEdit = (r: AnalyzerDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: AnalyzerDto) => cf(`Xoá máy XN "${r.name}"?`, async () => {
    try { await deleteAnalyzer(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });
  const testConn = async (r: AnalyzerDto) => {
    try {
      const res = await testAnalyzerConnection(r.id);
      (res.data?.success ? tk : tw)(res.data?.message || (res.data?.success ? 'Kết nối thành công' : 'Kết nối thất bại'));
      load();
    } catch { te('Test kết nối thất bại'); }
  };
  const runLabconnect = async () => {
    try { await syncLabconnect(); tk('Đã chạy đồng bộ LabConnect'); load(); } catch { te('Đồng bộ LabConnect thất bại'); }
  };

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

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r));

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
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.manufacturer}</div>
      </div>
    ) },
    { key: 'model', label: 'Model', code: true, render: (r) => r.model },
    { key: 'proto', label: 'Protocol', render: (r) => (
      <div>
        <StatusBadge tone="info">{r.connectionType}</StatusBadge>
        {r.protocolVersion && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>v{r.protocolVersion}</div>}
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
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => testConn(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
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
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFProto(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="activity" onClick={runLabconnect}>LabConnect</Btn>
        <Btn variant="ghost" icon="inbox" onClick={() => navigate('/v2/analyzer-inbox')}>KQ máy</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm máy</Btn>
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
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="refresh" onClick={() => { if (sel) testConn(sel); }}>Test KN</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
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

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật máy xét nghiệm' : 'Thêm máy xét nghiệm'}
        fields={ANALYZER_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateAnalyzerDto;
          if (editing && crudInit?.id) await updateAnalyzer(crudInit.id as string, dto);
          else await createAnalyzer(dto);
          tk(editing ? 'Đã cập nhật máy XN' : 'Đã thêm máy XN');
          load();
        }}
      />
    </div>
  );
};

export default LISConfigV2;
