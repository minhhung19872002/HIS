import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getDevices } from '../api/endpointSecurity';
import type { EndpointDeviceDto } from '../api/endpointSecurity';
import { GenericListPage } from './_GenericListPage';

const EndpointSecurityV2: React.FC = () => {
  const [items, setItems] = useState<EndpointDeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<EndpointDeviceDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await getDevices(keyword || undefined);
      const list = (r?.data?.items || (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []))) as EndpointDeviceDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => [
    { label: 'Tổng máy', value: items.length },
    { label: 'Tuân thủ', value: items.filter((d) => d.isCompliant).length, tone: 'ok' as const },
    { label: 'Chưa tuân thủ', value: items.filter((d) => !d.isCompliant).length, tone: 'crit' as const },
    { label: 'Online 7d', value: items.filter((d) => d.lastSeenAt && dayjs(d.lastSeenAt).isAfter(dayjs().subtract(7, 'day'))).length, tone: 'cy' as const },
  ], [items]);

  return (
    <GenericListPage<EndpointDeviceDto>
      title="ATTT — Endpoint" v1Path="/endpoint-security"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm hostname / IP..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'host', label: 'Hostname', render: (r) => <span className="mono">{r.hostname}</span> },
        { key: 'ip', label: 'IP / MAC', render: (r) => <span className="mono">{r.ipAddress || '—'}</span> },
        { key: 'os', label: 'OS', render: (r) => <span className="muted">{r.operatingSystem} {r.osVersion}</span> },
        { key: 'av', label: 'AV', render: (r) => <span className="muted">{r.antivirusName || '—'}</span> },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}</span> },
        { key: 'last', label: 'Last seen', render: (r) => <span className="mono">{r.lastSeenAt ? dayjs(r.lastSeenAt).format('DD/MM HH:mm') : '—'}</span> },
        { key: 'comp', label: 'Tuân thủ', render: (r) => r.isCompliant ? <span className="chip ok">✓</span> : <span className="chip crit">✗</span> },
      ]}
      detailTitle={sel?.hostname || 'Chọn máy'}
      detailFields={!sel ? null : [
        { label: 'Hostname', value: <span className="mono">{sel.hostname}</span> },
        { label: 'IP', value: <span className="mono">{sel.ipAddress || '—'}</span> },
        { label: 'MAC', value: <span className="mono">{sel.macAddress || '—'}</span> },
        { label: 'OS', value: `${sel.operatingSystem || '—'} ${sel.osVersion || ''}` },
        { label: 'AV', value: sel.antivirusName || '—' },
        ...(sel.antivirusLastUpdate ? [{ label: 'AV cập nhật', value: <span className="mono">{dayjs(sel.antivirusLastUpdate).format('DD/MM HH:mm')}</span> }] : []),
        { label: 'Khoa', value: sel.departmentName || '—' },
        { label: 'NSD', value: sel.assignedUser || '—' },
        { label: 'Trạng thái', value: <span className="chip">{sel.statusText}</span> },
        { label: 'Tuân thủ', value: sel.isCompliant ? <span style={{ color: 'var(--s-ok)' }}>Có</span> : <span style={{ color: 'var(--s-crit)' }}>Không</span> },
      ]}
    />
  );
};

export default EndpointSecurityV2;
