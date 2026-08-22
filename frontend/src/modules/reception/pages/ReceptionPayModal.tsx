import React, { useEffect, useState } from 'react';
import { App as AntdApp, Input, Select, InputNumber } from 'antd';
import * as receptionApi from '../api/reception';
import { ModalShell } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import type { RawRow } from './shared';
import { treatmentLabel } from './shared';
const PAY_METHOD_OPTS = [
  { value: 1, label: 'Tiền mặt' },
  { value: 2, label: 'Thẻ' },
  { value: 3, label: 'Chuyển khoản' },
];

export const ReceptionPayModal: React.FC<{
  row: RawRow | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ row, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [amount, setAmount] = useState<number>(0);
  const [received, setReceived] = useState<number>(0);
  const [method, setMethod] = useState(1);
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useModalForm({
    amount: { validate: (v) => (typeof v !== 'number' || v <= 0 ? 'Nhập số tiền thu' : undefined) },
  }, !!row);

  useEffect(() => {
    if (row) { setAmount(0); setReceived(0); setMethod(1); setRef(''); }
  }, [row]);

  const submit = async () => {
    if (!row) return;
    if (!form.validate({ amount })) return;
    setBusy(true);
    try {
      await receptionApi.createPayment({
        medicalRecordId: row.id,
        serviceIds: [],
        totalAmount: amount,
        paidAmount: received || amount,
        paymentMethod: method,
        transactionReference: method !== 1 ? ref || undefined : undefined,
      });
      message.success(`Đã thu ${amount.toLocaleString('vi-VN')} ₫ · ${row.patientName}`);
      onDone();
    } catch {
      message.error('Thu phí thất bại');
    } finally {
      setBusy(false);
    }
  };

  const fmtMoney = (v: number | string | undefined) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <ModalShell
      open={!!row}
      onClose={onClose}
      size="md"
      title="Thu phí khám"
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang thu…' : 'Xác nhận thu'}
          </button>
        </>
      )}
    >
      {row && (
        <div style={{ padding: 0 }}>
          <div style={{
            padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-14)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{row.patientName} · {row.patientCode}</span>
            <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{row.queueCode || `#${row.queueNumber}`}</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Hình thức</span>
            <span>{treatmentLabel(row)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <Field label="Số tiền thu" required error={form.errors.amount}>
              <InputNumber value={amount} onChange={(v) => { setAmount(Number(v) || 0); form.clear('amount'); }} min={0} style={{ width: '100%' }} formatter={fmtMoney} />
            </Field>
            <Field label="Phương thức">
              <Select value={method} onChange={setMethod} options={PAY_METHOD_OPTS} style={{ width: '100%' }} />
            </Field>
            {method === 1 && (
              <Field label="Tiền khách đưa">
                <InputNumber value={received} onChange={(v) => setReceived(Number(v) || 0)} min={0} style={{ width: '100%' }} formatter={fmtMoney} />
              </Field>
            )}
            {method !== 1 && (
              <Field label="Mã giao dịch">
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Mã ref NH / thẻ" />
              </Field>
            )}
          </div>
          {method === 1 && received > amount && (
            <div style={{ marginTop: 'var(--space-10)', fontSize: 'var(--fs-md)' }}>
              Tiền thối: <b className="mono" style={{ color: '#15803d' }}>{(received - amount).toLocaleString('vi-VN')} ₫</b>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};

