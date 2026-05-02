import React, { useCallback, useEffect, useState } from 'react';
import { InputNumber } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import { getWarehouses } from '../api/warehouse';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, StatusBadge, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';

interface Warehouse { id: string; warehouseName: string }
interface DetailRow { id: string; warehouseName: string; itemCode: string; itemName: string; unit?: string; batchNumber?: string; expiryDate?: string; daysToExpiry?: number; quantity: number; reservedQuantity?: number; available: number; importPrice?: number; value?: number; isLocked?: boolean }
interface SummaryRow { itemCode: string; itemName: string; unit?: string; batchCount: number; totalQuantity: number; reservedQuantity: number; available: number; nearestExpiry?: string; totalValue?: number }
interface ExpiringRow extends DetailRow { severity?: string }
interface LowStockRow { itemCode: string; itemName: string; unit?: string; available: number; totalQuantity: number; threshold: number }

interface ReportResp<T> { items?: T[]; count?: number; totalValue?: number }

type Tab = 'detail' | 'summary' | 'expiring' | 'low-stock';
const TABS = [
  { v: 'detail' as Tab,    l: 'Chi tiết theo lô', ic: 'archive' },
  { v: 'summary' as Tab,   l: 'Tổng hợp',         ic: 'list' },
  { v: 'expiring' as Tab,  l: 'Sắp hết hạn',      ic: 'alert' },
  { v: 'low-stock' as Tab, l: 'Tồn thấp',         ic: 'activity' },
];

const fmt = (n?: number) => (n || 0).toLocaleString('vi-VN');

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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getWarehouses(1).then((r) => setWarehouses(((r as any)?.data?.items || (r as any)?.data || []) as Warehouse[])).catch(() => {});
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
      } else {
        const { data } = await apiClient.get<ReportResp<LowStockRow>>('/stock-report/low-stock', { params: { warehouseId: warehouseId || undefined, threshold } });
        setLowStock(data);
      }
    } catch { ti('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [tab, warehouseId, keyword, days, threshold]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = tab === 'detail' ? (detail.items || [])
      : tab === 'summary' ? (summary.items || [])
      : tab === 'expiring' ? (expiring.items || [])
      : (lowStock.items || []);
    if (rows.length === 0) { tw('Không có dữ liệu'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = Object.keys(rows[0]).filter((k) => typeof (rows[0] as any)[k] !== 'object' || (rows[0] as any)[k] instanceof Date);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv = [keys.join(',')].concat(rows.map((r: any) => keys.map((k) => {
      const v = r[k]; if (v == null) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock-${tab}-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
    a.click();
    tk('Đã xuất CSV');
  };

  const whOpts = warehouses.map((w) => ({ v: w.id, l: w.warehouseName }));

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
    { key: 'avail', label: 'Khả dụng', mono: true, render: (r) => fmt(r.available) },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => fmt(r.value) },
    { key: 'lock', label: 'Khóa', render: (r) => r.isLocked ? <StatusBadge tone="crit" dot>Khóa</StatusBadge> : '—' },
  ];

  const summaryCols: ColumnDef<SummaryRow>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.itemCode },
    { key: 'name', label: 'Tên', render: (r) => r.itemName },
    { key: 'unit', label: 'ĐV', render: (r) => r.unit || '—' },
    { key: 'batches', label: 'Số lô', mono: true, render: (r) => r.batchCount },
    { key: 'qty', label: 'Tổng SL', mono: true, render: (r) => fmt(r.totalQuantity) },
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
    : (lowStock.items || []);
  const currentCount = tab === 'detail' ? detail.count
    : tab === 'summary' ? summary.count
    : tab === 'expiring' ? expiring.count
    : lowStock.count;
  const currentValue = tab === 'detail' ? detail.totalValue
    : tab === 'summary' ? summary.totalValue
    : expiring.totalValue;

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
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={exportCsv}>
            <Ico name="download" size={12} /> Xuất CSV
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <Filter value={warehouseId} onChange={setWarehouseId} options={whOpts} placeholder="▾ Tất cả kho" />
        {(tab === 'detail' || tab === 'summary') && (
          <SearchBox value={keyword} onChange={setKeyword} placeholder="Tên thuốc / mã / số lô…" />
        )}
        {tab === 'expiring' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            Hết hạn trong <InputNumber min={1} max={365} value={days} onChange={(v) => setDays(Number(v) || 90)} size="small" /> ngày
          </span>
        )}
        {tab === 'low-stock' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            Ngưỡng tồn <InputNumber min={1} value={threshold} onChange={(v) => setThreshold(Number(v) || 10)} size="small" />
          </span>
        )}
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); setWarehouseId(''); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
      </div>

      {tab === 'detail' && (
        <DataTable<DetailRow> columns={detailCols} data={detail.items || []} rowKey={(r) => r.id}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
      )}
      {tab === 'summary' && (
        <DataTable<SummaryRow> columns={summaryCols} data={summary.items || []} rowKey={(r) => r.itemCode}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />
      )}
      {tab === 'expiring' && (
        <DataTable<ExpiringRow> columns={expiringCols} data={expiring.items || []} rowKey={(r) => r.id}
          empty={loading ? 'Đang tải…' : 'Không có thuốc sắp hết hạn'} />
      )}
      {tab === 'low-stock' && (
        <DataTable<LowStockRow> columns={lowStockCols} data={lowStock.items || []} rowKey={(r) => r.itemCode}
          empty={loading ? 'Đang tải…' : 'Không có thuốc tồn thấp'} />
      )}

      <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--t-2)', borderTop: '1px solid var(--line)' }}>
        Hiển thị {currentRows.length.toLocaleString('vi-VN')} dòng
      </div>
    </div>
  );
};

export default StockReportV2;
