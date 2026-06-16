/**
 * NangCap24 — Bank Payments v2 (port từ design-system/nangcap24-bundle-v2/mod-bank-payments.jsx)
 *
 * 5 ngân hàng VN qua VietQR · BIDV / VCB / Agribank / Vietinbank / MSB
 * Theo dõi GD chuyển khoản + xác nhận thủ công khi kế toán đối soát sao kê NH.
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';
import {
  KpiStrip, DataTable, StatusTabs, SearchBox, DrawerShell, ModalShell,
  Filter, Pager, ActBtn, StatusBadge, DrSec, DrField,
  tk, te, fmtVNDg, fmtDTg, fmtHMg,
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { bankPaymentApi } from '../api/nangcap24';
import type { SupportedBankDto } from '../api/nangcap24';
import apiClient from '../api/client';

interface PaymentTxn {
  id: string;
  txnRef: string;
  provider: string;       // bidv, vcb, agribank, vietinbank, msb
  patientName?: string;
  patientCode?: string;
  amount: number;
  status: number;         // 0=pending, 1=paid, 2=failed, 4=expired
  statusText: string;
  bankCode?: string;      // BIN
  gatewayTxnRef?: string;
  createdAt: string;
  completedAt?: string;
  payDate?: string;
}

// Map provider code → bank meta (giữ visual giống mock)
const BANK_META: Record<string, { short: string; name: string; color: string; bin: string }> = {
  bidv:       { short: 'BIDV',       name: 'Ngân hàng TMCP Đầu tư & Phát triển VN',   color: '#005baa', bin: '970418' },
  vcb:        { short: 'VCB',        name: 'Ngân hàng TMCP Ngoại thương VN',          color: '#1a5490', bin: '970436' },
  vietcombank:{ short: 'VCB',        name: 'Ngân hàng TMCP Ngoại thương VN',          color: '#1a5490', bin: '970436' },
  agribank:   { short: 'Agribank',   name: 'Agribank — NH NN & PT Nông thôn VN',      color: '#a02323', bin: '970405' },
  vietinbank: { short: 'VietinBank', name: 'Ngân hàng TMCP Công thương VN',           color: '#0066b3', bin: '970415' },
  msb:        { short: 'MSB',        name: 'Ngân hàng TMCP Hàng Hải VN',              color: '#cc0000', bin: '970426' },
};

const BP_STATUS = [
  { v: 'pending' as const, l: 'Chờ thanh toán', tone: 'warn' as const },
  { v: 'paid'    as const, l: 'Đã thanh toán',  tone: 'ok'   as const },
  { v: 'expired' as const, l: 'Hết hạn QR',     tone: 'info' as const },
  { v: 'failed'  as const, l: 'Lỗi đối soát',   tone: 'crit' as const },
];
type BPStatusKey = (typeof BP_STATUS)[number]['v'];

const statusToKey = (s: number): BPStatusKey =>
  s === 1 ? 'paid' : s === 0 ? 'pending' : s === 4 ? 'expired' : 'failed';

const PER = 18;

const BankPayments: React.FC = () => {
  const [rows, setRows] = useState<PaymentTxn[]>([]);
  const [banks, setBanks] = useState<SupportedBankDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [stab, setStab] = useState<BPStatusKey | 'all'>('all');
  const [fBank, setFBank] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<PaymentTxn | null>(null);
  const [qrFor, setQrFor] = useState<PaymentTxn | null>(null);
  const [confirming, setConfirming] = useState<PaymentTxn | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [bankList, txnRes] = await Promise.all([
        bankPaymentApi.listBanks(),
        apiClient.get('/payment/transactions', { params: { pageIndex: 1, pageSize: 200 } }),
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

  // Auto-refresh mỗi 20s để cập nhật trạng thái GD QR (pending → paid/expired).
  // Cleanup interval khi unmount để tránh memory leak / state-on-unmounted-component.
  useEffect(() => {
    const timer = setInterval(() => { load(); }, 20_000);
    return () => clearInterval(timer);
  // load không thay đổi reference qua các lần render — eslint-disable safe ở đây.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bankCodes = new Set(banks.map(b => b.code));
  const onlyBank = rows.filter(r => bankCodes.has(r.provider));

  const counts: Record<string, number> = { all: onlyBank.length };
  BP_STATUS.forEach(s => {
    counts[s.v] = onlyBank.filter(r => statusToKey(r.status) === s.v).length;
  });

  const filtered = onlyBank.filter(r => {
    if (stab !== 'all' && statusToKey(r.status) !== stab) return false;
    if (fBank && r.provider !== fBank) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [r.txnRef, r.patientName, r.patientCode, r.gatewayTxnRef].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const successAmount = filtered.filter(r => r.status === 1).reduce((s, r) => s + r.amount, 0);

  const kpis = [
    { lbl: 'Tổng giao dịch (5 NH)', val: onlyBank.length, sub: 'VietQR khắp các NH' },
    { lbl: 'Đã thanh toán',         val: counts.paid || 0,    tone: 'ok'   as const, sub: 'đối soát thành công' },
    { lbl: 'Chờ xác nhận',          val: counts.pending || 0, tone: 'warn' as const, sub: 'đang chờ NH' },
    { lbl: 'Thành công / Tổng',     val: fmtVNDg(successAmount), sub: `/ ${fmtVNDg(totalAmount)}` },
    { lbl: 'Lỗi · hết hạn',         val: (counts.failed || 0) + (counts.expired || 0), tone: 'crit' as const },
  ];

  const bankOf = (r: PaymentTxn) => BANK_META[r.provider] ?? { short: r.provider.toUpperCase(), name: r.provider, color: 'var(--t-2)', bin: '' };

  const cols: ColumnDef<PaymentTxn>[] = [
    { key: 'txnRef', label: 'Mã GD', mono: true, code: true, width: 170 },
    {
      key: 'bank', label: 'Ngân hàng', width: 180, render: r => {
        const b = bankOf(r);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 4, background: b.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>
              {b.short.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{b.short}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>BIN {b.bin}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'patient', label: 'Bệnh nhân', render: r => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.patientName ?? '—'}</div>
          {r.patientCode && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>}
        </div>
      )
    },
    {
      key: 'amount', label: 'Số tiền', mono: true,
      render: r => <span style={{ fontWeight: 600 }}>{fmtVNDg(r.amount)}</span>
    },
    {
      key: 'gw', label: 'Mã NH (ref)', mono: true,
      render: r => r.gatewayTxnRef
        ? <span style={{ fontSize: 10.5 }}>{r.gatewayTxnRef}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>
    },
    {
      key: 'createdAt', label: 'Tạo', mono: true, width: 110,
      render: r => fmtHMg(r.createdAt)
    },
    {
      key: 'status', label: 'Trạng thái', width: 150, render: r => {
        const k = statusToKey(r.status);
        const meta = BP_STATUS.find(s => s.v === k)!;
        return <StatusBadge tone={meta.tone} dot>{meta.l}</StatusBadge>;
      }
    },
  ];

  const actions = (r: PaymentTxn) => (
    <div className="ab-actions">
      <ActBtn ic="qr" title="QR" onClick={() => setQrFor(r)} />
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
      {r.status === 0 && (
        <ActBtn ic="check" title="Xác nhận" onClick={() => { setConfirming(r); form.resetFields(); }} />
      )}
    </div>
  );

  const exportCsv = () => {
    if (filtered.length === 0) { te('Không có giao dịch để xuất'); return; }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Mã GD', 'Ngân hàng', 'BIN', 'Bệnh nhân', 'Mã BN', 'Số tiền', 'Mã ref NH', 'Trạng thái', 'Tạo'];
    const lines = filtered.map((r) => {
      const b = bankOf(r);
      const meta = BP_STATUS.find((s) => s.v === statusToKey(r.status));
      return [
        r.txnRef, b.short, b.bin, r.patientName || '', r.patientCode || '',
        r.amount, r.gatewayTxnRef || '', meta?.l || r.statusText || '', fmtDTg(r.createdAt),
      ].map(esc).join(',');
    });
    const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanh-toan-ngan-hang-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    tk(`Đã xuất ${filtered.length} giao dịch (CSV)`);
  };

  const handleMarkExpired = async () => {
    try {
      const res = await bankPaymentApi.markExpired();
      if (res.changed) {
        tk('Đã đánh dấu hết hạn các QR quá thời hạn');
        load();
      } else {
        tk('Không có giao dịch nào quá hạn cần cập nhật');
      }
    } catch {
      te('Không thể đánh dấu hết hạn');
    }
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    try {
      const values = await form.validateFields();
      await bankPaymentApi.confirmTransfer({
        transactionId: confirming.id,
        bankReference: values.bankReference,
        paidAt: values.paidAt ? values.paidAt.toISOString() : undefined,
        note: values.note,
      });
      tk(`Đã xác nhận GD ${confirming.txnRef}`);
      setConfirming(null);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown };
      if (err?.errorFields) return;
      te('Xác nhận thất bại');
    }
  };

  return (
    <div className="ab" data-testid="bank-payments-page">
      <KpiStrip items={kpis} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm mã GD, BN, ref NH…" />
        <Filter
          value={fBank}
          onChange={(v) => { setFBank(v); setPage(0); }}
          options={banks.map(b => ({ v: b.code, l: b.shortName }))}
          placeholder="▾ Ngân hàng"
        />
        <span className="spacer" style={{ flex: 1 }} />
        <Button className="ab-btn ghost" size="small" onClick={load} loading={loading}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Button>
        <Button className="ab-btn ghost" size="small" onClick={handleMarkExpired}>
          <TermIcon name="clock" size={12} /> Đánh dấu hết hạn
        </Button>
        <Button className="ab-btn ghost" size="small" onClick={exportCsv}>
          <TermIcon name="download" size={12} /> Xuất CSV
        </Button>
      </div>

      <StatusTabs value={stab} onChange={(v) => { setStab(v as BPStatusKey | 'all'); setPage(0); }} tabs={BP_STATUS} counts={counts} />
      <DataTable columns={cols} data={paged} rowKey={r => r.id} onRowClick={setDetail} actions={actions} />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Drawer chi tiết */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `GD ${detail.txnRef}` : ''}
        sub={detail ? `${bankOf(detail).short} · ${detail.patientName ?? ''}` : undefined}
        size="lg"
        footer={detail && (
          <>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            <Button><TermIcon name="printer" size={12} /> In biên lai</Button>
            {detail.status === 0 && (
              <Button type="primary" onClick={() => { setConfirming(detail); setDetail(null); form.resetFields(); }}>
                <TermIcon name="check" size={12} /> Xác nhận đã nhận
              </Button>
            )}
          </>
        )}
      >
        {detail && (() => {
          const b = bankOf(detail);
          const k = statusToKey(detail.status);
          const meta = BP_STATUS.find(s => s.v === k)!;
          return (
            <>
              <DrSec title="Trạng thái">
                <DrField lbl="Trạng thái"><StatusBadge tone={meta.tone} dot>{meta.l}</StatusBadge></DrField>
                <DrField lbl="Mã GD HIS"><b className="mono">{detail.txnRef}</b></DrField>
                <DrField lbl="Mã ref NH">
                  {detail.gatewayTxnRef
                    ? <span className="mono">{detail.gatewayTxnRef}</span>
                    : <span style={{ color: 'var(--t-3)' }}>Chưa có</span>}
                </DrField>
                <DrField lbl="Số tiền"><b className="mono" style={{ fontSize: 14 }}>{fmtVNDg(detail.amount)}</b></DrField>
              </DrSec>
              <DrSec title="Ngân hàng">
                <DrField lbl="Tên NH">{b.name}</DrField>
                <DrField lbl="Mã BIN"><span className="mono">{b.bin}</span></DrField>
                <DrField lbl="Phương thức"><StatusBadge tone="info">VietQR</StatusBadge></DrField>
              </DrSec>
              <DrSec title="Bệnh nhân">
                <DrField lbl="Họ tên">{detail.patientName ?? '—'}</DrField>
                {detail.patientCode && <DrField lbl="Mã BN"><span className="mono">{detail.patientCode}</span></DrField>}
              </DrSec>
              <DrSec title="Thời gian">
                <DrField lbl="Tạo QR">{fmtDTg(detail.createdAt)}</DrField>
                <DrField lbl="Hoàn tất">{detail.completedAt ? fmtDTg(detail.completedAt) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
                <DrField lbl="Ngày TT">{detail.payDate ? fmtDTg(detail.payDate) : <span style={{ color: 'var(--t-3)' }}>—</span>}</DrField>
              </DrSec>
            </>
          );
        })()}
      </DrawerShell>

      {/* QR Modal */}
      <ModalShell
        open={!!qrFor}
        onClose={() => setQrFor(null)}
        title={qrFor ? `Mã QR · ${qrFor.txnRef}` : ''}
        size="sm"
        footer={(
          <>
            <Button onClick={() => setQrFor(null)}>Đóng</Button>
            <Button><TermIcon name="printer" size={12} /> In QR</Button>
            <Button type="primary"><TermIcon name="send" size={12} /> Gửi BN</Button>
          </>
        )}
      >
        {qrFor && (() => {
          const b = bankOf(qrFor);
          return (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{
                width: 220, height: 220, margin: '0 auto', border: '1px solid var(--line)', borderRadius: 8,
                background: 'repeating-conic-gradient(#000 0% 25%, var(--d-2) 0% 50%) 50%/12px 12px',
              }} />
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--t-1)' }}>
                Quét mã VietQR · <b>{b.short}</b> · BIN {b.bin}
              </div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {fmtVNDg(qrFor.amount)}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--t-2)' }}>
                Nội dung: <span className="mono">{qrFor.txnRef}</span>
              </div>
            </div>
          );
        })()}
      </ModalShell>

      {/* Confirm transfer modal */}
      <ModalShell
        open={!!confirming}
        onClose={() => { setConfirming(null); form.resetFields(); }}
        title="Xác nhận chuyển khoản"
        size="md"
        footer={(
          <>
            <Button onClick={() => { setConfirming(null); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleConfirm} data-testid="confirm-bank-btn">
              <TermIcon name="check" size={12} /> Xác nhận đã nhận tiền
            </Button>
          </>
        )}
      >
        {confirming && (() => {
          const b = bankOf(confirming);
          return (
            <div style={{ padding: 16 }}>
              <div style={{
                padding: 12, background: 'var(--d-1)', borderRadius: 6, marginBottom: 14,
                display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10, alignItems: 'center',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 6, background: b.color, color: '#fff',
                  display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 11,
                }}>{b.short.slice(0, 3).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-2)' }}>BIN {b.bin} · GD {confirming.txnRef}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtVNDg(confirming.amount)}</div>
              </div>
              <Form form={form} layout="vertical" initialValues={{ paidAt: dayjs() }}>
                <Form.Item
                  name="bankReference"
                  label="Mã ref từ sao kê NH"
                  rules={[{ required: true, message: 'Cần nhập mã ref từ sao kê NH' }]}
                >
                  <Input placeholder="VD: FT26010123456789" />
                </Form.Item>
                <Form.Item name="paidAt" label="Ngày chuyển khoản">
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="note" label="Ghi chú">
                  <Input.TextArea rows={2} placeholder="Ghi chú đối soát…" />
                </Form.Item>
              </Form>
            </div>
          );
        })()}
      </ModalShell>
    </div>
  );
};

export default BankPayments;
