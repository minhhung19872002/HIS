import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { getProcurementRequests } from '../api/warehouse';
import type { ProcurementRequestDto } from '../api/warehouse';
import {
  SimpleV2Page, StatusBadge, DrSec, DrField,
  type ColumnDef, type StatusTab, type KpiItem,
} from './_v2kit';

type SKey = 'new' | 'approved' | 'purchased' | 'cancelled';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'new',       l: 'Mới',       tone: 'warn' },
  { v: 'approved',  l: 'Đã duyệt',  tone: 'info' },
  { v: 'purchased', l: 'Đã mua',    tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',       tone: 'crit' },
];
const statusKey = (r: ProcurementRequestDto): SKey =>
  r.status === 1 ? 'approved' : r.status === 2 ? 'purchased' : r.status === 3 ? 'cancelled' : 'new';

const ProcurementV2: React.FC = () => {
  const load = useCallback(async () => {
    const r = await getProcurementRequests(undefined, undefined,
      dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'));
    return Array.isArray(r.data) ? (r.data as ProcurementRequestDto[]) : [];
  }, []);

  const columns: ColumnDef<ProcurementRequestDto>[] = [
    { key: 'requestCode',   label: 'Mã',          mono: true, code: true,
      render: (r) => r.requestCode },
    { key: 'warehouseName', label: 'Kho',         render: (r) => r.warehouseName },
    { key: 'description',   label: 'Mô tả',
      render: (r) => (
        <span style={{ display: 'inline-block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.description || '—'}
        </span>
      ) },
    { key: 'items',         label: 'Số mục',      mono: true,
      render: (r) => r.items?.length || 0 },
    { key: 'createdByName', label: 'Người tạo',   render: (r) => r.createdByName },
    { key: 'requestDate',   label: 'Ngày YC',     mono: true,
      render: (r) => dayjs(r.requestDate).format('DD/MM/YYYY') },
    { key: 'status',        label: 'Trạng thái',
      render: (r) => {
        const k = statusKey(r);
        const m = STATUS_TABS.find((s) => s.v === k)!;
        return <StatusBadge tone={m.tone as 'ok' | 'warn' | 'crit' | 'info'}>{m.l}</StatusBadge>;
      } },
  ];

  const kpis = (rows: ProcurementRequestDto[]): KpiItem[] => [
    { lbl: 'Tổng dự trù', val: rows.length },
    { lbl: 'Chờ duyệt',   val: rows.filter((r) => r.status === 0).length, tone: 'warn' },
    { lbl: 'Đã duyệt',    val: rows.filter((r) => r.status === 1).length, tone: 'info' },
    { lbl: 'Đã mua',      val: rows.filter((r) => r.status === 2).length, tone: 'ok' },
  ];

  return (
    <SimpleV2Page<ProcurementRequestDto>
      title="Dự trù mua sắm"
      load={load}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm theo mã / kho / mô tả…"
      searchOf={(r) => `${r.requestCode} ${r.warehouseName} ${r.description || ''}`}
      statusTabs={STATUS_TABS}
      statusOf={statusKey}
      kpis={kpis}
      pageSize={20}
      emptyMessage="Chưa có dự trù"
      drawerTitle={(r) => r.requestCode}
      drawerSub={(r) => `${r.warehouseName} · ${dayjs(r.requestDate).format('DD/MM/YYYY')}`}
      drawer={(r) => (
        <>
          <DrSec title="Thông tin">
            <DrField lbl="Mã">{r.requestCode}</DrField>
            <DrField lbl="Kho">{r.warehouseName}</DrField>
            <DrField lbl="Mô tả">{r.description || '—'}</DrField>
            <DrField lbl="Người tạo">{r.createdByName}</DrField>
            <DrField lbl="Ngày YC">{dayjs(r.requestDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Trạng thái">{r.statusName}</DrField>
          </DrSec>
          <DrSec title={`Danh sách mặt hàng (${r.items?.length || 0})`}>
            <div style={{ fontSize: 12.5 }}>
              {(r.items || []).slice(0, 30).map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between',
                  borderBottom: '1px solid var(--line-soft)', padding: '6px 0' }}>
                  <span>{it.itemName}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{it.requestedQuantity} {it.unit}</span>
                </div>
              ))}
            </div>
          </DrSec>
        </>
      )}
    />
  );
};

export default ProcurementV2;
