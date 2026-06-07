import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, InputNumber } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { DatePicker } from 'antd';
import { getBloodStock, getBloodStockDetail, getExpiringBloodBags, getIssueRequests, getProductTypes, createIssueRequest, createImportReceipt, getSuppliers, updateBloodBagStatus, destroyExpiredBloodBags } from '../api/bloodBank';
import type { BloodStockDto, BloodBagDto, BloodIssueRequestDto, BloodProductTypeDto, BloodStockDetailDto, BloodSupplierDto } from '../api/bloodBank';
import { catalogApi } from '../api/system';
import type { DepartmentCatalogDto } from '../api/system';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, ModalShell,
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
  { v: 'stock',     l: 'Kho máu',          ic: 'drop' },
  { v: 'expiring',  l: 'Sắp hết hạn',      ic: 'alert' },
  { v: 'requests',  l: 'Yêu cầu xuất máu', ic: 'send' },
];

const STATUS_LABEL: Record<string, { l: string; tone: 'ok' | 'warn' | 'info' | 'crit' }> = {
  Available: { l: 'Khả dụng', tone: 'ok' },
  Reserved: { l: 'Đặt trước', tone: 'info' },
  Issued: { l: 'Đã xuất', tone: 'info' },
  Expired: { l: 'Hết hạn', tone: 'crit' },
  Quarantine: { l: 'Cách ly', tone: 'warn' },
};

const fmtVol = (n: number) => `${n.toLocaleString('vi-VN')} mL`;
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const BloodBankV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState<TopKey>('stock');
  const [stock, setStock] = useState<BloodStockDto[]>([]);
  const [units, setUnits] = useState<BloodStockDetailDto[]>([]);
  const [expiring, setExpiring] = useState<BloodBagDto[]>([]);
  const [requests, setRequests] = useState<BloodIssueRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [detailType, setDetailType] = useState<string | null>(null);
  const [unitSel, setUnitSel] = useState<BloodStockDetailDto | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    Promise.allSettled([
      getBloodStock(),
      getBloodStockDetail(),
      getExpiringBloodBags(7),
      getIssueRequests(dayjs().subtract(60, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
    ]).then(([s, u, e, r]) => {
      if (s.status === 'fulfilled') setStock((s.value.data || []) as BloodStockDto[]);
      if (u.status === 'fulfilled') setUnits((u.value.data || []) as BloodStockDetailDto[]);
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

  // (stockRows useMemo + StockTab component dead code — removed K1 audit cleanup 2026-05-30)

  // ─── Blood units (Kho máu table) ───
  const unitsFiltered = useMemo(() => {
    return units.filter((u) => {
      if (filterType && `${u.bloodType}${u.rhFactor}` !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [u.bagCode, u.barcode, u.storageLocation, u.productTypeName, u.bloodType]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [units, search, filterType]);

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
        const hay = [r.requestCode, r.patientName, r.departmentName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(
    (tab === 'stock' ? unitsFiltered.length : tab === 'expiring' ? expiringFiltered.length : requestsFiltered.length) / PAGE_SIZE,
  ));

  // Unit table columns (mock "Kho máu")
  const unitColumns: ColumnDef<BloodStockDetailDto>[] = [
    { key: 'bag', label: 'Mã đơn vị', mono: true, code: true, width: 150, render: (u) => u.bagCode },
    { key: 'type', label: 'Nhóm', width: 80, render: (u) => <span className="chip crit" style={{ fontWeight: 700 }}>{u.bloodType}{u.rhFactor}</span> },
    { key: 'product', label: 'Chế phẩm', render: (u) => u.productTypeName },
    { key: 'vol', label: 'Thể tích', mono: true, width: 90, render: (u) => `${u.volume} mL` },
    { key: 'loc', label: 'Vị trí', render: (u) => u.storageLocation || '—' },
    {
      key: 'exp', label: 'HSD', mono: true, width: 130,
      render: (u) => (
        <span style={{ color: u.daysUntilExpiry < 7 ? 'var(--s-crit)' : u.daysUntilExpiry < 30 ? 'var(--s-warn)' : 'var(--t-1)' }}>
          {fmtDMY(u.expiryDate)}{u.daysUntilExpiry != null ? ` · ${u.daysUntilExpiry}d` : ''}
        </span>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: 120,
      render: (u) => {
        const m = STATUS_LABEL[u.status] || { l: u.status, tone: 'info' as const };
        return <StatusBadge tone={m.tone} dot>{m.l}</StatusBadge>;
      },
    },
  ];
  const unitsPaged = unitsFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
            <Btn variant="ghost" onClick={reload}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => setReceiveOpen(true)}>
              <TermIcon name="plus" size={12} /> Nhận máu
            </Btn>
            <Btn variant="primary" onClick={() => setIssueOpen(true)}>
              <TermIcon name="send" size={12} /> Xuất máu
            </Btn>
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
        <Btn variant="ghost" onClick={() => { setSearch(''); setFilterType(''); setPage(0); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {tab === 'stock' ? `${unitsFiltered.length} đơn vị` :
           tab === 'expiring' ? `${expiringFiltered.length} túi` :
           `${requestsFiltered.length} yêu cầu`}
        </span>
      </div>

      {tab === 'stock' && (
        <>
          {/* Group-count chip bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 14px', borderBottom: '1px solid var(--line-soft)', background: 'var(--d-1)' }}>
            {ALL_TYPES.map((t) => {
              const a = byType[t]?.available || 0;
              return (
                <button key={t} type="button" onClick={() => { setFilterType(filterType === t ? '' : t); setPage(0); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 14,
                    border: filterType === t ? '1px solid var(--a-cy)' : '1px solid var(--line)',
                    background: filterType === t ? 'var(--a-cy-bg, #ecfeff)' : '#fff', cursor: 'pointer', fontSize: 11.5,
                  }}>
                  <b style={{ color: a < 5 ? 'var(--s-crit)' : 'var(--t-0)' }}>{t}</b>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-2)' }}>{a}đv</span>
                </button>
              );
            })}
          </div>
          <DataTable<BloodStockDetailDto>
            columns={unitColumns}
            data={unitsPaged}
            rowKey={(u) => u.bloodBagId}
            onRowClick={setUnitSel}
            empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="drop" size={20} /><div>Không có đơn vị máu</div></div>}
          />
        </>
      )}
      {tab === 'expiring' && <ExpiringTab rows={expiringFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} message={message} onReload={reload} />}
      {tab === 'requests' && <RequestsTab rows={requestsFiltered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)} loading={loading} />}

      <Pager page={page} totalPages={totalPages} setPage={setPage}
        total={tab === 'stock' ? unitsFiltered.length : tab === 'expiring' ? expiringFiltered.length : requestsFiltered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detailType}
        onClose={() => setDetailType(null)}
        title={detailType ? `Nhóm máu ${detailType}` : ''}
        sub={detailType ? `Tồn kho và phân bổ chế phẩm` : ''}
        size="lg"
      >
        {detailType && <BloodTypeDetail type={detailType} stock={stock} />}
      </DrawerShell>

      <DrawerShell
        open={!!unitSel}
        onClose={() => setUnitSel(null)}
        size="md"
        title={unitSel ? `Đơn vị máu ${unitSel.bagCode}` : ''}
        sub={unitSel ? `${unitSel.bloodType}${unitSel.rhFactor} · ${unitSel.productTypeName}` : ''}
      >
        {unitSel && (
          <DrSec title="Đơn vị máu">
            <DrField lbl="Mã đơn vị"><span style={{ fontFamily: 'var(--font-mono)' }}>{unitSel.bagCode}</span></DrField>
            <DrField lbl="Nhóm máu">{unitSel.bloodType}{unitSel.rhFactor}</DrField>
            <DrField lbl="Chế phẩm">{unitSel.productTypeName}</DrField>
            <DrField lbl="Thể tích"><span style={{ fontFamily: 'var(--font-mono)' }}>{unitSel.volume} mL</span></DrField>
            <DrField lbl="Vị trí">{unitSel.storageLocation || '—'}</DrField>
            <DrField lbl="Hạn sử dụng">{fmtDMY(unitSel.expiryDate)}{unitSel.daysUntilExpiry != null ? ` · còn ${unitSel.daysUntilExpiry}d` : ''}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={(STATUS_LABEL[unitSel.status] || { tone: 'info' as const }).tone} dot>
                {(STATUS_LABEL[unitSel.status] || { l: unitSel.status }).l}
              </StatusBadge>
            </DrField>
          </DrSec>
        )}
      </DrawerShell>

      <BloodIssueModal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onDone={() => { setIssueOpen(false); reload(); }}
      />

      <BloodReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        onDone={() => { setReceiveOpen(false); reload(); }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Blood issue-request modal — real createIssueRequest with
   department + product-type lookups.
   ────────────────────────────────────────────────────────── */

const BLOOD_GROUPS = ['A', 'B', 'AB', 'O'];
const RH_OPTS = [{ value: '+', label: 'Rh+' }, { value: '-', label: 'Rh−' }];
const URGENCY_OPTS = [
  { value: 'Routine', label: 'Thường quy' },
  { value: 'Urgent', label: 'Khẩn' },
  { value: 'Emergency', label: 'Cấp cứu' },
];

const BloodIssueModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [products, setProducts] = useState<BloodProductTypeDto[]>([]);
  const [deptId, setDeptId] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState('O');
  const [rh, setRh] = useState('+');
  const [productTypeId, setProductTypeId] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [urgency, setUrgency] = useState('Routine');
  const [indication, setIndication] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDeptId(undefined); setBloodType('O'); setRh('+'); setProductTypeId(undefined);
      setQty(1); setUrgency('Routine'); setIndication('');
      Promise.allSettled([
        catalogApi.getDepartments(undefined, undefined, true),
        getProductTypes(),
      ]).then(([d, p]) => {
        if (d.status === 'fulfilled') setDepts(d.value.data || []);
        if (p.status === 'fulfilled') setProducts((p.value.data || []) as BloodProductTypeDto[]);
      });
    }
  }, [open]);

  const submit = async () => {
    if (!deptId) { message.warning('Chọn khoa yêu cầu'); return; }
    if (!productTypeId) { message.warning('Chọn chế phẩm máu'); return; }
    if (!qty || qty <= 0) { message.warning('Nhập số lượng'); return; }
    setBusy(true);
    try {
      await createIssueRequest({
        departmentId: deptId,
        bloodType,
        rhFactor: rh,
        productTypeId,
        requestedQuantity: qty,
        urgency,
        clinicalIndication: indication.trim() || undefined,
      });
      message.success('Đã tạo phiếu yêu cầu xuất máu');
      onDone();
    } catch {
      message.error('Tạo phiếu xuất máu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Tạo phiếu yêu cầu xuất máu"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Tạo phiếu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BbFld label="Khoa yêu cầu *" full>
          <Select
            value={deptId} onChange={setDeptId} showSearch optionFilterProp="label"
            placeholder="Chọn khoa" style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </BbFld>
        <BbFld label="Nhóm máu">
          <Select value={bloodType} onChange={setBloodType} style={{ width: '100%' }}
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
        </BbFld>
        <BbFld label="Rh">
          <Select value={rh} onChange={setRh} options={RH_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chế phẩm *" full>
          <Select
            value={productTypeId} onChange={setProductTypeId} showSearch optionFilterProp="label"
            placeholder="Chọn chế phẩm máu" style={{ width: '100%' }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
          />
        </BbFld>
        <BbFld label="Số lượng">
          <InputNumber value={qty} onChange={(v) => setQty(Number(v) || 1)} min={1} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Mức độ">
          <Select value={urgency} onChange={setUrgency} options={URGENCY_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chỉ định lâm sàng" full>
          <Input.TextArea value={indication} onChange={(e) => setIndication(e.target.value)} rows={2} placeholder="Lý do truyền máu, chẩn đoán…" />
        </BbFld>
      </div>
    </ModalShell>
  );
};

const BbFld: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>}
    {children}
  </div>
);

const ExpiringTab: React.FC<{
  rows: BloodBagDto[];
  loading: boolean;
  message: MessageInstance;
  onReload: () => void;
}> = ({ rows, loading, message, onReload }) => {
  const [sel, setSel] = useState<BloodBagDto | null>(null);
  const [actionBag, setActionBag] = useState<{ bag: BloodBagDto; type: 'dispense' | 'discard' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
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
    <>
    <DataTable<BloodBagDto>
      columns={columns}
      data={rows}
      rowKey={(b) => b.id}
      onRowClick={setSel}
      actions={(b) => (
        <div className="ab-actions">
          <ActBtn ic="send" title="Cấp phát" onClick={() => { setDiscardReason(''); setActionBag({ bag: b, type: 'dispense' }); }} />
          <ActBtn ic="alert" title="Tiêu huỷ" tone="warn" onClick={() => { setDiscardReason(''); setActionBag({ bag: b, type: 'discard' }); }} />
        </div>
      )}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="check" size={20} />
          <div>Không có túi máu nào sắp hết hạn</div>
        </div>
      )}
    />
    <DrawerShell
      open={!!sel}
      onClose={() => setSel(null)}
      size="md"
      title={sel ? `Túi máu ${sel.bagCode}` : ''}
      sub={sel ? `${sel.bloodType}${sel.rhFactor} · ${sel.productTypeName}` : ''}
    >
      {sel && (
        <DrSec title="Túi máu sắp hết hạn">
          <DrField lbl="Mã túi"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.bagCode}</span></DrField>
          <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.barcode || '—'}</span></DrField>
          <DrField lbl="Nhóm máu">{sel.bloodType}{sel.rhFactor}</DrField>
          <DrField lbl="Chế phẩm">{sel.productTypeName}</DrField>
          <DrField lbl="Thể tích"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.volume} {sel.unit || 'mL'}</span></DrField>
          <DrField lbl="Người hiến">{sel.donorName || '—'}{sel.donorCode ? ` (${sel.donorCode})` : ''}</DrField>
          <DrField lbl="Vị trí">{sel.storageLocation || '—'}</DrField>
          <DrField lbl="Hạn sử dụng">{fmtDMY(sel.expiryDate)}</DrField>
          <DrField lbl="Trạng thái"><StatusBadge tone={sel.status === 'available' ? 'ok' : 'warn'} dot>{sel.status}</StatusBadge></DrField>
        </DrSec>
      )}
    </DrawerShell>

    {/* Confirm modal cho Cấp phát / Tiêu huỷ */}
    <ModalShell
      open={!!actionBag}
      onClose={() => setActionBag(null)}
      title={actionBag?.type === 'dispense' ? `Cấp phát túi máu ${actionBag.bag.bagCode}` : `Tiêu huỷ túi máu ${actionBag?.bag.bagCode}`}
      sub={actionBag ? `${actionBag.bag.bloodType}${actionBag.bag.rhFactor} · ${actionBag.bag.productTypeName} · ${actionBag.bag.volume} ${actionBag.bag.unit || 'mL'}` : ''}
      size="sm"
      footer={<>
        <Btn variant="ghost" onClick={() => setActionBag(null)}>Huỷ</Btn>
        <Btn
          variant={actionBag?.type === 'dispense' ? 'primary' : 'ghost'}
          style={actionBag?.type === 'discard' ? { background: 'var(--s-crit)', color: '#fff', borderColor: 'var(--s-crit)' } : undefined}
          loading={actionLoading}
          onClick={async () => {
            if (!actionBag) return;
            if (actionBag.type === 'discard' && !discardReason.trim()) {
              message.warning('Cần nhập lý do tiêu huỷ');
              return;
            }
            setActionLoading(true);
            try {
              if (actionBag.type === 'dispense') {
                await updateBloodBagStatus(actionBag.bag.id, 'Issued', 'Cấp phát từ kho sắp hết hạn');
                message.success(`Đã cấp phát túi máu ${actionBag.bag.bagCode}`);
              } else {
                await destroyExpiredBloodBags([actionBag.bag.id], discardReason.trim());
                message.success(`Đã tiêu huỷ túi máu ${actionBag.bag.bagCode}`);
              }
              setActionBag(null);
              onReload();
            } catch {
              message.error(actionBag.type === 'dispense' ? 'Cấp phát thất bại' : 'Tiêu huỷ thất bại');
            } finally {
              setActionLoading(false);
            }
          }}
        >
          {actionBag?.type === 'dispense' ? 'Xác nhận cấp phát' : 'Xác nhận tiêu huỷ'}
        </Btn>
      </>}
    >
      {actionBag?.type === 'discard' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Lý do tiêu huỷ *</div>
          <Input.TextArea
            rows={2}
            value={discardReason}
            onChange={(e) => setDiscardReason(e.target.value)}
            placeholder="Nhập lý do tiêu huỷ túi máu…"
          />
        </div>
      )}
      {actionBag?.type === 'dispense' && (
        <div style={{ color: 'var(--t-2)', fontSize: 13 }}>
          Xác nhận cấp phát túi máu <b>{actionBag.bag.bagCode}</b> ({actionBag.bag.bloodType}{actionBag.bag.rhFactor}) ra khỏi kho?
        </div>
      )}
    </ModalShell>
    </>
  );
};

// BE có thể trả thêm `statusName`/`reason`/`indication` không khai trong DTO — widen optional
type BloodIssueRequestRow = BloodIssueRequestDto & {
  statusName?: string; reason?: string; indication?: string;
};

const RequestsTab: React.FC<{ rows: BloodIssueRequestDto[]; loading: boolean }> = ({ rows, loading }) => {
  const [sel, setSel] = useState<BloodIssueRequestRow | null>(null);
  const cols: ColumnDef<BloodIssueRequestRow>[] = [
    { key: 'code', label: 'Mã YC', mono: true, width: 130, render: (r) => r.requestCode || r.id?.slice(0, 8) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || '—' },
    { key: 'dept', label: 'Khoa yêu cầu', render: (r) => r.departmentName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => r.clinicalIndication || r.indication || r.reason || '—' },
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
    <>
    <DataTable<BloodIssueRequestRow>
      columns={cols}
      data={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => setSel(r)}
      empty={loading ? 'Đang tải…' : (
        <div className="ab-empty">
          <TermIcon name="search" size={20} />
          <div>Chưa có yêu cầu xuất máu</div>
        </div>
      )}
    />
    <DrawerShell
      open={!!sel}
      onClose={() => setSel(null)}
      size="md"
      title={sel ? `Yêu cầu ${sel.requestCode || sel.id?.slice(0, 8)}` : ''}
      sub={sel ? (sel.patientName || '—') : ''}
    >
      {sel && (
        <DrSec title="Yêu cầu xuất máu">
          <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode || sel.id?.slice(0, 8)}</span></DrField>
          <DrField lbl="Bệnh nhân">{sel.patientName || '—'}</DrField>
          <DrField lbl="Khoa yêu cầu">{sel.departmentName || '—'}</DrField>
          <DrField lbl="Lý do / Chỉ định">{sel.clinicalIndication || sel.indication || sel.reason || '—'}</DrField>
          <DrField lbl="Mức độ">{sel.urgency || 'Thường'}</DrField>
          <DrField lbl="Trạng thái">
            <StatusBadge tone={sel.status === 'approved' || sel.status === 'issued' ? 'ok' : 'warn'} dot>{sel.statusName || sel.status || '—'}</StatusBadge>
          </DrField>
          <DrField lbl="Ngày YC">{fmtDMY(sel.requestDate || sel.createdAt)}</DrField>
        </DrSec>
      )}
    </DrawerShell>
    </>
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

/* ──────────────────────────────────────────────────────────
   Blood receive (nhập kho từ nhà cung cấp) modal — port từ v1
   (pages/BloodBank.tsx). Pattern raw useState theo BloodIssueModal.
   API: createImportReceipt + getSuppliers + getProductTypes (đã có).
   ────────────────────────────────────────────────────────── */

const BloodReceiveModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [suppliers, setSuppliers] = useState<BloodSupplierDto[]>([]);
  const [products, setProducts] = useState<BloodProductTypeDto[]>([]);
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [bloodType, setBloodType] = useState('O');
  const [rh, setRh] = useState('+');
  const [productTypeId, setProductTypeId] = useState<string | undefined>(undefined);
  const [volume, setVolume] = useState<number>(350);
  const [receiveDate, setReceiveDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [expiryDate, setExpiryDate] = useState<dayjs.Dayjs | null>(dayjs().add(42, 'day'));
  const [bagCode, setBagCode] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset state + load lookup khi mở (pattern BloodIssueModal)
  useEffect(() => {
    if (open) {
      setSupplierId(undefined); setBloodType('O'); setRh('+'); setProductTypeId(undefined);
      setVolume(350); setReceiveDate(dayjs()); setExpiryDate(dayjs().add(42, 'day'));
      setBagCode(`BU${dayjs().format('YYMMDD')}${String(Date.now()).slice(-4)}`);
      setDeliveryPerson(''); setNote('');
      Promise.allSettled([
        getSuppliers(),
        getProductTypes(),
      ]).then(([s, p]) => {
        if (s.status === 'fulfilled') setSuppliers((s.value.data || []) as BloodSupplierDto[]);
        if (p.status === 'fulfilled') setProducts((p.value.data || []) as BloodProductTypeDto[]);
      });
    }
  }, [open]);

  const submit = async () => {
    if (!supplierId) { message.warning('Chọn nhà cung cấp'); return; }
    if (!productTypeId) { message.warning('Chọn chế phẩm máu'); return; }
    if (!bagCode.trim()) { message.warning('Nhập mã túi máu'); return; }
    if (!volume || volume <= 0) { message.warning('Nhập thể tích'); return; }
    if (!receiveDate) { message.warning('Chọn ngày nhập'); return; }
    if (!expiryDate) { message.warning('Chọn hạn sử dụng'); return; }
    setBusy(true);
    try {
      await createImportReceipt({
        receiptDate: receiveDate.format('YYYY-MM-DD'),
        supplierId,
        deliveryPerson: deliveryPerson.trim() || undefined,
        note: note.trim() || undefined,
        items: [{
          bagCode: bagCode.trim(),
          barcode: bagCode.trim(),
          bloodType,
          rhFactor: rh,
          productTypeId,
          volume,
          collectionDate: receiveDate.format('YYYY-MM-DD'),
          expiryDate: expiryDate.format('YYYY-MM-DD'),
          price: 0,
        }],
      });
      message.success(`Đã nhập đơn vị máu ${bagCode}`);
      onDone();
    } catch {
      message.error('Nhập máu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Nhận máu vào kho"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BbFld label="Nhà cung cấp *" full>
          <Select
            value={supplierId} onChange={setSupplierId} showSearch optionFilterProp="label"
            placeholder="Chọn nhà cung cấp" style={{ width: '100%' }}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </BbFld>
        <BbFld label="Mã túi máu *">
          <Input value={bagCode} onChange={(e) => setBagCode(e.target.value)} placeholder="BU241231xxxx" />
        </BbFld>
        <BbFld label="Người giao">
          <Input value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} placeholder="Tên người giao" />
        </BbFld>
        <BbFld label="Nhóm máu">
          <Select value={bloodType} onChange={setBloodType} style={{ width: '100%' }}
            options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))} />
        </BbFld>
        <BbFld label="Rh">
          <Select value={rh} onChange={setRh} options={RH_OPTS} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Chế phẩm *" full>
          <Select
            value={productTypeId} onChange={setProductTypeId} showSearch optionFilterProp="label"
            placeholder="Chọn chế phẩm máu" style={{ width: '100%' }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
          />
        </BbFld>
        <BbFld label="Thể tích (mL)">
          <InputNumber value={volume} onChange={(v) => setVolume(Number(v) || 0)} min={1} step={50} style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Ngày nhập / lấy máu *">
          <DatePicker value={receiveDate} onChange={setReceiveDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Hạn sử dụng *" full>
          <DatePicker value={expiryDate} onChange={setExpiryDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </BbFld>
        <BbFld label="Ghi chú" full>
          <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ghi chú nhập máu…" />
        </BbFld>
      </div>
    </ModalShell>
  );
};

export default BloodBankV2;
