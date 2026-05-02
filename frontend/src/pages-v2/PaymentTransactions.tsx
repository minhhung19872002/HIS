import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  searchTransactions, refundPayment, getPaymentStats,
  type PaymentTransactionDto, type PaymentSearchRequest, type PaymentStatsDto,
} from '../api/paymentGateway';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, ModalShell,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

const PROVIDERS = [
  { v: 'vnpay', l: 'VNPay' },
  { v: 'momo', l: 'MoMo' },
  { v: 'zalopay', l: 'ZaloPay' },
];

type SKey = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
const STATUS_TABS = [
  { v: 'pending' as SKey,  l: 'Chờ TT',     tone: 'warn' as const },
  { v: 'paid' as SKey,     l: 'Đã TT',      tone: 'ok' as const },
  { v: 'failed' as SKey,   l: 'Thất bại',   tone: 'crit' as const },
  { v: 'refunded' as SKey, l: 'Đã hoàn',    tone: 'info' as const },
  { v: 'expired' as SKey,  l: 'Hết hạn',    tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'paid' : n === 2 ? 'failed' : n === 3 ? 'refunded' : 'expired';

const tabToStatus = (t: SKey | 'all'): number | undefined =>
  t === 'pending' ? 0 : t === 'paid' ? 1 : t === 'failed' ? 2 : t === 'refunded' ? 3 : t === 'expired' ? 4 : undefined;

const STATUS_LABEL: Record<number, string> = { 0: 'Chờ TT', 1: 'Đã TT', 2: 'Thất bại', 3: 'Đã hoàn', 4: 'Hết hạn' };

const fmt = (n: number) => (n || 0).toLocaleString('vi-VN');

const PaymentTransactionsV2: React.FC = () => {
  const [items, setItems] = useState<PaymentTransactionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<PaymentStatsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [provider, setProvider] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(0);
  const [refundOpen, setRefundOpen] = useState<PaymentTransactionDto | null>(null);
  const [refundForm] = Form.useForm<{ amount: number; reason: string }>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const req: PaymentSearchRequest = {
        keyword: keyword || undefined,
        provider: provider || undefined,
        status: tabToStatus(stab),
        fromDate: range?.[0]?.toISOString(),
        toDate: range?.[1]?.toISOString(),
        pageIndex: page + 1,
        pageSize: 20,
      };
      const res = await searchTransactions(req);
      setItems(res.items); setTotal(res.totalCount);
      const statsFrom = range?.[0]?.toISOString() ?? dayjs().subtract(30, 'day').toISOString();
      const statsTo = range?.[1]?.toISOString() ?? dayjs().toISOString();
      const s = await getPaymentStats(statsFrom, statsTo, provider || undefined);
      setStats(s);
    } catch { ti('Không tải được giao dịch'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [page, stab, provider]);

  const handleRefund = async () => {
    if (!refundOpen) return;
    const v = await refundForm.validateFields();
    try {
      await refundPayment(refundOpen.id, v.amount, v.reason);
      tk('Đã hoàn tiền'); setRefundOpen(null); refundForm.resetFields(); fetchData();
    } catch { tw('Hoàn tiền thất bại'); }
  };

  const counts = useMemo(() => ({ all: total }) as Record<string, number>, [total]);

  const cols: ColumnDef<PaymentTransactionDto>[] = [
    { key: 'ref', label: 'Mã GD', code: true, render: (r) => r.txnRef },
    { key: 'provider', label: 'Cổng', render: (r) => <StatusBadge tone="info">{r.provider?.toUpperCase()}</StatusBadge> },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 500 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) : '—' },
    { key: 'order', label: 'Nội dung', render: (r) => <span style={{ fontSize: 12 }}>{r.orderInfo || '—'}</span> },
    { key: 'amt', label: 'Số tiền', mono: true, render: (r) => <b>{fmt(r.amount)}</b> },
    { key: 'bank', label: 'Ngân hàng', mono: true, render: (r) => r.bankCode || '—' },
    { key: 'time', label: 'Thời gian', mono: true, render: (r) => dayjs(r.createdAt).format('DD/MM HH:mm') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusText || STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng giao dịch', val: stats?.totalTransactions ?? 0, sub: '30 ngày' },
        { lbl: 'Thành công', val: stats?.successTransactions ?? 0, sub: stats ? `${Math.round(((stats.successTransactions || 0) / Math.max(1, stats.totalTransactions)) * 100)}%` : '—', tone: 'ok' },
        { lbl: 'Tổng thu', val: Math.round((stats?.totalSuccessAmount ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Đã hoàn', val: Math.round((stats?.totalRefundedAmount ?? 0) / 1_000_000), unit: 'tr', sub: 'VND', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm mã GD / tên BN / mã cổng…" />
        <Filter value={provider} onChange={setProvider} options={PROVIDERS} placeholder="▾ Cổng TT" />
        <RangePicker value={range as [Dayjs, Dayjs] | null} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        <button className="ab-btn ghost" type="button" onClick={() => { setKeyword(''); setProvider(''); setRange(null); setStab('all'); fetchData(); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <button className="ab-btn primary" type="button" onClick={() => { setPage(0); fetchData(); }}>
          <Ico name="search" size={12} /> Tìm
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={fetchData}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')} disabled={items.length === 0}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<PaymentTransactionDto>
        columns={cols} data={items} rowKey={(r) => r.id}
        actions={(r) => (
          <div className="ab-actions">
            {r.status === 1 && r.refundedAmount < r.amount && (
              <ActBtn ic="refresh" title="Hoàn tiền" tone="warn" onClick={() => {
                refundForm.setFieldsValue({ amount: r.amount - r.refundedAmount, reason: '' });
                setRefundOpen(r);
              }} />
            )}
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Không có giao dịch'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={total} perPage={20} />

      <ModalShell
        open={!!refundOpen}
        onClose={() => { setRefundOpen(null); refundForm.resetFields(); }}
        size="md"
        title="Hoàn tiền giao dịch"
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => { setRefundOpen(null); refundForm.resetFields(); }}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={handleRefund}>
            <Ico name="refresh" size={12} /> Hoàn tiền
          </button>
        </>}
      >
        {refundOpen && (
          <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4, marginBottom: 12, fontSize: 12 }}>
            <div><b>{refundOpen.txnRef}</b> · {refundOpen.provider?.toUpperCase()}</div>
            <div>BN: {refundOpen.patientName || '—'}</div>
            <div style={{ marginTop: 4 }}>
              Đã thanh toán: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(refundOpen.amount)} đ</b>
              · Đã hoàn: <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(refundOpen.refundedAmount)} đ</span>
            </div>
          </div>
        )}
        <Form form={refundForm} layout="vertical">
          <Form.Item name="amount"
            label={`Số tiền (tối đa ${((refundOpen?.amount ?? 0) - (refundOpen?.refundedAmount ?? 0)).toLocaleString('vi-VN')}đ)`}
            rules={[{ required: true, message: 'Nhập số tiền cần hoàn' }]}>
            <InputNumber style={{ width: '100%' }} min={1}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default PaymentTransactionsV2;
