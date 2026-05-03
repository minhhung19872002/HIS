import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { getBloodStock, getExpiringBloodBags, getIssueRequests } from '../api/bloodBank';
import type { BloodStockDto, BloodBagDto, BloodIssueRequestDto } from '../api/bloodBank';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Ngân hàng máu v2 — port of design-system-v2/his/project/BloodBank v2.html
   Layout: KpiStrip + TopTabs (stock / expiring / requests)
   Simplified vs design pack: skip donor + screening tabs (need separate APIs).
   ──────────────────────────────────────────────────────────── */

const BLOOD_TYPES = ['O', 'A', 'B', 'AB'];
const RH = ['+', '-'];
const ALL_TYPES = BLOOD_TYPES.flatMap((b) => RH.map((r) => `${b}${r}`));

type TopKey = 'stock' | 'expiring' | 'requests';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'stock',     l: 'Tồn kho theo nhóm máu', ic: 'drop' },
  { v: 'expiring',  l: 'Sắp hết hạn',           ic: 'alert' },
  { v: 'requests',  l: 'Yêu cầu xuất máu',      ic: 'send' },
];

const fmtVol = (n: number) => `${n.toLocaleString('vi-VN')} mL`;
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const BloodBankV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<TopKey>('stock');
  const [stock, setStock] = useState<BloodStockDto[]>([]);
  const [expiring, setExpiring] = useState<BloodBagDto[]>([]);
  const [requests, setRequests] = useState<BloodIssueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [detailType, setDetailType] = useState<string | null>(null);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      getBloodStock(),
      getExpiringBloodBags(7),
      getIssueRequests(dayjs().subtract(60, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
    ]).then(([s, e, r]) => {
      if (s.status === 'fulfilled') setStock((s.value.data || []) as BloodStockDto[]);
      if (e.status === 'fulfilled') setExpiring((e.value.data || []) as unknown as BloodBagDto[]);
      if (r.status === 'fulfilled') setRequests((r.value.data || []) as BloodIssueRequestDto[]);
      setLoading(false);
    });
  };
  useEffect(reload, []);

  // ─── Aggregate stock by blood type+rh ───
  const byType = useMemo(() => {
    const map: Record<string, { total: number; available: number; reserved: number; expiring: number; expired: number; volume: number }> = {};
    ALL_TYPES.forEach((k) => {
      map[k] = { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 };
    });
    stock.forEach((s) => {
      const k = `${s.bloodType}${s.rhFactor}`;
      if (!map[k]) map[k] = { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 };
      map[k].total += s.totalBags;
      map[k].available += s.availableBags;
      map[k].reserved += s.reservedBags;
      map[k].expiring += s.expiringWithin7Days;
      map[k].expired += s.expiredBags;
      map[k].volume += s.totalVolume || 0;
    });
    return map;
  }, [stock]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = stock.reduce((s, r) => s + r.totalBags, 0);
    const available = stock.reduce((s, r) => s + r.availableBags, 0);
    const reserved = stock.reduce((s, r) => s + r.reservedBags, 0);
    const expiring7 = stock.reduce((s, r) => s + r.expiringWithin7Days, 0);
    const pendingReq = requests.filter((r) => r.status === 'pending' || r.status === 'Pending').length;
    const oNeg = byType['O-']?.available || 0;
    return { total, available, reserved, expiring7, pendingReq, oNeg };
  }, [stock, requests, byType]);

  // ─── Filtered detail rows for Stock tab ───
  const stockRows = useMemo(() => {
    return ALL_TYPES.map((t) => ({ key: t, ...byType[t] }))
      .filter((r) => !filterType || r.key === filterType);
  }, [byType, filterType]);

  const expiringFiltered = useMemo(() => {
    return expiring.filter((b) => {
      if (filterType && `${b.bloodType}${b.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [b.bagCode, b.barcode, b.donorName, b.donorCode, b.storageLocation, b.productTypeName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expiring, search, filterType]);

  const requestsFiltered = useMemo(() => {
    return requests.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hay = [(r as any).requestCode, (r as any).patientName, (r as any).departmentName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(
    (tab === 'stock' ? stockRows.length : tab === 'expiring' ? expiringFiltered.length : requestsFiltered.length) / PAGE_SIZE,
  ));

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Tổng đơn vị', val: kpis.total, sub: 'tất cả nhóm' },
          { lbl: 'Khả dụng', val: kpis.available, sub: 'sẵn sàng cấp', tone: 'ok' },
          { lbl: 'Đặt trước', val: kpis.reserved, sub: 'đã reserve' },
          { lbl: 'Hết hạn ≤7 ngày', val: kpis.expiring7, sub: 'cần xử lý', tone: 'warn' },
          { lbl: 'Yêu cầu chờ', val: kpis.pendingReq, sub: 'chờ duyệt', tone: 'warn' },
          { lbl: 'O- khả dụng', val: kpis.oNeg, sub: 'cấp cứu', tone: kpis.oNeg < 5 ? 'crit' : 'ok' },
        ]}
      />

      <TopTabs<TopKey>
        tab={tab}
        setTab={setTab}
        tabs={TOP_TABS}
        actions={
          <>
            <button type="button" className="ab-btn ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </button>
            <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Tạo phiếu xuất máu')}>
              <TermIcon name="plus" size={12} /> Xuất máu
            </button>
          </>
        }
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã túi / barcode / hiến / khoa…" />
        <Filter
          value={filterType} onChange={setFilterType}
          options={ALL_TYPES.map((t) => ({ v: t, l: t }))}
          placeholder="▾ Nhóm máu"
        />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setFilterType(''); setPage(0); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {tab === 'stock' ? `${stockRows.length} nhóm` :
           tab === 'expiring' ? `${expiringFiltered.length} túi` :
           `${requestsFiltered.length} yêu cầu`}
        </span>
      </div>

      {tab === 'stock' && <StockTab rows={stockRows} loading={loading} onPick={setDetailType} />}
      {tab === 'expiring' && <ExpiringTab rows={expiringFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} message={message} />}
      {tab === 'requests' && <RequestsTab rows={requestsFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} />}

      {tab !== 'stock' && (
        <Pager page={page} totalPages={totalPages} setPage={setPage}
          total={tab === 'expiring' ? expiringFiltered.length : requestsFiltered.length} perPage={PAGE_SIZE} />
      )}

      <DrawerShell
        open={!!detailType}
        onClose={() => setDetailType(null)}
        title={detailType ? `Nhóm máu ${detailType}` : ''}
        sub={detailType ? `Tồn kho và phân bổ chế phẩm` : ''}
        size="lg"
      >
        {detailType && <BloodTypeDetail type={detailType} stock={stock} />}
      </DrawerShell>
    </div>
  );
};

const StockTab: React.FC<{
  rows: { key: string; total: number; available: number; reserved: number; expiring: number; expired: number; volume: number }[];
  loading: boolean;
  onPick: (t: string) => void;
}> = ({ rows, loading, onPick }) => (
  <div className="ab-stack" style={{ padding: '14px', overflow: 'auto' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {loading && <div style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--t-2)', padding: 20 }}>Đang tải…</div>}
      {!loading && rows.map((r) => {
        const isCrit = r.available === 0;
        const isLow = r.available > 0 && r.available <= 5;
        const banner = isCrit ? 'crit' : isLow ? 'warn' : r.expiring > 0 ? 'warn' : 'ok';
        return (
          <button key={r.key} type="button" onClick={() => onPick(r.key)} style={{
            background: '#fff', border: `1.5px solid ${
              banner === 'crit' ? '#fca5a5' :
              banner === 'warn' ? '#fcd34d' :
              'var(--line)'
            }`,
            borderRadius: 8, padding: '14px 16px',
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
                color: r.key.endsWith('-') ? 'var(--s-crit)' : 'var(--a-cy)',
              }}>{r.key}</span>
              <span className={`chip ${banner}`}>{r.available} khả dụng</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 11.5 }}>
              <span style={{ color: 'var(--t-2)' }}>Tổng</span><b className="mono">{r.total}</b>
              <span style={{ color: 'var(--t-2)' }}>Đặt trước</span><b className="mono">{r.reserved}</b>
              <span style={{ color: 'var(--t-2)' }}>Sắp HSD</span>
              <b className="mono" style={{ color: r.expiring > 0 ? 'var(--s-warn)' : 'var(--t-1)' }}>{r.expiring}</b>
              <span style={{ color: 'var(--t-2)' }}>Thể tích</span><b className="mono">{fmtVol(r.volume)}</b>
            </div>
          </button>
        );
      })}
      {!loading && rows.length === 0 && (
        <div style={{ gridColumn: 'span 4', textAlign: 'center', color: 'var(--t-2)', padding: 20 }}>
          Không có nhóm máu nào khớp lọc
        </div>
      )}
    </div>
  </div>
);

const ExpiringTab: React.FC<{
  rows: BloodBagDto[];
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
}> = ({ rows, loading, message }) => {
  const columns: ColumnDef<BloodBagDto>[] = [
    { key: 'bag', label: 'Mã túi', mono: true, width: 130, render: (b) => b.bagCode },
    { key: 'barcode', label: 'Barcode', mono: true, width: 130, render: (b) => b.barcode },
    {
      key: 'type', label: 'Nhóm', width: 80,
      render: (b) => (
        <span className="chip cy mono" style={{ fontWeight: 700 }}>{b.bloodType}{b.rhFactor}</span>
      ),
    },
    { key: 'product', label: 'Chế phẩm', render: (b) => b.productTypeName },
    {
      key: 'volume', label: 'Thể tích', mono: true, width: 100,
      render: (b) => `${b.volume} ${b.unit || 'mL'}`,
    },
    { key: 'donor', label: 'Người hiến', render: (b) => b.donorName || '—' },
    {
      key: 'expiry', label: 'HSD', mono: true, width: 110,
      render: (b) => {
        const days = dayjs(b.expiryDate).diff(dayjs(), 'day');
        const color = days < 0 ? 'var(--s-crit)' : days <= 3 ? 'var(--s-warn)' : 'var(--t-1)';
        return (
          <div className="cell-2l">
            <b style={{ color }}>{fmtDMY(b.expiryDate)}</b>
            <i style={{ color }}>{days < 0 ? `Hết ${-days}d` : `Còn ${days}d`}</i>
          </div>
        );
      },
    },
    { key: 'storage', label: 'Vị trí', mono: true, width: 100, render: (b) => b.storageLocation || '—' },
    {
      key: 'status', label: 'TT', width: 110,
      render: (b) => <StatusBadge tone={b.status === 'available' ? 'ok' : 'warn'} dot>{b.status}</StatusBadge>,
    },
  ];
  return (
    <DataTable<BloodBagDto>
      columns={columns}
      data={rows}
      rowKey={(b) => b.id}
      actions={(b) => (
        <div className="ab-actions">
          <ActBtn ic="send" title="Cấp phát" onClick={() => message.info(`Cấp phát ${b.bagCode}`)} />
          <ActBtn ic="alert" title="Tiêu huỷ" onClick={() => message.warning(`Đánh dấu tiêu huỷ ${b.bagCode}`)} tone="warn" />
        </div>
      )}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="check" size={20} />
          <div>Không có túi máu nào sắp hết hạn</div>
        </div>
      )}
    />
  );
};

const RequestsTab: React.FC<{ rows: BloodIssueRequestDto[]; loading: boolean }> = ({ rows, loading }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols: ColumnDef<any>[] = [
    { key: 'code', label: 'Mã YC', mono: true, width: 130, render: (r) => r.requestCode || r.id?.slice(0, 8) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'dept', label: 'Khoa yêu cầu', render: (r) => r.departmentName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => r.indication || r.reason || '—' },
    { key: 'urgency', label: 'Mức', width: 100,
      render: (r) => <span className={`chip ${r.urgency === 'STAT' || r.urgency === 'urgent' ? 'crit' : 'info'}`}>{r.urgency || 'Thường'}</span> },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => <StatusBadge tone={r.status === 'approved' || r.status === 'issued' ? 'ok' : 'warn'} dot>{r.statusName || r.status}</StatusBadge>,
    },
    {
      key: 'date', label: 'Ngày YC', mono: true, width: 110,
      render: (r) => fmtDMY(r.requestDate || r.createdAt),
    },
  ];
  return (
    <DataTable
      columns={cols}
      data={rows as unknown as Record<string, unknown>[]}
      rowKey={(r) => (r as { id: string }).id}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="search" size={20} />
          <div>Chưa có yêu cầu xuất máu</div>
        </div>
      )}
    />
  );
};

const BloodTypeDetail: React.FC<{ type: string; stock: BloodStockDto[] }> = ({ type, stock }) => {
  const bloodType = type.replace(/[+-]$/, '');
  const rh = type.endsWith('+') ? '+' : '-';
  const items = stock.filter((s) => s.bloodType === bloodType && s.rhFactor === rh);
  const totals = items.reduce((acc, s) => ({
    total: acc.total + s.totalBags,
    available: acc.available + s.availableBags,
    reserved: acc.reserved + s.reservedBags,
    expiring: acc.expiring + s.expiringWithin7Days,
    expired: acc.expired + s.expiredBags,
    volume: acc.volume + s.totalVolume,
  }), { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 });

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="drop" size={11} /> TỔNG QUAN</h5>
        <div className="rec-kv">
          <span>Nhóm máu</span><b className="mono" style={{ fontSize: 14 }}>{type}</b>
          <span>Tổng đơn vị</span><b>{totals.total}</b>
          <span>Khả dụng</span><b style={{ color: '#15803d' }}>{totals.available}</b>
          <span>Đặt trước</span><b>{totals.reserved}</b>
          <span>Sắp HSD ≤7d</span><b style={{ color: 'var(--s-warn)' }}>{totals.expiring}</b>
          <span>Đã hết hạn</span><b style={{ color: 'var(--s-crit)' }}>{totals.expired}</b>
          <span>Tổng thể tích</span><b className="mono">{fmtVol(totals.volume)}</b>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="activity" size={11} /> THEO CHẾ PHẨM ({items.length})</h5>
        {items.length === 0 && <span style={{ color: 'var(--t-3)', fontSize: 12 }}>Không có chế phẩm nào trong nhóm này</span>}
        {items.map((s) => (
          <div key={`${s.productTypeId}`} style={{
            padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
            display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, fontSize: 12.5, alignItems: 'center',
          }}>
            <b>{s.productTypeName}</b>
            <span className="chip ok">{s.availableBags}</span>
            <span className="chip info">{s.reservedBags}</span>
            <span className="mono" style={{ color: 'var(--t-2)' }}>{fmtVol(s.totalVolume)}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default BloodBankV2;
