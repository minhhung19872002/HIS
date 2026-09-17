/**
 * SupplierPayablesPanel — Công nợ & thanh toán nhà cung cấp (tab "Công nợ NCC" của trang Nhập kho NCC).
 *
 * - Công nợ:   GET  /warehouse/supplier-payables  (tổng nhập đã trừ trả NCC, đã trả, còn phải trả)
 * - Ghi nhận:  POST /warehouse/supplier-payments  (BE chặn trả vượt công nợ / vượt số còn lại của phiếu → hiện đúng thông điệp BE)
 * - Lịch sử:   GET  /warehouse/supplier-payments?supplierId=&fromDate=&toDate=
 *
 * Quyền (UX — BE vẫn là chốt chặn): đọc = role Admin/WarehouseManager/Accountant/Pharmacist/PharmacyManager (WarehouseCompleteController);
 * ghi = role Admin/Accountant + permission Pharmacy.StockIn (WritePermissionMap["WarehouseComplete"]).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import * as wh from '../api/warehouse';
import type { StockReceiptDto, SupplierPayableDto, SupplierPaymentDto } from '../api/warehouse';
import type { SupplierCatalogDto } from '../../system/api/system';
import {
  KpiStrip,
  Filter,
  DataTable,
  Btn,
  ModalShell,
  fmtVNDg,
  fmtDMYg,
  type ColumnDef,
} from '@/_v2kit';
import { RowActions, RefreshButton } from '../../../components/actions';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { can, hasAnyRole, hasAnyRoleCode } from '../../../services/permission.service';

// ─── Access (mirrors WarehouseCompleteController attributes) ─────────────────
// JWT role claims = role name + English aliases of the RoleCode (Admin ← ADMIN, Accountant ← CASHIER);
// `user.roles` only carries the Vietnamese name, so match the codes and keep the English names for custom roles.

/** POST supplier-payments: Admin, Accountant (+ Pharmacy.StockIn from WritePermissionMap). */
const PAYMENT_WRITE_ROLES = ['Admin', 'Accountant'];
const PAYMENT_WRITE_ROLE_CODES = ['ADMIN', 'CASHIER'];
const PAYMENT_WRITE_PERMISSION = 'Pharmacy.StockIn';

const canRecordSupplierPayment = () =>
  (hasAnyRoleCode(PAYMENT_WRITE_ROLE_CODES) || hasAnyRole(PAYMENT_WRITE_ROLES)) && can(PAYMENT_WRITE_PERMISSION);

const PAYMENT_METHODS = ['Chuyển khoản', 'Tiền mặt', 'Séc', 'Khác'].map((m) => ({ value: m, label: m }));

/** Approved supplier receipts (ImportType 1, Status 1). */
const RECEIPT_TYPE_SUPPLIER = 1;
const RECEIPT_STATUS_APPROVED = 1;

const money = (n: number | null | undefined) => fmtVNDg(n ?? 0);

/** Payable rows whose receipts match no catalog supplier come back with an empty id — cannot be paid. */
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const hasSupplierId = (p: SupplierPayableDto) => !!p.supplierId && p.supplierId !== EMPTY_GUID;

// ─── Payment modal ───────────────────────────────────────────────────────────

interface SupplierPaymentModalProps {
  open: boolean;
  payable: SupplierPayableDto | null;
  onClose: () => void;
  onDone: () => void;
}

type PaymentField = 'amount' | 'paymentDate';

const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({ open, payable, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState<Dayjs | null>(dayjs());
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(PAYMENT_METHODS[0].value);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [importReceiptId, setImportReceiptId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [receipts, setReceipts] = useState<StockReceiptDto[]>([]);
  const [saving, setSaving] = useState(false);
  const form = useModalForm<PaymentField>({
    amount: {
      required: true,
      message: 'Nhập số tiền thanh toán',
      validate: (v) => (typeof v === 'number' && v <= 0 ? 'Số tiền phải lớn hơn 0' : undefined),
    },
    paymentDate: { required: true, message: 'Chọn ngày thanh toán' },
  }, open);

  useEffect(() => {
    if (!open || !payable) return;
    setAmount(null);
    setPaymentDate(dayjs());
    setPaymentMethod(PAYMENT_METHODS[0].value);
    setReferenceNumber('');
    setImportReceiptId(undefined);
    setNotes('');
    setReceipts([]);
    wh.getStockReceipts({
      supplierId: payable.supplierId,
      receiptType: RECEIPT_TYPE_SUPPLIER,
      status: RECEIPT_STATUS_APPROVED,
      page: 1,
      pageSize: 100,
    })
      .then((r) => setReceipts(r.data?.items ?? []))
      .catch(() => setReceipts([])); // optional link — the payment can still be recorded without it
  }, [open, payable]);

  const submit = async () => {
    if (!payable || saving) return;
    if (!form.validate({ amount, paymentDate })) return;
    setSaving(true);
    try {
      await wh.createSupplierPayment({
        supplierId: payable.supplierId,
        amount: amount ?? 0,
        paymentDate: paymentDate!.format('YYYY-MM-DD'),
        paymentMethod: paymentMethod || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        importReceiptId: importReceiptId || undefined,
        notes: notes.trim() || undefined,
      });
      message.success(`Đã ghi nhận thanh toán ${money(amount)} cho ${payable.supplierName}`);
      onDone();
    } catch (e) {
      // Over-payment / wrong receipt: show the backend's own message.
      message.error(friendlyErrorMessage(e, 'Ghi nhận thanh toán thất bại'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      size="md"
      title="Ghi nhận thanh toán NCC"
      sub={payable ? `${payable.supplierName} · còn phải trả ${money(payable.remainingAmount)}` : undefined}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Đóng</Btn>
        <Btn variant="primary" icon="check" loading={saving} onClick={() => void submit()}>Ghi nhận</Btn>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Field label="Số tiền (₫)" required error={form.errors.amount}>
          <InputNumber
            value={amount}
            min={0}
            step={1000}
            style={{ width: '100%' }}
            placeholder={payable ? `Tối đa ${payable.remainingAmount.toLocaleString('vi-VN')}` : ''}
            formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number((v ?? '').replace(/,/g, ''))}
            onChange={(v) => { setAmount(typeof v === 'number' ? v : null); form.clear('amount'); }}
          />
        </Field>
        <Field label="Ngày thanh toán" required error={form.errors.paymentDate}>
          <DatePicker
            value={paymentDate}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            onChange={(d) => { setPaymentDate(d); form.clear('paymentDate'); }}
          />
        </Field>
        <Field label="Hình thức">
          <Select value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} allowClear style={{ width: '100%' }} />
        </Field>
        <Field label="Số chứng từ">
          <Input value={referenceNumber} maxLength={100} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="UNC / số phiếu chi…" />
        </Field>
        <Field label="Phiếu nhập được thanh toán" hint="Tùy chọn — để trống nếu trả chung công nợ" style={{ gridColumn: '1 / -1' }}>
          <Select
            value={importReceiptId}
            onChange={setImportReceiptId}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="— Không gắn phiếu —"
            style={{ width: '100%' }}
            options={receipts.map((r) => ({
              value: r.id,
              label: `${r.receiptCode} · ${fmtDMYg(r.receiptDate)} · ${money(r.finalAmount)}${r.invoiceNumber ? ` · HĐ ${r.invoiceNumber}` : ''}`,
            }))}
          />
        </Field>
        <Field label="Ghi chú" style={{ gridColumn: '1 / -1' }}>
          <Input.TextArea value={notes} maxLength={1000} rows={2} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
};

// ─── Panel ───────────────────────────────────────────────────────────────────

export interface SupplierPayablesPanelProps {
  suppliers: SupplierCatalogDto[];
}

export const SupplierPayablesPanel: React.FC<SupplierPayablesPanelProps> = ({ suppliers }) => {
  const canPay = canRecordSupplierPayment();

  const [payables, setPayables] = useState<SupplierPayableDto[]>([]);
  const [payablesLoading, setPayablesLoading] = useState(false);
  const [payablesError, setPayablesError] = useState('');

  const [payments, setPayments] = useState<SupplierPaymentDto[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [historySupplierId, setHistorySupplierId] = useState('');
  const [fromDate, setFromDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(() => dayjs().format('YYYY-MM-DD'));

  const [payTarget, setPayTarget] = useState<SupplierPayableDto | null>(null);

  const loadPayables = useCallback(async () => {
    setPayablesLoading(true);
    setPayablesError('');
    try {
      const r = await wh.getSupplierPayables();
      setPayables(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setPayables([]);
      setPayablesError(friendlyErrorMessage(e, 'Không tải được công nợ nhà cung cấp'));
    } finally {
      setPayablesLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const r = await wh.getSupplierPayments({
        supplierId: historySupplierId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setPayments(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setPayments([]);
      setPaymentsError(friendlyErrorMessage(e, 'Không tải được lịch sử thanh toán'));
    } finally {
      setPaymentsLoading(false);
    }
  }, [historySupplierId, fromDate, toDate]);

  useEffect(() => { void loadPayables(); }, [loadPayables]);
  useEffect(() => { void loadPayments(); }, [loadPayments]);

  const onPaid = () => {
    setPayTarget(null);
    void loadPayables();
    void loadPayments();
  };

  const kpis = useMemo(() => {
    const owing = payables.filter((p) => p.remainingAmount > 0);
    return [
      { lbl: 'NCC còn nợ', val: owing.length, tone: owing.length ? 'warn' as const : 'ok' as const },
      { lbl: 'Còn phải trả', val: money(owing.reduce((s, p) => s + p.remainingAmount, 0)), tone: 'crit' as const },
      { lbl: 'Đã trả (lũy kế)', val: money(payables.reduce((s, p) => s + p.paidAmount, 0)), tone: 'ok' as const },
      { lbl: 'Đã trả trong kỳ lọc', val: money(payments.reduce((s, p) => s + p.amount, 0)), sub: `${payments.length} lần`, tone: 'info' as const },
    ];
  }, [payables, payments]);

  const payableColumns: ColumnDef<SupplierPayableDto>[] = [
    {
      key: 'supplier', label: 'Nhà cung cấp',
      render: (p) => <div className="cell-2l"><b>{p.supplierName || '—'}</b><span className="mono">{p.supplierCode}</span></div>,
      sortValue: (p) => p.supplierName,
    },
    { key: 'total', label: 'Tổng nhập', mono: true, render: (p) => money(p.totalReceiptAmount + (p.returnedAmount ?? 0)), sortValue: (p) => p.totalReceiptAmount + (p.returnedAmount ?? 0) },
    { key: 'returned', label: 'Trả NCC', mono: true, render: (p) => money(p.returnedAmount), sortValue: (p) => p.returnedAmount },
    { key: 'paid', label: 'Đã thanh toán', mono: true, render: (p) => money(p.paidAmount), sortValue: (p) => p.paidAmount },
    {
      key: 'remaining', label: 'Còn phải trả', mono: true,
      render: (p) => (
        <b style={{ color: p.remainingAmount > 0 ? 'var(--s-crit)' : 'var(--t-2)' }}>{money(p.remainingAmount)}</b>
      ),
      sortValue: (p) => p.remainingAmount,
    },
  ];

  const paymentColumns: ColumnDef<SupplierPaymentDto>[] = [
    { key: 'date', label: 'Ngày TT', mono: true, width: 100, render: (p) => fmtDMYg(p.paymentDate), sortValue: (p) => p.paymentDate },
    { key: 'supplier', label: 'Nhà cung cấp', render: (p) => p.supplierName || '—' },
    { key: 'amount', label: 'Số tiền', mono: true, render: (p) => <b>{money(p.amount)}</b>, sortValue: (p) => p.amount },
    { key: 'method', label: 'Hình thức', render: (p) => p.paymentMethod || '—' },
    { key: 'ref', label: 'Số chứng từ', mono: true, render: (p) => p.referenceNumber || '—' },
    { key: 'by', label: 'Người ghi nhận', render: (p) => p.createdByName || '—' },
    { key: 'note', label: 'Ghi chú', render: (p) => p.notes || '—', sortable: false },
  ];

  const supplierOpts = suppliers.filter((s) => s.id).map((s) => ({ v: s.id!, l: s.name }));

  return (
    <>
      <KpiStrip items={kpis} />

      <div className="ab-toolbar">
        <b style={{ fontSize: 'var(--fs-sm)' }}>Công nợ theo nhà cung cấp</b>
        <span className="spacer" />
        <RefreshButton onRefresh={loadPayables} loading={payablesLoading} />
      </div>
      <DataTable<SupplierPayableDto>
        columns={payableColumns}
        data={payables}
        rowKey={(p) => (hasSupplierId(p) ? p.supplierId : p.supplierCode)}
        loading={payablesLoading}
        empty={payablesError || 'Chưa có công nợ nhà cung cấp (chỉ tính phiếu nhập NCC đã duyệt)'}
        actions={(p) => (
          <RowActions actions={[
            {
              key: 'pay', icon: 'cash', label: 'Ghi nhận thanh toán', primary: true,
              hidden: !canPay || !hasSupplierId(p),
              disabled: p.remainingAmount <= 0,
              onClick: () => setPayTarget(p),
            },
            {
              key: 'history', icon: 'clock', label: 'Xem lịch sử thanh toán',
              hidden: !hasSupplierId(p),
              onClick: () => setHistorySupplierId(p.supplierId),
            },
          ]} />
        )}
      />

      <div className="ab-toolbar" style={{ marginTop: 'var(--space-16)' }}>
        <b style={{ fontSize: 'var(--fs-sm)' }}>Lịch sử thanh toán</b>
        <Filter value={historySupplierId} onChange={setHistorySupplierId} options={supplierOpts} placeholder="▾ Tất cả NCC" />
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          placeholder="Từ ngày"
          value={fromDate ? dayjs(fromDate) : null}
          onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')}
        />
        <DatePicker
          size="small"
          format="DD/MM/YYYY"
          placeholder="Đến ngày"
          value={toDate ? dayjs(toDate) : null}
          onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')}
        />
        <span className="spacer" />
        <RefreshButton onRefresh={loadPayments} loading={paymentsLoading} />
      </div>
      <DataTable<SupplierPaymentDto>
        columns={paymentColumns}
        data={payments}
        rowKey={(p) => p.id}
        loading={paymentsLoading}
        empty={paymentsError || 'Không có lần thanh toán nào trong kỳ'}
      />

      <SupplierPaymentModal
        open={!!payTarget}
        payable={payTarget}
        onClose={() => setPayTarget(null)}
        onDone={onPaid}
      />
    </>
  );
};

export default SupplierPayablesPanel;
