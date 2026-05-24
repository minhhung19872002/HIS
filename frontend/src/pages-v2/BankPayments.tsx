import React, { useEffect, useState } from 'react';
import { Form, Input, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell,
  Filter, tk, te, fmtVNDg, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { bankPaymentApi } from '../api/nangcap24';
import type { SupportedBankDto } from '../api/nangcap24';
import apiClient from '../api/client';

interface PaymentTxn {
  id: string;
  txnRef: string;
  provider: string;
  patientName?: string;
  amount: number;
  status: number;
  statusText: string;
  bankCode?: string;
  gatewayTxnRef?: string;
  createdAt: string;
  completedAt?: string;
  payDate?: string;
}

type StatusTab = 'pending' | 'paid' | 'failed';
const STATUS_TABS = [
  { v: 'pending' as const, l: 'Chờ thanh toán', tone: 'warn' as const },
  { v: 'paid' as const, l: 'Đã thanh toán', tone: 'ok' as const },
  { v: 'failed' as const, l: 'Lỗi/Hết hạn', tone: 'crit' as const },
];

const BankPayments: React.FC = () => {
  const [rows, setRows] = useState<PaymentTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<SupportedBankDto[]>([]);
  const [stab, setStab] = useState<StatusTab | 'all'>('all');
  const [search, setSearch] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [detail, setDetail] = useState<PaymentTxn | null>(null);
  const [confirmingTxn, setConfirmingTxn] = useState<PaymentTxn | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [bankList, txnRes] = await Promise.all([
        bankPaymentApi.listBanks(),
        apiClient.get('/payment/transactions', { params: { pageIndex: 1, pageSize: 100 } }),
      ]);
      setBanks(bankList);
      const items = (txnRes.data?.items || txnRes.data || []) as PaymentTxn[];
      setRows(items);
    } catch {
      te('Không tải được danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const bankCodes = banks.map(b => b.code);
  const filtered = rows.filter(r => {
    const isBankProvider = bankCodes.includes(r.provider);
    if (stab === 'pending' && r.status !== 0) return false;
    if (stab === 'paid' && r.status !== 1) return false;
    if (stab === 'failed' && r.status !== 2 && r.status !== 4) return false;
    if (bankFilter && r.provider !== bankFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.txnRef.toLowerCase().includes(s) &&
          !(r.patientName || '').toLowerCase().includes(s) &&
          !(r.gatewayTxnRef || '').toLowerCase().includes(s)) return false;
    }
    // Default: only show bank-VietQR provider transactions
    return isBankProvider;
  });

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const successAmount = filtered.filter(r => r.status === 1).reduce((s, r) => s + r.amount, 0);
  const pendingCount = rows.filter(r => bankCodes.includes(r.provider) && r.status === 0).length;

  const kpis = [
    { lbl: 'Tổng giao dịch (5 NH)', val: rows.filter(r => bankCodes.includes(r.provider)).length },
    { lbl: 'Đã thanh toán', val: filtered.filter(r => r.status === 1).length, tone: 'ok' as const },
    { lbl: 'Chờ xác nhận', val: pendingCount, tone: 'warn' as const },
    { lbl: 'Tổng tiền thành công', val: fmtVNDg(successAmount), sub: `${fmtVNDg(totalAmount)} tổng` },
  ];

  const columns: ColumnDef<PaymentTxn>[] = [
    { key: 'txnRef', label: 'Mã GD', code: true, render: r => r.txnRef },
    {
      key: 'bank', label: 'Ngân hàng', render: r => {
        const b = banks.find(x => x.code === r.provider);
        return <span style={{ color: b?.color, fontWeight: 600 }}>{b?.shortName ?? r.provider}</span>;
      }
    },
    { key: 'patient', label: 'Bệnh nhân', render: r => r.patientName ?? '-' },
    { key: 'amount', label: 'Số tiền', mono: true, render: r => fmtVNDg(r.amount) },
    {
      key: 'status', label: 'Trạng thái', render: r => {
        const tone = r.status === 1 ? '#16a34a' : r.status === 0 ? '#f59e0b' : '#ef4444';
        return <span style={{ color: tone, fontWeight: 600 }}>{r.statusText}</span>;
      }
    },
    { key: 'created', label: 'Ngày tạo', render: r => fmtDTg(r.createdAt) },
    { key: 'paid', label: 'Ngày TT', render: r => r.payDate ? fmtDTg(r.payDate) : '-' },
  ];

  const handleConfirm = async () => {
    if (!confirmingTxn) return;
    try {
      const values = await form.validateFields();
      await bankPaymentApi.confirmTransfer({
        transactionId: confirmingTxn.id,
        bankReference: values.bankReference,
        paidAt: values.paidAt ? (values.paidAt as Dayjs).toISOString() : undefined,
        note: values.note,
      });
      tk('Đã xác nhận thanh toán');
      setConfirmingTxn(null);
      form.resetFields();
      load();
    } catch (e) {
      te('Xác nhận thất bại');
    }
  };

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã GD, BN, mã NH..." />
        <Filter
          value={bankFilter}
          onChange={setBankFilter}
          options={[
            { v: '', l: 'Tất cả NH' },
            ...banks.map(b => ({ v: b.code, l: b.shortName })),
          ]}
        />
        <Button onClick={load} loading={loading}>Tải lại</Button>
      </div>

      <StatusTabs
        value={stab}
        onChange={setStab}
        tabs={STATUS_TABS}
        counts={{
          all: rows.filter(r => bankCodes.includes(r.provider)).length,
          pending: rows.filter(r => bankCodes.includes(r.provider) && r.status === 0).length,
          paid: rows.filter(r => bankCodes.includes(r.provider) && r.status === 1).length,
          failed: rows.filter(r => bankCodes.includes(r.provider) && (r.status === 2 || r.status === 4)).length,
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={r => r.id}
        onRowClick={r => setDetail(r)}
        actions={r => r.status === 0 ? (
          <button className="ab-iconbtn" onClick={(e) => { e.stopPropagation(); setConfirmingTxn(r); }}>
            Xác nhận
          </button>
        ) : null}
      />

      <DrawerShell open={!!detail} onClose={() => setDetail(null)} title={detail?.txnRef ?? ''} sub={`Provider: ${detail?.provider?.toUpperCase()}`}>
        {detail && (
          <div className="rec-section">
            <div className="rec-kv">
              <div className="lbl">Bệnh nhân:</div><div>{detail.patientName ?? '-'}</div>
              <div className="lbl">Số tiền:</div><div className="mono">{fmtVNDg(detail.amount)}</div>
              <div className="lbl">Trạng thái:</div><div>{detail.statusText}</div>
              <div className="lbl">Mã GD ngân hàng:</div><div className="mono">{detail.gatewayTxnRef ?? '-'}</div>
              <div className="lbl">Ngày tạo:</div><div>{fmtDTg(detail.createdAt)}</div>
              <div className="lbl">Hoàn tất lúc:</div><div>{detail.completedAt ? fmtDTg(detail.completedAt) : '-'}</div>
            </div>
          </div>
        )}
      </DrawerShell>

      <ModalShell
        open={!!confirmingTxn}
        onClose={() => { setConfirmingTxn(null); form.resetFields(); }}
        title="Xác nhận chuyển khoản"
        footer={(
          <>
            <Button onClick={() => { setConfirmingTxn(null); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleConfirm}>Xác nhận đã nhận tiền</Button>
          </>
        )}
      >
        {confirmingTxn && (
          <Form form={form} layout="vertical">
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 6 }}>
              <div><strong>Mã GD:</strong> {confirmingTxn.txnRef}</div>
              <div><strong>Số tiền:</strong> {fmtVNDg(confirmingTxn.amount)}</div>
            </div>
            <Form.Item name="bankReference" label="Số ref từ sao kê NH" rules={[{ required: true, message: 'Cần nhập số ref' }]}>
              <Input placeholder="VD: FT26010123456789" />
            </Form.Item>
            <Form.Item name="paidAt" label="Ngày chuyển khoản">
              <DatePicker showTime style={{ width: '100%' }} defaultValue={dayjs()} />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Ghi chú đối soát..." />
            </Form.Item>
          </Form>
        )}
      </ModalShell>
    </div>
  );
};

export default BankPayments;
