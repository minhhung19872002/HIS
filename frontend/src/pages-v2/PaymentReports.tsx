import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, Filter, DataTable, StatusBadge, Ico, tk, ti, tw,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

type Tab = 'bc1' | 'bc2' | 'bc3' | 'bc4' | 'bc5' | 'bc6' | 'bc7';
const TABS = [
  { v: 'bc1' as Tab, l: 'BC1 · Tạm ứng cổng',     ic: 'card' },
  { v: 'bc2' as Tab, l: 'BC2 · Thu/ngày tổng',    ic: 'activity' },
  { v: 'bc3' as Tab, l: 'BC3 · Thu/ngày chi tiết', ic: 'list' },
  { v: 'bc4' as Tab, l: 'BC4 · HDDT BHYT',        ic: 'file-text' },
  { v: 'bc5' as Tab, l: 'BC5 · HDDT dịch vụ',     ic: 'file-text' },
  { v: 'bc6' as Tab, l: 'BC6 · Viện phí CT',      ic: 'archive' },
  { v: 'bc7' as Tab, l: 'BC7 · Hoàn cổng',        ic: 'refresh' },
];

const PROVIDERS = [
  { v: 'vnpay', l: 'VNPay' },
  { v: 'momo', l: 'MoMo' },
  { v: 'zalopay', l: 'ZaloPay' },
];

interface TxnRow { txnRef: string; gatewayTxnRef?: string; patientName?: string; patientCode?: string; amount: number; provider: string; bankCode?: string; completedAt?: string }
interface DailySumRow { date: string; receipts: number; deposit: number; payment: number; refund: number; net: number; cash: number; transfer: number; card: number; eWallet: number }
interface DailyDetailRow { receiptCode: string; receiptDate: string; patientCode?: string; patientName?: string; receiptType: number; receiptTypeName: string; paymentMethod: number; paymentMethodName: string; amount: number; finalAmount: number; cashierName?: string }
interface EInvoiceRow { invoiceSeries: string; invoiceNumber: string; invoiceDate: string; patientName: string; subTotal?: number; vatAmount?: number; totalAmount: number; status: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BillingDetailRow = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefundRow = Record<string, any>;

const fmt = (n?: number) => (n || 0).toLocaleString('vi-VN');

const PaymentReportsV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('bc1');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);

  const [bc1, setBc1] = useState<{ items: TxnRow[]; totalCount: number; totalAmount: number } | null>(null);
  const [bc2, setBc2] = useState<{ byDay: DailySumRow[]; totalNet: number } | null>(null);
  const [bc3, setBc3] = useState<DailyDetailRow[]>([]);
  const [bc4, setBc4] = useState<{ items: EInvoiceRow[]; totalAmount: number; count: number } | null>(null);
  const [bc5, setBc5] = useState<{ items: EInvoiceRow[]; totalAmount: number; count: number } | null>(null);
  const [bc6, setBc6] = useState<BillingDetailRow[]>([]);
  const [bc7, setBc7] = useState<{ items: RefundRow[]; count: number; totalRefunded: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { fromDate: range[0].toISOString(), toDate: range[1].toISOString() };
      if (tab === 'bc1') {
        const { data } = await apiClient.get('/payment-reports/deposit-gateway', { params: { ...params, provider: provider || undefined } });
        setBc1(data as typeof bc1);
      } else if (tab === 'bc2') {
        const { data } = await apiClient.get('/payment-reports/daily-summary', { params });
        setBc2(data as typeof bc2);
      } else if (tab === 'bc3') {
        const { data } = await apiClient.get<DailyDetailRow[]>('/payment-reports/daily-detail', { params });
        setBc3(data || []);
      } else if (tab === 'bc4') {
        const { data } = await apiClient.get('/payment-reports/einvoice-budget', { params });
        setBc4(data as typeof bc4);
      } else if (tab === 'bc5') {
        const { data } = await apiClient.get('/payment-reports/einvoice-service', { params });
        setBc5(data as typeof bc5);
      } else if (tab === 'bc6') {
        const { data } = await apiClient.get<BillingDetailRow[]>('/payment-reports/billing-detail', { params });
        setBc6(data || []);
      } else {
        const { data } = await apiClient.get('/payment-reports/refund-gateway', { params });
        setBc7(data as typeof bc7);
      }
    } catch { ti('Tải báo cáo thất bại'); }
    finally { setLoading(false); }
  }, [tab, range, provider]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = tab === 'bc1' ? bc1?.items || []
      : tab === 'bc2' ? bc2?.byDay || []
      : tab === 'bc3' ? bc3
      : tab === 'bc4' ? bc4?.items || []
      : tab === 'bc5' ? bc5?.items || []
      : tab === 'bc6' ? bc6
      : bc7?.items || [];
    if (rows.length === 0) { tw('Không có dữ liệu'); return; }
    const keys = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' || rows[0][k] instanceof Date);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv = [keys.join(',')].concat(rows.map((r: any) => keys.map((k) => {
      const v = r[k]; if (v == null) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','))).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tab}-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}.csv`;
    a.click();
    tk('Đã xuất CSV');
  };

  const bc1Cols: ColumnDef<TxnRow>[] = [
    { key: 'ref', label: 'Mã GD', code: true, render: (r) => r.txnRef },
    { key: 'gw', label: 'Mã cổng', code: true, render: (r) => r.gatewayTxnRef || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => `${r.patientCode || ''} ${r.patientName || ''}`.trim() || '—' },
    { key: 'amt', label: 'Số tiền', mono: true, render: (r) => fmt(r.amount) },
    { key: 'prov', label: 'Cổng', render: (r) => <StatusBadge tone="info">{r.provider?.toUpperCase()}</StatusBadge> },
    { key: 'bank', label: 'NH', render: (r) => r.bankCode || '—' },
    { key: 'time', label: 'Thời gian', mono: true, render: (r) => r.completedAt ? dayjs(r.completedAt).format('DD/MM HH:mm') : '—' },
  ];

  const bc2Cols: ColumnDef<DailySumRow>[] = [
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.date).format('DD/MM/YYYY') },
    { key: 'receipts', label: 'Phiếu', mono: true, render: (r) => r.receipts },
    { key: 'deposit', label: 'Tạm ứng', mono: true, render: (r) => fmt(r.deposit) },
    { key: 'payment', label: 'Viện phí', mono: true, render: (r) => fmt(r.payment) },
    { key: 'refund', label: 'Hoàn trả', mono: true, render: (r) => fmt(r.refund) },
    { key: 'net', label: 'Net', mono: true, render: (r) => <b>{fmt(r.net)}</b> },
    { key: 'cash', label: 'Tiền mặt', mono: true, render: (r) => fmt(r.cash) },
    { key: 'transfer', label: 'CK', mono: true, render: (r) => fmt(r.transfer) },
    { key: 'card', label: 'Thẻ', mono: true, render: (r) => fmt(r.card) },
    { key: 'wallet', label: 'Ví', mono: true, render: (r) => fmt(r.eWallet) },
  ];

  const bc3Cols: ColumnDef<DailyDetailRow>[] = [
    { key: 'code', label: 'Mã phiếu', code: true, render: (r) => r.receiptCode },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.receiptDate).format('DD/MM HH:mm') },
    { key: 'pt', label: 'BN', render: (r) => `${r.patientCode || ''} ${r.patientName || ''}`.trim() || '—' },
    { key: 'type', label: 'Loại', render: (r) => <StatusBadge tone="info">{r.receiptTypeName}</StatusBadge> },
    { key: 'pm', label: 'PT thanh toán', render: (r) => r.paymentMethodName },
    { key: 'amt', label: 'Thành tiền', mono: true, render: (r) => fmt(r.finalAmount) },
    { key: 'cashier', label: 'Thu ngân', render: (r) => r.cashierName || '—' },
  ];

  const eInvoiceCols: ColumnDef<EInvoiceRow>[] = [
    { key: 'series', label: 'Ký hiệu', code: true, render: (r) => r.invoiceSeries },
    { key: 'no', label: 'Số HĐ', code: true, render: (r) => r.invoiceNumber },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => dayjs(r.invoiceDate).format('DD/MM/YYYY') },
    { key: 'pt', label: 'Họ tên', render: (r) => r.patientName },
    { key: 'sub', label: 'Trước thuế', mono: true, render: (r) => fmt(r.subTotal) },
    { key: 'vat', label: 'VAT', mono: true, render: (r) => fmt(r.vatAmount) },
    { key: 'tot', label: 'Tổng', mono: true, render: (r) => <b>{fmt(r.totalAmount)}</b> },
  ];

  const bc6Cols: ColumnDef<BillingDetailRow>[] = [
    { key: 'code', label: 'Phiếu', code: true, render: (r) => String(r.receiptCode || '') },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => r.receiptDate ? dayjs(r.receiptDate as string).format('DD/MM HH:mm') : '—' },
    { key: 'pt', label: 'BN', render: (r) => String(r.patientName || '—') },
    { key: 'sc', label: 'Mã DV', code: true, render: (r) => String(r.itemCode || '—') },
    { key: 'name', label: 'Tên DV', render: (r) => String(r.itemName || '—') },
    { key: 'qty', label: 'SL', mono: true, render: (r) => Number(r.quantity || 0) },
    { key: 'amt', label: 'Thành tiền', mono: true, render: (r) => fmt(Number(r.finalAmount || 0)) },
  ];

  const bc7Cols: ColumnDef<RefundRow>[] = [
    { key: 'ref', label: 'Mã GD', code: true, render: (r) => String(r.txnRef || '') },
    { key: 'prov', label: 'Cổng', render: (r) => <StatusBadge tone="info">{String(r.provider || '').toUpperCase()}</StatusBadge> },
    { key: 'pt', label: 'BN', render: (r) => String(r.patientName || '—') },
    { key: 'orig', label: 'Gốc', mono: true, render: (r) => fmt(Number(r.originalAmount || 0)) },
    { key: 'refunded', label: 'Đã hoàn', mono: true, render: (r) => fmt(Number(r.refundedAmount || 0)) },
    { key: 'date', label: 'Ngày hoàn', mono: true, render: (r) => r.refundedAt ? dayjs(r.refundedAt as string).format('DD/MM HH:mm') : '—' },
    { key: 'reason', label: 'Lý do', render: (r) => String(r.refundReason || '—') },
  ];

  const renderCurrent = () => {
    if (tab === 'bc1') return <DataTable<TxnRow> columns={bc1Cols} data={bc1?.items || []} rowKey={(r) => r.txnRef} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    if (tab === 'bc2') return <DataTable<DailySumRow> columns={bc2Cols} data={bc2?.byDay || []} rowKey={(r) => r.date} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    if (tab === 'bc3') return <DataTable<DailyDetailRow> columns={bc3Cols} data={bc3} rowKey={(r) => r.receiptCode} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    if (tab === 'bc4') return <DataTable<EInvoiceRow> columns={eInvoiceCols} data={bc4?.items || []} rowKey={(r) => `${r.invoiceSeries}-${r.invoiceNumber}`} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    if (tab === 'bc5') return <DataTable<EInvoiceRow> columns={eInvoiceCols} data={bc5?.items || []} rowKey={(r) => `${r.invoiceSeries}-${r.invoiceNumber}`} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    if (tab === 'bc6') return <DataTable<BillingDetailRow> columns={bc6Cols} data={bc6} rowKey={(_r) => Math.random().toString()} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
    return <DataTable<RefundRow> columns={bc7Cols} data={bc7?.items || []} rowKey={(r) => String(r.txnRef)} empty={loading ? 'Đang tải…' : 'Không có dữ liệu'} />;
  };

  const kpiSet = () => {
    if (tab === 'bc1') return [
      { lbl: 'Số GD', val: bc1?.totalCount ?? 0, sub: 'tạm ứng cổng' },
      { lbl: 'Tổng tạm ứng', val: Math.round((bc1?.totalAmount ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' as const },
      { lbl: 'Cổng', val: provider.toUpperCase() || 'TẤT CẢ', sub: '', tone: 'warn' as const },
      { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
    ];
    if (tab === 'bc2') return [
      { lbl: 'Số ngày', val: bc2?.byDay?.length ?? 0, sub: 'có giao dịch' },
      { lbl: 'Tổng net', val: Math.round((bc2?.totalNet ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' as const },
      { lbl: 'TB/ngày', val: bc2?.byDay?.length ? Math.round((bc2.totalNet / bc2.byDay.length) / 1_000_000) : 0, unit: 'tr', sub: 'VND/ngày', tone: 'info' as const },
      { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
    ];
    if (tab === 'bc3') return [
      { lbl: 'Số phiếu', val: bc3.length, sub: 'chi tiết' },
      { lbl: 'Tổng tiền', val: Math.round(bc3.reduce((s, r) => s + (r.finalAmount || 0), 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' as const },
      { lbl: 'Số BN', val: new Set(bc3.map((r) => r.patientCode).filter(Boolean)).size, sub: 'unique' },
      { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
    ];
    if (tab === 'bc4' || tab === 'bc5') {
      const data = tab === 'bc4' ? bc4 : bc5;
      return [
        { lbl: 'Số HĐ', val: data?.count ?? 0, sub: tab === 'bc4' ? 'BHYT' : 'Dịch vụ', tone: 'info' as const },
        { lbl: 'Tổng', val: Math.round((data?.totalAmount ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' as const },
        { lbl: 'TB/HĐ', val: data?.count ? Math.round((data.totalAmount / data.count) / 1000) : 0, unit: 'k', sub: 'đ/HĐ' },
        { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
      ];
    }
    if (tab === 'bc6') return [
      { lbl: 'Số dòng', val: bc6.length, sub: 'chi tiết DV' },
      { lbl: 'Tổng tiền', val: Math.round(bc6.reduce((s, r) => s + (Number(r.finalAmount) || 0), 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' as const },
      { lbl: 'Số DV unique', val: new Set(bc6.map((r) => r.itemCode).filter(Boolean)).size, sub: 'mã DV' },
      { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
    ];
    return [
      { lbl: 'Số GD hoàn', val: bc7?.count ?? 0, sub: 'qua cổng', tone: 'crit' as const },
      { lbl: 'Tổng hoàn', val: Math.round((bc7?.totalRefunded ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'crit' as const },
      { lbl: 'TB/GD', val: bc7?.count ? Math.round((bc7.totalRefunded / bc7.count) / 1000) : 0, unit: 'k', sub: 'đ/GD' },
      { lbl: 'Khoảng', val: range[1].diff(range[0], 'day') + 1, unit: 'ngày', sub: range[0].format('DD/MM') + '–' + range[1].format('DD/MM') },
    ];
  };

  return (
    <div className="ab">
      <KpiStrip items={kpiSet()} />

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
        <RangePicker value={range} onChange={(v) => v && setRange(v as [Dayjs, Dayjs])} />
        {tab === 'bc1' && (
          <Filter value={provider} onChange={setProvider} options={PROVIDERS} placeholder="▾ Cổng TT" />
        )}
        <button className="ab-btn ghost" type="button" onClick={() => { setRange([dayjs().subtract(7, 'day'), dayjs()]); setProvider(''); }}>
          <Ico name="x" size={12} /> Reset
        </button>
      </div>

      {renderCurrent()}
    </div>
  );
};

export default PaymentReportsV2;
