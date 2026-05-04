import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { getStock } from '../api/warehouse';
import type { StockDto } from '../api/warehouse';
import {
  SimpleV2Page, StatusBadge, DrSec, DrField,
  type ColumnDef, type StatusTab, type KpiItem,
} from './_v2kit';

type SKey = 'in-stock' | 'low' | 'expiring' | 'out';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'in-stock', l: 'Còn tồn',     tone: 'ok' },
  { v: 'low',      l: 'Tồn thấp',    tone: 'warn' },
  { v: 'expiring', l: 'Sắp hết hạn', tone: 'warn' },
  { v: 'out',      l: 'Hết',         tone: 'crit' },
];

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString('vi-VN');

const MedicalSupplyV2: React.FC = () => {
  const today = dayjs();

  const load = useCallback(async () => {
    const r = await getStock({ itemType: 2, page: 1, pageSize: 200 } as Parameters<typeof getStock>[0]);
    return ((r.data?.items as StockDto[]) || (Array.isArray(r.data) ? (r.data as StockDto[]) : [])) as StockDto[];
  }, []);

  const statusKey = (s: StockDto): SKey => {
    if (s.quantity <= 0) return 'out';
    if (s.expiryDate && dayjs(s.expiryDate).diff(today, 'day') < 90) return 'expiring';
    if (s.quantity < 10) return 'low';
    return 'in-stock';
  };

  const columns: ColumnDef<StockDto>[] = [
    { key: 'itemCode', label: 'Mã', mono: true, code: true,
      render: (r) => r.itemCode },
    { key: 'itemName', label: 'Tên vật tư', render: (r) => r.itemName },
    { key: 'unit',     label: 'ĐVT',        render: (r) => r.unit },
    { key: 'batchNumber', label: 'Lô', mono: true,
      render: (r) => r.batchNumber || '—' },
    { key: 'expiryDate', label: 'HSD', mono: true,
      render: (r) => {
        if (!r.expiryDate) return '—';
        const d = dayjs(r.expiryDate);
        const diff = d.diff(today, 'day');
        const color = diff < 0 ? 'var(--s-crit)' : diff < 90 ? 'var(--s-warn)' : undefined;
        return <span style={{ color }}>{d.format('DD/MM/YYYY')}</span>;
      } },
    { key: 'quantity', label: 'Tồn', mono: true, render: (r) => fmt(r.quantity) },
    { key: 'unitPrice', label: 'Giá', mono: true,
      render: (r) => r.unitPrice ? `${fmt(r.unitPrice)}đ` : '—' },
    { key: 'value', label: 'Thành tiền', mono: true,
      render: (r) => `${fmt(r.quantity * (r.unitPrice || 0))}đ` },
    { key: 'status', label: 'Trạng thái',
      render: (r) => {
        const k = statusKey(r);
        const m = STATUS_TABS.find((s) => s.v === k)!;
        return <StatusBadge tone={m.tone as 'ok' | 'warn' | 'crit'}>{m.l}</StatusBadge>;
      } },
  ];

  const kpis = (rows: StockDto[]): KpiItem[] => [
    { lbl: 'Tổng SKU',     val: rows.length },
    { lbl: 'Còn tồn',      val: rows.filter((s) => s.quantity > 0).length, tone: 'ok' },
    { lbl: 'Sắp hết hạn',  val: rows.filter((s) => s.expiryDate && dayjs(s.expiryDate).diff(today, 'day') < 90).length, tone: 'warn' },
    { lbl: 'Tổng giá trị', val: Math.round(rows.reduce((sum, s) => sum + (s.quantity * (s.unitPrice || 0)), 0) / 1_000_000), unit: 'M₫', tone: 'info' },
  ];

  return (
    <SimpleV2Page<StockDto>
      title="Vật tư y tế"
      load={load}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm theo mã / tên / lô…"
      searchOf={(r) => `${r.itemCode} ${r.itemName} ${r.batchNumber || ''}`}
      statusTabs={STATUS_TABS}
      statusOf={statusKey}
      kpis={kpis}
      pageSize={20}
      emptyMessage="Chưa có vật tư"
      drawerTitle={(r) => r.itemName}
      drawerSub={(r) => `${r.itemCode} · ${r.unit}`}
      drawer={(r) => (
        <>
          <DrSec title="Định danh">
            <DrField lbl="Mã">{r.itemCode}</DrField>
            <DrField lbl="Tên">{r.itemName}</DrField>
            <DrField lbl="ĐVT">{r.unit}</DrField>
          </DrSec>
          <DrSec title="Lô / Hạn dùng">
            <DrField lbl="Lô">{r.batchNumber || '—'}</DrField>
            <DrField lbl="HSD">
              {r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : '—'}
            </DrField>
          </DrSec>
          <DrSec title="Tồn kho">
            <DrField lbl="Tồn">{fmt(r.quantity)} {r.unit}</DrField>
            <DrField lbl="Đã giữ chỗ">{fmt(r.reservedQuantity)}</DrField>
            <DrField lbl="Đơn giá">{r.unitPrice ? `${fmt(r.unitPrice)}đ` : '—'}</DrField>
            <DrField lbl="Thành tiền">{fmt(r.quantity * (r.unitPrice || 0))}đ</DrField>
          </DrSec>
        </>
      )}
    />
  );
};

export default MedicalSupplyV2;
