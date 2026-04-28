import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getAnalyzers, getLabconnectStatus } from '../api/lisConfig';
import type { AnalyzerDto, LabconnectStatusDto } from '../api/lisConfig';
import { GenericListPage } from './_GenericListPage';

const CONN: Record<string, { text: string; cls: string }> = {
  Connected: { text: 'Đã KN', cls: 'ok' },
  Disconnected: { text: 'Mất KN', cls: 'crit' },
  Unknown: { text: 'Không rõ', cls: 'ghost' },
};

const LISConfigV2: React.FC = () => {
  const [items, setItems] = useState<AnalyzerDto[]>([]);
  const [labconn, setLabconn] = useState<LabconnectStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<AnalyzerDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, lc] = await Promise.all([
        getAnalyzers(),
        getLabconnectStatus().catch(() => ({ data: null as LabconnectStatusDto | null })),
      ]);
      const list = r.data || [];
      const k = keyword.trim().toLowerCase();
      setItems(k ? list.filter((a) => `${a.name} ${a.model} ${a.manufacturer}`.toLowerCase().includes(k)) : list);
      setLabconn(lc.data || null);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Máy XN', value: items.length },
    { label: 'Đang KN', value: items.filter((a) => a.connectionStatus === 'Connected').length, tone: 'ok' as const },
    { label: 'Mất KN', value: items.filter((a) => a.connectionStatus === 'Disconnected').length, tone: 'crit' as const },
    { label: 'LabConnect', value: labconn?.isConnected ? 'OK' : '—', tone: labconn?.isConnected ? ('ok' as const) : undefined },
  ], [items, labconn]);

  return (
    <GenericListPage<AnalyzerDto>
      title="Cấu hình LIS — Máy phân tích" v1Path="/lis-config"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm tên / hãng / model..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'name', label: 'Tên máy', render: (r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        { key: 'mfg', label: 'Hãng', render: (r) => <span className="muted">{r.manufacturer}</span> },
        { key: 'model', label: 'Model', render: (r) => <span className="mono">{r.model}</span> },
        { key: 'proto', label: 'Protocol', render: (r) => <span className="muted">{r.connectionType}{r.protocolVersion ? ` ${r.protocolVersion}` : ''}</span> },
        { key: 'addr', label: 'Địa chỉ', render: (r) => <span className="mono">{r.ipAddress ? `${r.ipAddress}:${r.port}` : (r.baudRate ? `${r.baudRate} bps` : '—')}</span> },
        { key: 'conn', label: 'KN', render: (r) => {
          const c = CONN[r.connectionStatus || 'Unknown'] || CONN.Unknown;
          return <span className={`chip ${c.cls}`}>{c.text}</span>;
        } },
        { key: 'active', label: 'Bật', render: (r) => r.isActive ? <span className="chip ok">Có</span> : <span className="chip ghost">Không</span> },
      ]}
      detailTitle={sel?.name || 'Chọn máy'}
      detailFields={!sel ? null : [
        { label: 'Tên', value: sel.name },
        { label: 'Hãng / Model', value: `${sel.manufacturer} · ${sel.model}` },
        { label: 'Protocol', value: `${sel.connectionType}${sel.protocolVersion ? ' v' + sel.protocolVersion : ''}` },
        { label: 'IP / Cổng', value: <span className="mono">{sel.ipAddress ? `${sel.ipAddress}:${sel.port}` : '—'}</span> },
        { label: 'Baud', value: <span className="mono">{sel.baudRate || '—'}</span> },
        { label: 'KN', value: CONN[sel.connectionStatus || 'Unknown']?.text || '—' },
        ...(sel.lastConnectedAt ? [{ label: 'KN gần nhất', value: <span className="mono">{dayjs(sel.lastConnectedAt).format('DD/MM HH:mm')}</span> }] : []),
        { label: 'Mô tả', value: sel.description || '—' },
        { label: 'Bật', value: sel.isActive ? 'Có' : 'Không' },
      ]}
    />
  );
};

export default LISConfigV2;
