import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { getRetailSales, getPharmacyDashboard } from '../api/hospitalPharmacy';
import type { RetailSaleDto } from '../api/hospitalPharmacy';
import {
  SimpleV2Page, StatusBadge, DrSec, DrField,
  type ColumnDef, type StatusTab, type KpiItem,
} from './_v2kit';

const STATUS_TONE: Record<number, { label: string; tone: 'warn' | 'ok' | 'crit' }> = {
  0: { label: 'Chờ',    tone: 'warn' },
  1: { label: 'Đã bán', tone: 'ok' },
  2: { label: 'Hủy',    tone: 'crit' },
};
const PAYMENT_LABEL: Record<number, string> = { 0: 'Tiền mặt', 1: 'Thẻ', 2: 'Chuyển khoản' };

type SKey = 'pending' | 'completed' | 'cancelled';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'pending',   l: 'Chờ',     tone: 'warn' },
  { v: 'completed', l: 'Đã bán',  tone: 'ok' },
  { v: 'cancelled', l: 'Hủy',     tone: 'crit' },
];
const statusKey = (s: RetailSaleDto): SKey =>
  s.status === 1 ? 'completed' : s.status === 2 ? 'cancelled' : 'pending';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('vi-VN');

const HospitalPharmacyV2: React.FC = () => {
  const load = useCallback(async () => {
    const [r, dash] = await Promise.allSettled([
      getRetailSales({
        fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
      }),
      getPharmacyDashboard(),
    ]);
    void dash; // dashboard fetched for warming, KPIs derive from rows
    if (r.status !== 'fulfilled') return [];
    const v = r.value;
    return ((v?.items as RetailSaleDto[]) || (Array.isArray(v) ? v : [])) as RetailSaleDto[];
  }, []);

  const columns: ColumnDef<RetailSaleDto>[] = [
    { key: 'saleCode',      label: 'Mã đơn',      mono: true, code: true,
      render: (r) => r.saleCode },
    { key: 'customerName',  label: 'Khách hàng',
      render: (r) => r.customerName || 'Khách lẻ' },
    { key: 'customerPhone', label: 'SĐT',         mono: true,
      render: (r) => r.customerPhone || '—' },
    { key: 'paymentMethod', label: 'Thanh toán',
      render: (r) => PAYMENT_LABEL[r.paymentMethod] || '—' },
    { key: 'finalAmount',   label: 'Tổng',        mono: true,
      render: (r) => `${fmt(r.finalAmount)}đ` },
    { key: 'discountAmount', label: 'Giảm',       mono: true,
      render: (r) => r.discountAmount > 0
        ? <span style={{ color: 'var(--s-ok)' }}>-{fmt(r.discountAmount)}đ</span>
        : '—' },
    { key: 'status',        label: 'Trạng thái',
      render: (r) => {
        const m = STATUS_TONE[r.status] || { label: '—', tone: 'info' as const };
        return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
      } },
    { key: 'saleDate',      label: 'Ngày bán',    mono: true,
      render: (r) => dayjs(r.saleDate).format('DD/MM HH:mm') },
  ];

  const kpis = (rows: RetailSaleDto[]): KpiItem[] => {
    const completed = rows.filter((r) => r.status === 1);
    const revenue = completed.reduce((s, r) => s + (r.finalAmount || 0), 0);
    return [
      { lbl: 'Hóa đơn 7d', val: rows.length },
      { lbl: 'Đã bán',     val: completed.length, tone: 'ok' },
      { lbl: 'Doanh thu',  val: Math.round(revenue / 1_000_000), unit: 'M₫', tone: 'info' },
      { lbl: 'Đã hủy',     val: rows.filter((r) => r.status === 2).length, tone: 'crit' },
    ];
  };

  return (
    <SimpleV2Page<RetailSaleDto>
      title="Hóa đơn bán lẻ"
      load={load}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm khách / mã đơn / SĐT…"
      searchOf={(r) => `${r.saleCode} ${r.customerName || ''} ${r.customerPhone || ''}`}
      statusTabs={STATUS_TABS}
      statusOf={statusKey}
      kpis={kpis}
      pageSize={20}
      emptyMessage="Chưa có hóa đơn nào"
      drawerTitle={(r) => r.saleCode}
      drawerSub={(r) => `${PAYMENT_LABEL[r.paymentMethod] || ''} · ${dayjs(r.saleDate).format('DD/MM/YYYY HH:mm')}`}
      drawer={(r) => (
        <>
          <DrSec title="Khách hàng">
            <DrField lbl="Mã">{r.saleCode}</DrField>
            <DrField lbl="Khách">{r.customerName || 'Khách lẻ'}</DrField>
            {r.customerPhone && <DrField lbl="SĐT">{r.customerPhone}</DrField>}
          </DrSec>
          <DrSec title="Thanh toán">
            <DrField lbl="Tổng">{fmt(r.totalAmount)}đ</DrField>
            {r.discountAmount > 0 && (
              <DrField lbl="Giảm"><span style={{ color: 'var(--s-ok)' }}>-{fmt(r.discountAmount)}đ</span></DrField>
            )}
            <DrField lbl="Cuối cùng">{fmt(r.finalAmount)}đ</DrField>
            <DrField lbl="Phương thức">{PAYMENT_LABEL[r.paymentMethod] || '—'}</DrField>
          </DrSec>
          <DrSec title="Chi tiết">
            <DrField lbl="Số mặt hàng">{(r.items || []).length}</DrField>
            <DrField lbl="Người bán">{r.createdByName || '—'}</DrField>
            <DrField lbl="Ngày">{dayjs(r.saleDate).format('DD/MM/YYYY HH:mm')}</DrField>
          </DrSec>
        </>
      )}
    />
  );
};

export default HospitalPharmacyV2;
