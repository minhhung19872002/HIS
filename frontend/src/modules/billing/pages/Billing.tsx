import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select } from 'antd';
import {
  searchInvoices, createPayment, printInvoice,
  // #352: tab Tạm ứng + Hoàn trả admin global (port v1 pages/Billing.tsx)
  searchPatients, getPatientDeposits, createDeposit, cancelDeposit,
  printDepositReceipt, searchRefunds,
} from '../api/billing';
import type { InvoiceDto, DepositDto, RefundDto, PatientBillingStatusDto } from '../api/billing';
import {
  SimpleV2Page, StatusBadge, ActBtn, Btn, ModalShell, TopTabs, SearchBox, DataTable,
  useListData, tk, ti, tw, te, fmtDTg,
  type ColumnDef, type StatusTab, type TopTab, type StatusTone,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { fmtVND } from '../../../utils/format';
import ReassignObjectModal from '../../administration/components/ReassignObjectModal';
import ApplyDiscountModal from '../components/ApplyDiscountModal';
import PartialRefundModal from '../components/PartialRefundModal';

/* Viện phí v2 — port of Billing v2.html */

type StatusKey = 'unpaid' | 'partial' | 'paid' | 'voided';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'unpaid',  l: 'Chưa thu',     tone: 'warn' },
  { v: 'partial', l: 'Một phần',     tone: 'warn' },
  { v: 'paid',    l: 'Đã thu',       tone: 'ok' },
  { v: 'voided',  l: 'Hủy',          tone: 'crit' },
];
// paymentStatus: 0=Chưa, 1=Một phần, 2=Đã, 3=Hủy
const statusKey = (s: number): StatusKey =>
  s === 1 ? 'partial' : s === 2 ? 'paid' : s === 3 ? 'voided' : 'unpaid';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const KIND_LABEL: Record<number, string> = { 1: 'Ngoại trú', 2: 'Nội trú' };

// #352: đổi tên BillingV2 → InvoicesPanel — nội dung GIỮ NGUYÊN, chỉ trở thành tab "Hóa đơn"
// trong wrapper 3 tab (Hóa đơn · Tạm ứng · Hoàn trả) ở cuối file.
const InvoicesPanel: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [payFor, setPayFor] = useState<InvoiceDto | null>(null);
  // Port v1 Billing: đổi đối tượng thanh toán · miễn giảm viện phí · hoàn trả chi tiết (#409)
  const [reassignFor, setReassignFor] = useState<InvoiceDto | null>(null);
  const [discountFor, setDiscountFor] = useState<InvoiceDto | null>(null);
  const [partialRefundFor, setPartialRefundFor] = useState<InvoiceDto | null>(null);
  const reloadRef = useRef<() => void>(() => {});

  const onPrintInvoice = async (r: InvoiceDto) => {
    try {
      const res = await printInvoice(r.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('In hóa đơn thất bại');
    }
  };

  const columns: ColumnDef<InvoiceDto>[] = [
    {
      key: 'code', label: 'Mã HĐ', mono: true, width: 150,
      render: (r) => (
        <span>
          {r.invoiceCode}
          {r.insuranceCardNumber && (
            <span style={{
              marginLeft: 'var(--space-6)', padding: '1px 5px',
              background: 'var(--a-cy-bg)', color: 'var(--a-cy)',
              border: '1px solid #67e8f9', borderRadius: 'var(--r-1)',
              fontSize: 9, fontWeight: 700,
            }}>BHYT {r.insuranceRate || 0}%</span>
          )}
        </span>
      ),
    },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode}{r.gender ? ` · ${r.gender}` : ''}</i>
        </div>
      ),
    },
    { key: 'mr', label: 'Hồ sơ', mono: true, width: 130, render: (r) => r.medicalRecordCode },
    {
      key: 'kind', label: 'Loại', width: 110,
      render: (r) => <span className="chip info">{r.patientTypeName || KIND_LABEL[r.patientType]}</span>,
    },
    { key: 'subTotal', label: 'Tổng', mono: true, width: 130, render: (r) => fmtVND(r.subTotal) },
    {
      key: 'bhyt', label: 'BHYT chi trả', mono: true, width: 130,
      render: (r) => r.insuranceAmount > 0
        ? <span style={{ color: 'var(--a-cy)' }}>{fmtVND(r.insuranceAmount)}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'patientPay', label: 'BN trả', mono: true, width: 130,
      render: (r) => <b>{fmtVND(r.totalAmount)}</b>,
    },
    {
      key: 'paid', label: 'Đã thu', mono: true, width: 130,
      render: (r) => r.paidAmount > 0 ? <span style={{ color: '#15803d' }}>{fmtVND(r.paidAmount)}</span> : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'remain', label: 'Còn lại', mono: true, width: 130,
      render: (r) => r.remainingAmount > 0 ? <span style={{ color: 'var(--s-warn)' }}>{fmtVND(r.remainingAmount)}</span> : '—',
    },
    {
      key: 'status', label: 'TT', width: 130,
      render: (r) => {
        const sk = statusKey(r.paymentStatus);
        return <StatusBadge tone={STATUS_TABS.find((t) => t.v === sk)?.tone} dot>{r.paymentStatusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <>
    <SimpleV2Page<InvoiceDto>
      title="Hóa đơn viện phí"
      load={async () => {
        // InvoiceSearchDto dùng `page` (1-based)
        const r = await searchInvoices({ page: 1, pageSize: 200 });
        return r.data?.items || [];
      }}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm BN / mã HĐ / hồ sơ…"
      searchOf={(r) => `${r.patientName} ${r.patientCode} ${r.invoiceCode} ${r.medicalRecordCode}`}
      statusTabs={STATUS_TABS as unknown as StatusTab<string>[]}
      statusOf={(r) => statusKey(r.paymentStatus)}
      filters={[{
        key: 'kind', placeholder: '▾ Loại HĐ',
        options: Object.entries(KIND_LABEL).map(([v, l]) => ({ v, l })),
        valueOf: (r) => String(r.patientType),
      }]}
      pageSize={18}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const todayCount = rows.filter((r) => dayjs(r.createdAt).isSame(today, 'day')).length;
        const pending = rows.filter((r) => r.paymentStatus === 0 || r.paymentStatus === 1).length;
        const paid = rows.filter((r) => r.paymentStatus === 2).length;
        const totalRevenue = rows.filter((r) => r.paymentStatus === 2).reduce((s, r) => s + r.paidAmount, 0);
        const totalBhyt = rows.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
        const totalDebt = rows.reduce((s, r) => s + (r.remainingAmount || 0), 0);
        return [
          { lbl: 'HĐ hôm nay', val: todayCount, sub: 'tạo mới' },
          { lbl: 'Chờ thu', val: pending, sub: 'công nợ', tone: 'warn' },
          { lbl: 'Đã thu', val: paid, sub: rows.length > 0 ? `${Math.round(paid / rows.length * 100)}%` : '—', tone: 'ok' },
          { lbl: 'Doanh thu', val: Math.round(totalRevenue / 1_000_000), unit: 'tr', sub: 'VND', tone: 'ok' },
          { lbl: 'BHYT', val: Math.round(totalBhyt / 1_000_000), unit: 'tr', sub: 'VND' },
          { lbl: 'Tổng nợ', val: Math.round(totalDebt / 1_000_000), unit: 'tr', sub: 'VND', tone: 'crit' },
        ];
      }}
      rowActions={(r, reload) => {
        reloadRef.current = reload;
        return (
          <div className="ab-actions">
            {(r.paymentStatus === 0 || r.paymentStatus === 1) && (
              <ActBtn ic="dollar" title="Thu tiền" onClick={() => setPayFor(r)} />
            )}
            {(r.paymentStatus === 0 || r.paymentStatus === 1) && r.totalAmount > 0 && (
              <ActBtn ic="receipt" title="Miễn giảm" onClick={() => setDiscountFor(r)} />
            )}
            <ActBtn ic="users" title="Sửa đối tượng" onClick={() => setReassignFor(r)} />
            <ActBtn ic="refresh" title="Hoàn trả chi tiết" onClick={() => setPartialRefundFor(r)} />
            <ActBtn ic="print" title="In HĐ" onClick={() => onPrintInvoice(r)} />
          </div>
        );
      }}
      drawer={(r) => <BillingDrawerBody r={r} />}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{r.invoiceCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.patientTypeName || '—'} · ${fmtDMY(r.createdAt)}`}
      toolbarRight={
        <Btn variant="primary" onClick={() => navigate('/v2/billing/edit')}>
          <TermIcon name="plus" size={12} /> Tạo HĐ
        </Btn>
      }
    />

    <PayModal
      invoice={payFor}
      onClose={() => setPayFor(null)}
      onDone={() => { setPayFor(null); reloadRef.current(); }}
    />

    {/* Đổi đối tượng thanh toán hàng loạt (patient-scoped) — port từ v1 Billing */}
    <ReassignObjectModal
      open={reassignFor !== null}
      onClose={() => setReassignFor(null)}
      patientId={reassignFor?.patientId ?? ''}
      patientName={reassignFor?.patientName}
      onSuccess={() => { reloadRef.current(); }}
    />

    {/* Miễn giảm viện phí (lý do chuẩn hóa + ngưỡng duyệt) — port từ v1 Billing */}
    <ApplyDiscountModal
      open={discountFor !== null}
      onClose={() => setDiscountFor(null)}
      invoiceId={discountFor?.id ?? ''}
      totalAmount={discountFor?.totalAmount ?? 0}
      patientName={discountFor?.patientName}
      onSuccess={() => { reloadRef.current(); }}
    />

    {/* Hoàn trả chi tiết (tick từng dòng, luật BHYT trong modal) — port từ v1 Billing */}
    <PartialRefundModal
      open={partialRefundFor !== null}
      onClose={() => setPartialRefundFor(null)}
      patientId={partialRefundFor?.patientId ?? ''}
      patientName={partialRefundFor?.patientName}
      onSuccess={() => { reloadRef.current(); }}
    />
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Payment modal — collect cash/card/transfer, calls createPayment.
   ────────────────────────────────────────────────────────── */

const PAY_METHODS = [
  { value: 1, label: 'Tiền mặt' },
  { value: 2, label: 'Thẻ' },
  { value: 3, label: 'Chuyển khoản' },
];

const PayModal: React.FC<{
  invoice: InvoiceDto | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ invoice, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const due = invoice ? (invoice.remainingAmount || invoice.totalAmount || 0) : 0;
  const [method, setMethod] = useState(1);
  const [amount, setAmount] = useState<number>(0);
  const [received, setReceived] = useState<number>(0);
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (invoice) {
      const d = invoice.remainingAmount || invoice.totalAmount || 0;
      setMethod(1); setAmount(d); setReceived(d); setRef(''); setNote('');
    }
  }, [invoice]);

  const submit = async () => {
    if (!invoice) return;
    if (!amount || amount <= 0) { message.warning('Nhập số tiền thu'); return; }
    setBusy(true);
    try {
      await createPayment({
        invoiceId: invoice.id,
        paymentMethod: method,
        amount,
        receivedAmount: received || amount,
        transactionNumber: method !== 1 ? ref || undefined : undefined,
        notes: note || undefined,
      });
      message.success(`Đã thu ${fmtVND(amount)} · ${invoice.invoiceCode}`);
      onDone();
    } catch {
      message.error('Thu tiền thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={!!invoice}
      onClose={onClose}
      size="md"
      title="Thu tiền hóa đơn"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang thu…' : 'Xác nhận thu'}
          </Btn>
        </>
      )}
    >
      {invoice && (
        <div style={{ padding: 'var(--space-16)' }}>
          <div style={{
            padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-14)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{invoice.patientName} · {invoice.patientCode}</span>
            <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{invoice.invoiceCode}</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>BN phải trả</span>
            <b className="mono">{fmtVND(invoice.totalAmount)}</b>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Còn lại</span>
            <b className="mono" style={{ color: 'var(--s-warn)' }}>{fmtVND(due)}</b>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Phương thức</div>
              <Select value={method} onChange={setMethod} options={PAY_METHODS} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Số tiền thu</div>
              <InputNumber
                value={amount}
                onChange={(v) => setAmount(Number(v) || 0)}
                min={0}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </div>
            {method === 1 && (
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Tiền khách đưa</div>
                <InputNumber
                  value={received}
                  onChange={(v) => setReceived(Number(v) || 0)}
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </div>
            )}
            {method !== 1 && (
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Mã giao dịch</div>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Mã ref NH / thẻ" />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Ghi chú</div>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" />
            </div>
          </div>
          {method === 1 && received > amount && (
            <div style={{ marginTop: 'var(--space-10)', fontSize: 'var(--fs-md)' }}>
              Tiền thối: <b className="mono" style={{ color: '#15803d' }}>{fmtVND(received - amount)}</b>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};

const BillingDrawerBody: React.FC<{ r: InvoiceDto }> = ({ r }) => (
  <>
    <div className="rec-section">
      <h5><TermIcon name="user" size={11} /> THÔNG TIN HÓA ĐƠN</h5>
      <div className="rec-kv">
        <span>Mã HĐ</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.invoiceCode}</span>
        <span>Bệnh nhân</span><b>{r.patientName} · {r.patientCode}</b>
        <span>Hồ sơ</span><span className="mono">{r.medicalRecordCode}</span>
        <span>Loại</span><span>{r.patientTypeName}</span>
        {r.departmentName && (<><span>Khoa</span><span>{r.departmentName}</span></>)}
        {r.insuranceCardNumber && (
          <>
            <span>Số BHYT</span><span className="mono">{r.insuranceCardNumber}</span>
            <span>Mức BHYT</span><span><span className="chip ok">{r.insuranceRate}%</span></span>
          </>
        )}
        <span>Ngày HĐ</span><span>{fmtDMY(r.createdAt)}</span>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="dollar" size={11} /> TỔNG HỢP CHI PHÍ</h5>
      <div className="rec-kv">
        <span>Tiền dịch vụ</span><span className="mono">{fmtVND(r.serviceTotal)}</span>
        <span>Tiền thuốc</span><span className="mono">{fmtVND(r.medicineTotal)}</span>
        <span>Vật tư</span><span className="mono">{fmtVND(r.supplyTotal)}</span>
        {r.bedTotal > 0 && (<><span>Tiền giường</span><span className="mono">{fmtVND(r.bedTotal)}</span></>)}
        <span>Tổng phụ</span><b className="mono">{fmtVND(r.subTotal)}</b>
        {r.insuranceAmount > 0 && (
          <><span>BHYT chi trả</span><b className="mono" style={{ color: 'var(--a-cy)' }}>−{fmtVND(r.insuranceAmount)}</b></>
        )}
        {r.discountAmount > 0 && (
          <><span>Giảm giá</span><span className="mono">−{fmtVND(r.discountAmount)}</span></>
        )}
        {r.surchargeAmount > 0 && (
          <><span>Phụ phí</span><span className="mono">+{fmtVND(r.surchargeAmount)}</span></>
        )}
        <span>BN phải trả</span><b className="mono" style={{ fontSize: 14 }}>{fmtVND(r.totalAmount)}</b>
      </div>
    </div>
    <div className="rec-section">
      <h5><TermIcon name="check" size={11} /> THANH TOÁN</h5>
      <div className="rec-kv">
        <span>Đã thu</span><b className="mono" style={{ color: '#15803d' }}>{fmtVND(r.paidAmount)}</b>
        <span>Còn lại</span>
        <b className="mono" style={{ color: r.remainingAmount > 0 ? 'var(--s-warn)' : '#15803d' }}>{fmtVND(r.remainingAmount)}</b>
        <span>Trạng thái TT</span>
        <span><span className={`chip ${r.paymentStatus === 2 ? 'ok' : 'warn'}`}>{r.paymentStatusName}</span></span>
        <span>Trạng thái duyệt</span>
        <span><span className={`chip ${r.approvalStatus === 1 ? 'ok' : 'warn'}`}>{r.approvalStatusName}</span></span>
        {r.isLocked && (<><span>Đã khóa</span><b style={{ color: 'var(--s-crit)' }}>{r.lockReason || 'Yes'}</b></>)}
      </div>
    </div>
    {r.serviceItems && r.serviceItems.length > 0 && (
      <div className="rec-section">
        <h5><TermIcon name="activity" size={11} /> DỊCH VỤ ({r.serviceItems.length})</h5>
        <div style={{ fontSize: 12.5 }}>
          {r.serviceItems.slice(0, 8).map((it) => (
            <div key={it.id} style={{
              padding: '8px 0', borderBottom: '1px solid var(--line-soft)',
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-10)', alignItems: 'center',
            }}>
              <div>
                <b style={{ color: 'var(--t-0)' }}>{it.serviceName}</b>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                  <span className="mono">{it.serviceCode}</span>
                  {it.serviceGroup && ` · ${it.serviceGroup}`}
                </div>
              </div>
              <span className="mono">{it.quantity}×</span>
              <b className="mono">{fmtVND(it.amount)}</b>
            </div>
          ))}
          {r.serviceItems.length > 8 && (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--t-2)', fontSize: 11.5 }}>
              … và {r.serviceItems.length - 8} dịch vụ khác
            </div>
          )}
        </div>
      </div>
    )}
  </>
);

/* ──────────────────────────────────────────────────────────
   #352: Tab Tạm ứng — admin GLOBAL (port v1 pages/Billing.tsx:357-400 fetchDeposits
   + 1204-1267 DepositsTab). Backend KHÔNG có endpoint deposits toàn viện →
   giữ đúng pattern v1: tìm BN theo keyword → gộp tạm ứng của từng BN.
   ────────────────────────────────────────────────────────── */

// DepositDto.status: 1-Chờ XN · 2-Đã XN · 3-Đã sử dụng · 4-Đã hoàn · 5-Đã hủy
const DEPOSIT_STATUS: Record<number, { l: string; tone: StatusTone }> = {
  1: { l: 'Chờ XN',      tone: 'warn' },
  2: { l: 'Đã XN',       tone: 'info' },
  3: { l: 'Đã sử dụng',  tone: 'ok'   },
  4: { l: 'Đã hoàn',     tone: 'warn' },
  5: { l: 'Đã hủy',      tone: 'crit' },
};

const DepositsPanel: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<DepositDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelFor, setCancelFor] = useState<DepositDto | null>(null);

  const doSearch = useCallback(async (kw: string) => {
    const k = kw.trim();
    if (!k) { setRows([]); setSearched(false); return; }
    setLoading(true);
    try {
      // v1: search BN trước → loop lấy tạm ứng từng BN rồi gộp
      const res = await searchPatients({ keyword: k, pageSize: 10 });
      const patients = res.data?.items || [];
      if (patients.length === 0) {
        tw('Không tìm thấy bệnh nhân');
        setRows([]); setSearched(true);
        return;
      }
      const all: DepositDto[] = [];
      for (const p of patients) {
        try {
          const dep = await getPatientDeposits(p.patientId);
          all.push(...(dep.data || []));
        } catch { /* BN chưa có tạm ứng — bỏ qua */ }
      }
      setRows(all); setSearched(true);
      if (all.length === 0) ti('Không tìm thấy tạm ứng cho bệnh nhân này');
    } catch {
      te('Không thể tải dữ liệu tạm ứng');
    } finally {
      setLoading(false);
    }
  }, []);

  const onPrint = async (r: DepositDto) => {
    try {
      const res = await printDepositReceipt(r.id);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { te('In phiếu tạm ứng thất bại'); }
  };

  const totalAmount = rows.reduce((s, d) => s + d.amount, 0);
  const totalRemain = rows.reduce((s, d) => s + d.remainingAmount, 0);

  const columns: ColumnDef<DepositDto>[] = [
    { key: 'code', label: 'Mã phiếu', mono: true, width: 130, render: (r) => r.receiptCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
      ),
    },
    { key: 'amount', label: 'Số tiền', mono: true, width: 120, render: (r) => fmtVND(r.amount) },
    {
      key: 'used', label: 'Đã dùng', mono: true, width: 120,
      render: (r) => r.usedAmount > 0 ? fmtVND(r.usedAmount) : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'remain', label: 'Còn lại', mono: true, width: 120,
      render: (r) => <b style={{ color: r.remainingAmount > 0 ? '#15803d' : 'var(--t-3)' }}>{fmtVND(r.remainingAmount)}</b>,
    },
    { key: 'type', label: 'Loại', width: 100, render: (r) => <span className="chip info">{r.depositTypeName}</span> },
    { key: 'source', label: 'Nguồn', width: 110, render: (r) => r.depositSourceName },
    { key: 'date', label: 'Ngày tạo', mono: true, width: 130, render: (r) => fmtDTg(r.createdAt) },
    {
      key: 'status', label: 'TT', width: 110,
      render: (r) => (
        <StatusBadge tone={DEPOSIT_STATUS[r.status]?.tone} dot>
          {r.statusName || DEPOSIT_STATUS[r.status]?.l || '—'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="ab">
      <div className="ab-tools">
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Nhập mã/tên BN rồi bấm Tìm…" />
        <Btn variant="primary" onClick={() => doSearch(keyword)} loading={loading}>
          <TermIcon name="search" size={12} /> Tìm
        </Btn>
        <span className="spacer" />
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Tổng tạm ứng <b className="mono" style={{ color: 'var(--t-0)' }}>{fmtVND(totalAmount)}</b>
          {' · '}Còn lại <b className="mono" style={{ color: '#15803d' }}>{fmtVND(totalRemain)}</b>
        </span>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <TermIcon name="plus" size={12} /> Tạo tạm ứng mới
        </Btn>
      </div>

      <DataTable<DepositDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty={searched ? 'Không có phiếu tạm ứng' : 'Nhập mã/tên BN để tìm tạm ứng'}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="print" title="In phiếu" onClick={() => onPrint(r)} />
            {/* Hủy chỉ khi chưa sử dụng/hoàn/hủy (status 1-Chờ XN, 2-Đã XN) */}
            {(r.status === 1 || r.status === 2) && (
              <ActBtn ic="x" title="Hủy phiếu" tone="crit" onClick={() => setCancelFor(r)} />
            )}
          </div>
        )}
      />

      <CreateDepositModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          tk('Tạo tạm ứng thành công');
          if (keyword.trim()) void doSearch(keyword); // reload theo keyword hiện tại
        }}
      />
      <CancelDepositModal
        deposit={cancelFor}
        onClose={() => setCancelFor(null)}
        onDone={() => {
          setCancelFor(null);
          if (keyword.trim()) void doSearch(keyword);
        }}
      />
    </div>
  );
};

/* #352: Modal tạo tạm ứng — v1 DepositModal (1269-1343) chỉ cho chọn phương thức;
   v2 expose đủ field CreateDepositDto bắt buộc: loại (depositType) + nguồn (depositSource). */

const DEPOSIT_TYPES = [
  { value: 1, label: 'Ngoại trú' },
  { value: 2, label: 'Nội trú' },
];
const DEPOSIT_SOURCES = [
  { value: 1, label: 'Thu ngân' },
  { value: 2, label: 'Khoa lâm sàng' },
];

const CreateDepositModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, onClose, onDone }) => {
  const [pkw, setPkw] = useState('');
  const [patients, setPatients] = useState<PatientBillingStatusDto[]>([]);
  const [patientId, setPatientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [depType, setDepType] = useState(1);
  const [depSource, setDepSource] = useState(1);
  const [method, setMethod] = useState(1);
  const [txnNo, setTxnNo] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) {
      setPkw(''); setPatients([]); setPatientId(''); setAmount(0);
      setDepType(1); setDepSource(1); setMethod(1); setTxnNo(''); setNote('');
    }
  }, [open]);

  const findPatients = async () => {
    const k = pkw.trim();
    if (!k) { tw('Nhập mã/tên BN để tìm'); return; }
    setSearching(true);
    try {
      const res = await searchPatients({ keyword: k, pageSize: 10 });
      const items = res.data?.items || [];
      setPatients(items);
      if (items.length === 0) tw('Không tìm thấy bệnh nhân');
      else setPatientId(items[0].patientId);
    } catch { te('Lỗi khi tìm kiếm bệnh nhân'); }
    finally { setSearching(false); }
  };

  const submit = async () => {
    if (!patientId) { tw('Chưa chọn bệnh nhân'); return; }
    if (!amount || amount <= 0) { tw('Số tiền tạm ứng phải lớn hơn 0'); return; }
    setBusy(true);
    try {
      await createDeposit({
        patientId,
        amount,
        depositType: depType,
        depositSource: depSource,
        paymentMethod: method,
        transactionNumber: method !== 1 ? txnNo.trim() || undefined : undefined,
        notes: note.trim() || undefined,
      });
      onDone();
    } catch { te('Tạo tạm ứng thất bại'); }
    finally { setBusy(false); }
  };

  const lblStyle: React.CSSProperties = {
    fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600,
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Tạo tạm ứng mới"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang tạo…' : 'Tạo tạm ứng'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)' }}>
        <div style={lblStyle}>Tìm bệnh nhân *</div>
        <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
          <Input
            value={pkw}
            onChange={(e) => setPkw(e.target.value)}
            onPressEnter={findPatients}
            placeholder="Mã BN, tên, SĐT…"
          />
          <Btn variant="ghost" onClick={findPatients} loading={searching}>
            <TermIcon name="search" size={12} /> Tìm
          </Btn>
        </div>
        {patients.length > 0 && (
          <div style={{ marginBottom: 'var(--space-12)' }}>
            <div style={lblStyle}>Bệnh nhân</div>
            <Select
              value={patientId || undefined}
              onChange={setPatientId}
              style={{ width: '100%' }}
              options={patients.map((p) => ({ value: p.patientId, label: `${p.patientCode} - ${p.patientName}` }))}
            />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <div>
            <div style={lblStyle}>Số tiền tạm ứng *</div>
            <InputNumber
              value={amount}
              onChange={(v) => setAmount(Number(v) || 0)}
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </div>
          <div>
            <div style={lblStyle}>Phương thức</div>
            <Select value={method} onChange={setMethod} options={PAY_METHODS} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={lblStyle}>Loại tạm ứng</div>
            <Select value={depType} onChange={setDepType} options={DEPOSIT_TYPES} style={{ width: '100%' }} />
          </div>
          <div>
            <div style={lblStyle}>Nguồn thu</div>
            <Select value={depSource} onChange={setDepSource} options={DEPOSIT_SOURCES} style={{ width: '100%' }} />
          </div>
          {method !== 1 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={lblStyle}>Mã giao dịch</div>
              <Input value={txnNo} onChange={(e) => setTxnNo(e.target.value)} placeholder="Mã ref NH / thẻ" />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={lblStyle}>Ghi chú</div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* #352: Modal hủy phiếu tạm ứng — bắt buộc lý do (cf của _v2kit không hỗ trợ input
   nên dùng ModalShell + TextArea). */
const CancelDepositModal: React.FC<{
  deposit: DepositDto | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ deposit, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => { if (deposit) setReason(''); }, [deposit]);

  const submit = async () => {
    if (!deposit) return;
    if (!reason.trim()) { tw('Cần nhập lý do hủy'); return; }
    setBusy(true);
    try {
      await cancelDeposit(deposit.id, reason.trim());
      tk('Đã hủy phiếu tạm ứng');
      onDone();
    } catch { te('Hủy phiếu tạm ứng thất bại'); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={!!deposit}
      onClose={onClose}
      size="sm"
      tone="danger"
      title="Hủy phiếu tạm ứng"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="x" size={12} /> {busy ? 'Đang hủy…' : 'Xác nhận hủy'}
          </Btn>
        </>
      )}
    >
      {deposit && (
        <div style={{ padding: 'var(--space-16)' }}>
          <div style={{ marginBottom: 'var(--space-10)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Phiếu <b className="mono">{deposit.receiptCode}</b> · {deposit.patientName}
            {' · '}<b className="mono">{fmtVND(deposit.amount)}</b>
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
            Lý do hủy *
          </div>
          <Input.TextArea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bắt buộc nhập lý do hủy phiếu"
          />
        </div>
      )}
    </ModalShell>
  );
};

/* ──────────────────────────────────────────────────────────
   #352: Tab Hoàn trả — danh sách GLOBAL read-only (v1 fetchRefunds 402-413).
   Duyệt/từ chối/xác nhận chi ĐÃ CÓ màn riêng /v2/refund-approval (RefundApproval.tsx)
   → ở đây chỉ điều hướng sang, KHÔNG đúp workflow duyệt.
   ────────────────────────────────────────────────────────── */

// Refund status (BillingCompleteService.Refunds.cs): 0-Chờ duyệt · 1-Đã duyệt · 2-Từ chối · 4-Đã chi
const REFUND_STATUS: Record<number, { l: string; tone: StatusTone }> = {
  0: { l: 'Chờ duyệt', tone: 'warn' },
  1: { l: 'Đã duyệt',  tone: 'info' },
  2: { l: 'Từ chối',   tone: 'crit' },
  4: { l: 'Đã chi',    tone: 'ok'   },
};

// Loader module-level để useListData không refetch-loop
const loadRefundsGlobal = async (): Promise<RefundDto[]> => {
  const r = await searchRefunds({ pageSize: 100 });
  return r.data?.items || [];
};
const onRefundsLoadError = () => te('Không thể tải dữ liệu hoàn tiền');

const RefundsPanel: React.FC = () => {
  const navigate = useNavigate();
  const { rows, loading, reload } = useListData<RefundDto>(loadRefundsGlobal, onRefundsLoadError);

  const totalRefund = rows.reduce((s, r) => s + r.refundAmount, 0);

  const columns: ColumnDef<RefundDto>[] = [
    { key: 'code', label: 'Mã phiếu', mono: true, width: 130, render: (r) => r.refundCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
      ),
    },
    { key: 'amount', label: 'Số tiền hoàn', mono: true, width: 130, render: (r) => <b>{fmtVND(r.refundAmount)}</b> },
    { key: 'type', label: 'Loại', width: 130, render: (r) => <span className="chip info">{r.refundTypeName}</span> },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason },
    { key: 'date', label: 'Ngày tạo', mono: true, width: 130, render: (r) => fmtDTg(r.createdAt) },
    {
      key: 'status', label: 'TT', width: 110,
      render: (r) => (
        <StatusBadge tone={REFUND_STATUS[r.status]?.tone} dot>
          {r.statusName || REFUND_STATUS[r.status]?.l || '—'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="ab">
      <div className="ab-tools">
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Tổng phiếu <b className="mono" style={{ color: 'var(--t-0)' }}>{rows.length}</b>
          {' · '}Tổng tiền hoàn <b className="mono" style={{ color: 'var(--s-warn)' }}>{fmtVND(totalRefund)}</b>
        </span>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload} loading={loading} icon="refresh">Làm mới</Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/refund-approval')}>
          Duyệt hoàn trả <TermIcon name="arrow-right" size={12} />
        </Btn>
      </div>

      <DataTable<RefundDto>
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty="Chưa có phiếu hoàn trả"
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   #352: Wrapper 3 tab — tab "Hóa đơn" giữ NGUYÊN VẸN SimpleV2Page cũ (InvoicesPanel);
   2 tab mới Tạm ứng / Hoàn trả port từ v1.
   ────────────────────────────────────────────────────────── */

type PageTab = 'invoices' | 'deposits' | 'refunds';
const PAGE_TABS: TopTab<PageTab>[] = [
  { v: 'invoices', l: 'Hóa đơn',  ic: 'receipt' },
  { v: 'deposits', l: 'Tạm ứng',  ic: 'cash' },
  { v: 'refunds',  l: 'Hoàn trả', ic: 'refresh' },
];

const BillingV2: React.FC = () => {
  const [tab, setTab] = useState<PageTab>('invoices');
  return (
    <div>
      <TopTabs<PageTab> tab={tab} setTab={setTab} tabs={PAGE_TABS} />
      <div style={{ paddingTop: 12 }}>
        {tab === 'invoices' && <InvoicesPanel />}
        {tab === 'deposits' && <DepositsPanel />}
        {tab === 'refunds' && <RefundsPanel />}
      </div>
    </div>
  );
};

export default BillingV2;
