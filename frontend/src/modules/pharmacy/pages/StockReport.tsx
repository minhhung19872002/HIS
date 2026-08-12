import React, { useCallback, useEffect, useState } from 'react';
import * as file from '../../../services/file.service';
import { fmtNum as fmt } from '../../../utils/format';
import { Input, InputNumber } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../../../services/apiClient';
import {
  getWarehouses, lockBatch, unlockBatch, lockWarehouse, unlockWarehouse,
  getWarehouseLockStatus, type WarehouseLockStatusDto,
} from '../api/warehouse';
import { unwrapList, type MaybePaged } from '../../../utils/apiNormalize';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, StatusBadge, Btn, Pager, ModalShell, tk, ti, tw,
  type ColumnDef,
} from '@/_v2kit';

interface Warehouse { id: string; warehouseName: string }
interface DetailRow { id: string; warehouseName: string; itemCode: string; itemName: string; unit?: string; batchNumber?: string; expiryDate?: string; daysToExpiry?: number; quantity: number; reservedQuantity?: number; available: number; importPrice?: number; value?: number; isLocked?: boolean }
interface SummaryRow { itemCode: string; itemName: string; unit?: string; batchCount: number; totalQuantity: number; reservedQuantity: number; available: number; nearestExpiry?: string; totalValue?: number }
interface ExpiringRow extends DetailRow { severity?: string }
interface LowStockRow { itemCode: string; itemName: string; unit?: string; available: number; totalQuantity: number; threshold: number }

interface ReportResp<T> { items?: T[]; count?: number; totalValue?: number }

const PER = 50;
type Tab = 'detail' | 'summary' | 'expiring' | 'low-stock' | 'locks';
const TABS = [
  { v: 'detail' as Tab,    l: 'Chi tiết theo lô', ic: 'archive' },
  { v: 'summary' as Tab,   l: 'Tổng hợp',         ic: 'list' },
  { v: 'expiring' as Tab,  l: 'Sắp hết hạn',      ic: 'alert' },
  { v: 'low-stock' as Tab, l: 'Tồn thấp',         ic: 'activity' },
  // NangCap26 V.33 — khóa/mở khóa kho (chặn xuất & luân chuyển khi kiểm kê/chốt sổ)
  { v: 'locks' as Tab,     l: 'Khóa kho',         ic: 'lock' },
];

/** Đích của modal khóa: 1 lô trong kho, hoặc cả kho. */
type LockTarget =
  | { kind: 'batch'; id: string; name: string; locked: boolean }
  | { kind: 'warehouse'; id: string; name: string; locked: boolean };


const StockReportV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('detail');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [days, setDays] = useState(90);
  const [threshold, setThreshold] = useState(10);
  const [detail, setDetail] = useState<ReportResp<DetailRow>>({});
  const [summary, setSummary] = useState<ReportResp<SummaryRow>>({});
  const [expiring, setExpiring] = useState<ReportResp<ExpiringRow>>({});
  const [lowStock, setLowStock] = useState<ReportResp<LowStockRow>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  // NangCap26 V.31/V.33 — khóa lô thuốc & khóa kho
  const [locks, setLocks] = useState<WarehouseLockStatusDto[]>([]);
  const [lockTarget, setLockTarget] = useState<LockTarget | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [lockBusy, setLockBusy] = useState(false);

  useEffect(() => {
    getWarehouses(1)
      .then((r) => {
        const body = (r as { data?: MaybePaged<Warehouse> }).data;
        setWarehouses(unwrapList<Warehouse>(body));
      })
      .catch((e) => { tw(friendlyErrorMessage(e, 'Không tải được danh sách kho')); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'detail') {
        const { data } = await apiClient.get<ReportResp<DetailRow>>('/stock-report/detail', { params: { warehouseId: warehouseId || undefined, keyword: keyword || undefined } });
        setDetail(data);
      } else if (tab === 'summary') {
        const { data } = await apiClient.get<ReportResp<SummaryRow>>('/stock-report/summary', { params: { warehouseId: warehouseId || undefined, keyword: keyword || undefined } });
        setSummary(data);
      } else if (tab === 'expiring') {
        const { data } = await apiClient.get<ReportResp<ExpiringRow>>('/stock-report/expiring', { params: { warehouseId: warehouseId || undefined, days } });
        setExpiring(data);
      } else if (tab === 'locks') {
        const { data } = await getWarehouseLockStatus(false);
        setLocks(unwrapList<WarehouseLockStatusDto>(data as MaybePaged<WarehouseLockStatusDto>));
      } else {
        const { data } = await apiClient.get<ReportResp<LowStockRow>>('/stock-report/low-stock', { params: { warehouseId: warehouseId || undefined, threshold } });
        setLowStock(data);
      }
    } catch { ti('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [tab, warehouseId, keyword, days, threshold]);

  useEffect(() => { setPage(0); load(); }, [load]);

  const exportCsv = () => {
    // 4 row type khác nhau theo tab → dùng Record<string, unknown> để view chung cho CSV serialization
    type CsvRow = Record<string, unknown>;
    const rows: CsvRow[] = tab === 'detail' ? (detail.items || []) as unknown as CsvRow[]
      : tab === 'summary' ? (summary.items || []) as unknown as CsvRow[]
      : tab === 'expiring' ? (expiring.items || []) as unknown as CsvRow[]
      : (lowStock.items || []) as unknown as CsvRow[];
    if (rows.length === 0) { tw('Không có dữ liệu'); return; }
    const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' || rows[0][k] instanceof Date);
    const csv = [keys.join(',')].concat(rows.map((r) => keys.map((k) => {
      const v = r[k]; if (v == null) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    file.downloadBlob(blob, `stock-${tab}-${dayjs().format('YYYYMMDD-HHmm')}.csv`);
    tk('Đã xuất CSV');
  };

  const whOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

  // NangCap26 — mở modal nhập lý do trước khi khóa/mở khóa
  const openLockModal = (t: LockTarget) => { setLockTarget(t); setLockReason(''); };

  const submitLock = async () => {
    if (!lockTarget) return;
    // Khóa bắt buộc có lý do (để lại vết cho hội đồng/lãnh đạo); mở khóa thì lý do tùy chọn.
    if (!lockTarget.locked && !lockReason.trim()) { tw('Phải nhập lý do khóa'); return; }
    setLockBusy(true);
    try {
      if (lockTarget.kind === 'batch') {
        if (lockTarget.locked) await unlockBatch(lockTarget.id, lockReason.trim());
        else await lockBatch(lockTarget.id, lockReason.trim());
      } else {
        if (lockTarget.locked) await unlockWarehouse(lockTarget.id);
        else await lockWarehouse(lockTarget.id, lockReason.trim());
      }
      tk(lockTarget.locked ? 'Đã mở khóa' : 'Đã khóa');
      setLockTarget(null);
      await load();
    } catch (e) {
      ti(friendlyErrorMessage(e, 'Thao tác khóa thất bại'));
    } finally { setLockBusy(false); }
  };

  const detailCols: ColumnDef<DetailRow>[] = [
    { key: 'wh', label: 'Kho', render: (r) => r.warehouseName },
    { key: 'code', label: 'Mã', code: true, render: (r) => r.itemCode },
    { key: 'name', label: 'Tên', render: (r) => r.itemName },
    { key: 'unit', label: 'ĐV', render: (r) => r.unit || '—' },
    { key: 'batch', label: 'Lô', code: true, render: (r) => r.batchNumber || '—' },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '—' },
    { key: 'days', label: 'Còn', mono: true, render: (r) => r.daysToExpiry == null ? '—'
      : r.daysToExpiry < 0 ? <StatusBadge tone="crit" dot>Hết hạn</StatusBadge>
      : r.daysToExpiry <= 30 ? <StatusBadge tone="crit">{r.daysToExpiry}d</StatusBadge>
      : r.daysToExpiry <= 90 ? <StatusBadge tone="warn">{r.daysToExpiry}d</StatusBadge>
      : `${r.daysToExpiry}d` },
    { key: 'qty', label: 'SL', mono: true, render: (r) => fmt(r.quantity) },
    { key: 'reserved', label: 'Đã đặt', mono: true, render: (r) => fmt(r.reservedQuantity) },
    { key: 'avail', label: 'Khả dụng', mono: true, render: (r) => fmt(r.available) },
    { key: 'price', label: 'Giá nhập', mono: true, render: (r) => fmt(r.importPrice) },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => fmt(r.value) },
    // NangCap26 V.31 — khóa/mở khóa lô ngay tại dòng tồn kho
    { key: 'lock', label: 'Khóa lô', render: (r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-6)' }}>
        {r.isLocked ? <StatusBadge tone="crit" dot>Khóa</StatusBadge> : '—'}
        <Btn variant="ghost" icon={r.isLocked ? 'unlock' : 'lock'}
          onClick={(e?: React.MouseEvent) => { e?.stopPropagation();
            openLockModal({ kind: 'batch', id: r.id, name: `${r.itemName} — lô ${r.batchNumber || '(không số)'}`, locked: !!r.isLocked }); }}>
          {r.isLocked ? 'Mở' : 'Khóa'}
        </Btn>
      </span>
    ) },
  ];

  const lockCols: ColumnDef<WarehouseLockStatusDto>[] = [
    { key: 'code', label: 'Mã kho', code: true, render: (r) => r.warehouseCode },
    { key: 'name', label: 'Tên kho', render: (r) => r.warehouseName },
    { key: 'st', label: 'Trạng thái', render: (r) => r.isLocked
      ? <StatusBadge tone="crit" dot>Đang khóa</StatusBadge>
      : <StatusBadge tone="ok">Hoạt động</StatusBadge> },
    { key: 'reason', label: 'Lý do', render: (r) => r.lockReason || '—' },
    { key: 'by', label: 'Người khóa', render: (r) => r.lockedByName || '—' },
    { key: 'at', label: 'Thời điểm', mono: true, render: (r) => r.lockedAt ? dayjs(r.lockedAt).format('DD/MM/YYYY HH:mm') : '—' },
    { key: 'act', label: '', render: (r) => (
      <Btn variant={r.isLocked ? 'ghost' : 'crit'} icon={r.isLocked ? 'unlock' : 'lock'}
        onClick={(e?: React.MouseEvent) => { e?.stopPropagation();
          openLockModal({ kind: 'warehouse', id: r.warehouseId, name: r.warehouseName, locked: r.isLocked }); }}>
        {r.isLocked ? 'Mở khóa' : 'Khóa kho'}
      </Btn>
    ) },
  ];

  const summaryCols: ColumnDef<SummaryRow>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.itemCode },
    { key: 'name', label: 'Tên', render: (r) => r.itemName },
    { key: 'unit', label: 'ĐV', render: (r) => r.unit || '—' },
    { key: 'batches', label: 'Số lô', mono: true, render: (r) => r.batchCount },
    { key: 'qty', label: 'Tổng SL', mono: true, render: (r) => fmt(r.totalQuantity) },
    { key: 'reserved', label: 'Đã đặt', mono: true, render: (r) => fmt(r.reservedQuantity) },
    { key: 'avail', label: 'Khả dụng', mono: true, render: (r) => fmt(r.available) },
    { key: 'exp', label: 'HSD gần', mono: true, render: (r) => r.nearestExpiry ? dayjs(r.nearestExpiry).format('DD/MM/YYYY') : '—' },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => fmt(r.totalValue) },
  ];

  const expiringCols: ColumnDef<ExpiringRow>[] = [
    { key: 'wh', label: 'Kho', render: (r) => r.warehouseName },
    { key: 'code', label: 'Mã', code: true, render: (r) => r.itemCode },
    { key: 'name', label: 'Tên', render: (r) => r.itemName },
    { key: 'batch', label: 'Lô', code: true, render: (r) => r.batchNumber || '—' },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '—' },
    { key: 'days', label: 'Còn', render: (r) => {
      const d = r.daysToExpiry || 0;
      const tone = r.severity === 'expired' || d < 0 ? 'crit' : r.severity === 'critical' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{d < 0 ? `Quá ${Math.abs(d)}d` : `${d}d`}</StatusBadge>;
    } },
    { key: 'qty', label: 'SL', mono: true, render: (r) => fmt(r.quantity) },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => fmt(r.value) },
  ];

  const lowStockCols: ColumnDef<LowStockRow>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.itemCode },
    { key: 'name', label: 'Tên', render: (r) => r.itemName },
    { key: 'unit', label: 'ĐV', render: (r) => r.unit || '—' },
    { key: 'avail', label: 'Khả dụng', mono: true, render: (r) => <span style={{ color: 'var(--a-or-text)', fontWeight: 600 }}>{fmt(r.available)}</span> },
    { key: 'tot', label: 'Tổng', mono: true, render: (r) => fmt(r.totalQuantity) },
    { key: 'thr', label: 'Ngưỡng', mono: true, render: (r) => r.threshold },
  ];

  const currentRows = tab === 'detail' ? (detail.items || [])
    : tab === 'summary' ? (summary.items || [])
    : tab === 'expiring' ? (expiring.items || [])
    : tab === 'locks' ? locks
    : (lowStock.items || []);
  const currentCount = tab === 'detail' ? detail.count
    : tab === 'summary' ? summary.count
    : tab === 'expiring' ? expiring.count
    : tab === 'locks' ? locks.length
    : lowStock.count;
  // Tab "Khóa kho" liệt kê trạng thái kho, không có giá trị tồn → để trống thay vì mượn số của tab khác.
  const currentValue = tab === 'detail' ? detail.totalValue
    : tab === 'summary' ? summary.totalValue
    : tab === 'expiring' ? expiring.totalValue
    : undefined;

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Số dòng', val: fmt(currentCount), sub: TABS.find((t) => t.v === tab)?.l },
        { lbl: 'Tổng giá trị', val: Math.round((currentValue || 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Sắp hết hạn', val: expiring.count || 0, sub: `${days} ngày`, tone: 'warn' },
        { lbl: 'Tồn thấp', val: lowStock.count || 0, sub: `≤ ${threshold}`, tone: 'crit' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <Btn variant="ghost" icon="refresh" onClick={load} loading={loading}>Làm mới</Btn>
          <Btn variant="primary" icon="download" onClick={exportCsv}>Xuất CSV</Btn>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <Filter value={warehouseId} onChange={setWarehouseId} options={whOpts} placeholder="▾ Tất cả kho" />
        {(tab === 'detail' || tab === 'summary') && (
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Tên thuốc / mã / số lô…" />
        )}
        {tab === 'expiring' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>
            Hết hạn trong <InputNumber min={1} max={365} value={days} onChange={(v) => setDays(Number(v) || 90)} size="small" /> ngày
          </span>
        )}
        {tab === 'low-stock' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>
            Ngưỡng tồn <InputNumber min={1} value={threshold} onChange={(v) => setThreshold(Number(v) || 10)} size="small" />
          </span>
        )}
        <Btn variant="ghost" icon="x" onClick={() => { setKeyword(''); setWarehouseId(''); }}>Bỏ lọc</Btn>
      </div>

      {tab === 'detail' && (
        <DataTable<DetailRow> columns={detailCols} data={(detail.items || []).slice(page * PER, (page + 1) * PER)} rowKey={(r) => r.id}
          loading={loading} empty="Không có dữ liệu" />
      )}
      {tab === 'summary' && (
        <DataTable<SummaryRow> columns={summaryCols} data={(summary.items || []).slice(page * PER, (page + 1) * PER)} rowKey={(r) => r.itemCode}
          loading={loading} empty="Không có dữ liệu" />
      )}
      {tab === 'expiring' && (
        <DataTable<ExpiringRow> columns={expiringCols} data={(expiring.items || []).slice(page * PER, (page + 1) * PER)} rowKey={(r) => r.id}
          loading={loading} empty="Không có thuốc sắp hết hạn" />
      )}
      {tab === 'low-stock' && (
        <DataTable<LowStockRow> columns={lowStockCols} data={(lowStock.items || []).slice(page * PER, (page + 1) * PER)} rowKey={(r) => r.itemCode}
          loading={loading} empty="Không có thuốc tồn thấp" />
      )}
      {tab === 'locks' && (
        <DataTable<WarehouseLockStatusDto> columns={lockCols} data={locks.slice(page * PER, (page + 1) * PER)} rowKey={(r) => r.warehouseId}
          empty={loading ? 'Đang tải…' : 'Không có kho'} />
      )}

      <Pager page={page} setPage={setPage} totalPages={Math.max(1, Math.ceil(currentRows.length / PER))}
        total={currentRows.length} perPage={PER} />

      {/* NangCap26 V.31/V.33 — modal nhập lý do khóa/mở khóa */}
      <ModalShell
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        size="sm"
        tone={lockTarget && !lockTarget.locked ? 'danger' : undefined}
        title={lockTarget?.locked
          ? (lockTarget.kind === 'batch' ? 'Mở khóa lô' : 'Mở khóa kho')
          : (lockTarget?.kind === 'batch' ? 'Khóa lô thuốc' : 'Khóa kho')}
        sub={lockTarget?.name}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setLockTarget(null)}>Hủy</Btn>
            <Btn variant={lockTarget?.locked ? 'primary' : 'crit'} disabled={lockBusy} onClick={submitLock}>
              {lockBusy ? 'Đang xử lý…' : lockTarget?.locked ? 'Mở khóa' : 'Khóa'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
          {!lockTarget?.locked && (
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--a-or-text)' }}>
              {lockTarget?.kind === 'batch'
                ? 'Sau khi khóa, khoa/phòng KHÔNG lĩnh được lô này cho bệnh nhân. Số lượng tồn giữ nguyên.'
                : 'Sau khi khóa, kho này KHÔNG xuất và KHÔNG luân chuyển được.'}
            </div>
          )}
          <label style={{ display: 'grid', gap: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
            Lý do {lockTarget?.locked ? '(tùy chọn)' : <span style={{ color: 'var(--a-cr-text)' }}>*</span>}
            <Input.TextArea rows={3} value={lockReason} onChange={(e) => setLockReason(e.target.value)}
              placeholder={lockTarget?.locked ? 'Căn cứ quyết định mở khóa…' : 'VD: Thu hồi theo công văn số… / nghi ngờ chất lượng'} />
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

export default StockReportV2;
