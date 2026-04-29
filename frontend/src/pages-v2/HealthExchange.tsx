import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getConnections, type HIEConnectionDto } from '../api/healthExchange';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const PER = 18;

type StatusKey = 'active' | 'inactive' | 'error';
const STATUS_TABS = [
  { v: 'active' as StatusKey,   l: 'Hoạt động', tone: 'ok' as const },
  { v: 'inactive' as StatusKey, l: 'Tạm dừng',  tone: 'warn' as const },
  { v: 'error' as StatusKey,    l: 'Lỗi',       tone: 'crit' as const },
];

const statusKey = (n: number): StatusKey => n === 1 ? 'active' : n === 3 ? 'error' : 'inactive';

const HealthExchangeV2: React.FC = () => {
  const [items, setItems] = useState<HIEConnectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HIEConnectionDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getConnections();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (Array.isArray(r) ? r : (r as any)?.items || []) as HIEConnectionDto[];
      setItems(data);
    } catch { setItems([]); ti('Không tải được kết nối HIE'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.connectionType).filter(Boolean));
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fType && r.connectionType !== fType) return false;
      if (!k) return true;
      return [r.connectionName, r.connectionCode, r.partnerName].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalErr = items.reduce((s, r) => s + (r.errorCount || 0), 0);

  const cols: ColumnDef<HIEConnectionDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.connectionCode || '—' },
    { key: 'name', label: 'Tên kết nối', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.connectionName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.partnerName}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => r.connectionTypeName || r.connectionType },
    { key: 'protocol', label: 'Protocol', mono: true, render: (r) => `${r.protocol} · ${r.dataExchangeFormat}` },
    { key: 'last', label: 'Đồng bộ cuối', mono: true, render: (r) => r.lastSyncAt ? dayjs(r.lastSyncAt).fromNow() : '—' },
    { key: 'err', label: 'Lỗi', mono: true, render: (r) => (r.errorCount || 0) > 0
      ? <span style={{ color: 'var(--a-rd-text)' }}>{r.errorCount}</span>
      : <span style={{ color: 'var(--t-3)' }}>0</span>
    },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const s = statusKey(r.status);
      const tone = s === 'active' ? 'ok' : s === 'error' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{r.statusName || STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: HIEConnectionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => tk(`Đang kiểm tra ${r.connectionName}…`)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng kết nối', val: items.length, sub: `${types.length} loại` },
        { lbl: 'Hoạt động', val: counts.active || 0, sub: 'đang chạy', tone: 'ok' },
        { lbl: 'Tạm dừng', val: counts.inactive || 0, sub: 'inactive', tone: 'warn' },
        { lbl: 'Lỗi', val: counts.error || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Tổng lỗi 24h', val: totalErr, sub: 'sự cố', tone: totalErr > 0 ? 'warn' : 'ok' },
        { lbl: 'Đối tác', val: new Set(items.map((r) => r.partnerCode)).size, sub: 'BHXH/MOH/Lab' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / đối tác…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại kết nối" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã chạy đồng bộ tất cả')}>
          <Ico name="cloud" size={12} /> Đồng bộ tất cả
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở form thêm kết nối')}>
          <Ico name="plus" size={12} /> Thêm kết nối
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HIEConnectionDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có kết nối HIE nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.connectionName ?? ''}
        sub={sel ? `${sel.connectionCode} · ${sel.partnerName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk(`Đang kiểm tra ${sel?.connectionName}…`)}>
            <Ico name="refresh" size={12} /> Test kết nối
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đồng bộ thủ công thành công')}>
            <Ico name="cloud" size={12} /> Đồng bộ ngay
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin chung">
            <DrField lbl="Mã">{sel.connectionCode}</DrField>
            <DrField lbl="Tên">{sel.connectionName}</DrField>
            <DrField lbl="Loại">{sel.connectionTypeName || sel.connectionType}</DrField>
            <DrField lbl="Đối tác">{sel.partnerCode} — {sel.partnerName}</DrField>
            <DrField lbl="Endpoint"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{sel.endpoint}</span></DrField>
            <DrField lbl="Protocol"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.protocol} · {sel.dataExchangeFormat}</span></DrField>
            <DrField lbl="Auth">{sel.authType}</DrField>
          </DrSec>
          <DrSec title="Trạng thái & lịch sử">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={statusKey(sel.status) === 'active' ? 'ok' : statusKey(sel.status) === 'error' ? 'crit' : 'warn'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === statusKey(sel.status))?.l}
              </StatusBadge>
            </DrField>
            <DrField lbl="Kết nối cuối">{sel.lastConnectedAt ? dayjs(sel.lastConnectedAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Đồng bộ cuối">{sel.lastSyncAt ? dayjs(sel.lastSyncAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Số lỗi"><span style={{ color: (sel.errorCount || 0) > 0 ? 'var(--a-rd-text)' : 'var(--t-2)' }}>{sel.errorCount}</span></DrField>
            <DrField lbl="Lỗi gần nhất">{sel.lastError || '—'}</DrField>
          </DrSec>
          <DrSec title="Hoạt động hỗ trợ">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(sel.supportedOperations || []).map((op, i) => (
                <span key={i} className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>{op}</span>
              ))}
              {(!sel.supportedOperations || sel.supportedOperations.length === 0) && (
                <span style={{ color: 'var(--t-3)', fontSize: 12 }}>—</span>
              )}
            </div>
          </DrSec>
          {sel.certificateExpiry && (
            <DrSec title="Chứng thư">
              <DrField lbl="Hết hạn">{dayjs(sel.certificateExpiry).format('DD/MM/YYYY')}</DrField>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default HealthExchangeV2;
