/* =====================================================================
 * BillingEditor v2 — full-screen thu ngân (native v2, ab-* design)
 * Ported from design-system bundle mod-billing-editor-v2.jsx.
 * 3-col: Patient panel · main (5 tabs) · payment panel (pay tab).
 * Real API (billingApi): searchPatients, getUnpaidServices/Medicines,
 * getDepositBalance, getPaymentHistory, getPatientInvoice + createPayment,
 * getPatientDeposits, searchRefunds, getCashBooks, getElectronicInvoices.
 * Money-creating ops (new deposit/refund/e-invoice) are P2 (kept read-only
 * here to avoid bad data); payment is wired against the patient invoice.
 * Replaces the v1 navigate('/billing') jump.
 * ===================================================================== */

import React, { useState, useCallback } from 'react';
import {
  KpiStrip, StatusBadge, ActBtn, Btn, DataTable, TopTabs, ModalShell,
  fmtVNDg, fmtDTg, tk, tw, te, ti, type ColumnDef, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  searchPatients, type PatientBillingStatusDto,
  getUnpaidServices, type UnpaidServiceItemDto,
  getUnpaidMedicines, type UnpaidMedicineItemDto,
  getDepositBalance, type DepositBalanceDto,
  getPatientInvoice, createPayment,
  getPatientDeposits, createDeposit, type DepositDto,
  searchRefunds, createRefund, type RefundDto,
  getCashBooks, type CashBookDto,
  getElectronicInvoices, issueElectronicInvoice, type ElectronicInvoiceDto,
  printPaymentReceipt, printInvoice, sendElectronicInvoice,
} from '../api/billing';
import '../layouts/terminal/ed-responsive.css';

type TabKey = 'pay' | 'advance' | 'refund' | 'cashbook' | 'einv';
const TABS: TopTab<TabKey>[] = [
  { v: 'pay', l: 'Thanh toán', ic: 'dollar' },
  { v: 'advance', l: 'Tạm ứng', ic: 'card' },
  { v: 'refund', l: 'Hoàn tiền', ic: 'refresh' },
  { v: 'cashbook', l: 'Sổ tiền', ic: 'folder' },
  { v: 'einv', l: 'Hoá đơn điện tử', ic: 'file-text' },
];
const METHODS: { v: number; l: string; ic: string }[] = [
  { v: 1, l: 'Tiền mặt', ic: 'dollar' },
  { v: 2, l: 'Chuyển khoản', ic: 'send' },
  { v: 3, l: 'VietQR', ic: 'qr' },
];

interface PayRow { id: string; kind: 'service' | 'med'; code: string; name: string; qty: number; unitPrice: number; amount: number; patientAmount: number; }

const BillingEditorV2: React.FC = () => {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const [pt, setPt] = useState<PatientBillingStatusDto | null>(null);
  const [tab, setTab] = useState<TabKey>('pay');
  const [searchOpen, setSearchOpen] = useState(false);

  const [items, setItems] = useState<PayRow[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<DepositBalanceDto | null>(null);
  const [method, setMethod] = useState(1);
  const [useAdvance, setUseAdvance] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<ElectronicInvoiceDto | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [deposits, setDeposits] = useState<DepositDto[]>([]);
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [createModal, setCreateModal] = useState<null | 'deposit' | 'refund'>(null);
  const [cform, setCform] = useState<{ amount: string; method: number; reason: string }>({ amount: '', method: 1, reason: '' });
  const [savingC, setSavingC] = useState(false);
  const [einvOpen, setEinvOpen] = useState(false);
  const [einvForm, setEinvForm] = useState<{ buyerName: string; buyerEmail: string; sendEmail: boolean }>({ buyerName: '', buyerEmail: '', sendEmail: false });
  const [savingEinv, setSavingEinv] = useState(false);
  const [cashbooks, setCashbooks] = useState<CashBookDto[]>([]);
  const [einvoices, setEinvoices] = useState<ElectronicInvoiceDto[]>([]);

  // ── Select patient → load unpaid items + balance ─────────────────
  const selectPatient = useCallback(async (p: PatientBillingStatusDto) => {
    setPt(p);
    setSearchOpen(false);
    setItems([]); setSel(new Set()); setBalance(null);
    setDeposits([]); setRefunds([]); setEinvoices([]);
    setLastPaymentId(null);
    const [svc, med, bal] = await Promise.allSettled([
      getUnpaidServices(p.patientId),
      getUnpaidMedicines(p.patientId),
      getDepositBalance(p.patientId),
    ]);
    const rows: PayRow[] = [];
    if (svc.status === 'fulfilled' && Array.isArray(svc.value.data)) {
      (svc.value.data as UnpaidServiceItemDto[]).forEach((s) => rows.push({ id: `S-${s.id}`, kind: 'service', code: s.serviceCode, name: s.serviceName, qty: s.quantity, unitPrice: s.unitPrice, amount: s.amount, patientAmount: s.patientAmount ?? s.amount }));
    }
    if (med.status === 'fulfilled' && Array.isArray(med.value.data)) {
      (med.value.data as UnpaidMedicineItemDto[]).forEach((m) => rows.push({ id: `M-${m.id}`, kind: 'med', code: m.medicineCode, name: m.medicineName, qty: m.quantity, unitPrice: m.unitPrice, amount: m.amount, patientAmount: m.amount }));
    }
    setItems(rows);
    setSel(new Set(rows.map((r) => r.id)));
    if (bal.status === 'fulfilled' && bal.value.data) setBalance(bal.value.data);
    // lazy-load other tabs
    getPatientDeposits(p.patientId).then((r) => setDeposits(Array.isArray(r.data) ? r.data : [])).catch((e) => { console.warn('[async] tải dữ liệu phụ thất bại:', e); });
  }, []);

  // ── Tab data (lazy) ──────────────────────────────────────────────
  const ensureTab = useCallback(async (t: TabKey) => {
    setTab(t);
    try {
      if (t === 'refund' && refunds.length === 0) {
        const r = await searchRefunds({ patientId: pt?.patientId, page: 1, pageSize: 50 });
        setRefunds(r.data?.items || []);
      } else if (t === 'cashbook' && cashbooks.length === 0) {
        const r = await getCashBooks();
        setCashbooks(Array.isArray(r.data) ? r.data : []);
      } else if (t === 'einv' && einvoices.length === 0) {
        const r = await getElectronicInvoices();
        setEinvoices(Array.isArray(r.data) ? r.data : []);
      }
    } catch { /* keep empty */ }
  }, [pt, refunds.length, cashbooks.length, einvoices.length]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((s) => (s.size === items.length ? new Set() : new Set(items.map((x) => x.id))));

  const selectedItems = items.filter((it) => sel.has(it.id));
  const subtotal = selectedItems.reduce((s, it) => s + it.amount, 0);
  const coPay = selectedItems.reduce((s, it) => s + it.patientAmount, 0);
  const bhytCovered = subtotal - coPay;
  const advBalance = balance?.remainingBalance ?? 0;
  const advUsed = useAdvance ? Math.min(advBalance, coPay) : 0;
  const finalAmount = Math.max(0, coPay - advUsed);

  const doPayment = async () => {
    if (!pt) return;
    setBusy(true);
    try {
      const inv = await getPatientInvoice(pt.medicalRecordId);
      const invoiceId = inv.data?.id;
      if (!invoiceId) { tw('Bệnh nhân chưa có hoá đơn — tạo hoá đơn ở bản v1 (P2)'); setBusy(false); return; }
      const payRes = await createPayment({
        invoiceId,
        paymentMethod: method,
        amount: finalAmount,
        receivedAmount: finalAmount,
        depositUsedAmount: advUsed || undefined,
        notes: `Thu ${selectedItems.length} mục qua editor v2`,
      });
      const newPaymentId: string | undefined = payRes?.data?.id;
      if (newPaymentId) setLastPaymentId(newPaymentId);
      setConfirmOpen(false);
      tk(`✓ Đã thu ${fmtVNDg(finalAmount)} · ${METHODS.find((m) => m.v === method)?.l}`);
      // refresh unpaid items
      selectPatient(pt);
    } catch { te('Thu tiền thất bại'); }
    finally { setBusy(false); }
  };

  const openCreate = (kind: 'deposit' | 'refund') => {
    if (!pt) { tw('Chưa chọn bệnh nhân'); return; }
    setCform({ amount: '', method: 1, reason: '' });
    setCreateModal(kind);
  };
  const saveCreate = async () => {
    if (!pt) return;
    const amt = Number(cform.amount);
    if (!amt || amt <= 0) { tw('Nhập số tiền hợp lệ'); return; }
    setSavingC(true);
    try {
      if (createModal === 'deposit') {
        await createDeposit({ patientId: pt.patientId, medicalRecordId: pt.medicalRecordId, depositType: 1, depositSource: 1, amount: amt, paymentMethod: cform.method, notes: cform.reason || undefined });
        const [d, b] = await Promise.allSettled([getPatientDeposits(pt.patientId), getDepositBalance(pt.patientId)]);
        if (d.status === 'fulfilled') setDeposits(Array.isArray(d.value.data) ? d.value.data : []);
        if (b.status === 'fulfilled' && b.value.data) setBalance(b.value.data);
        tk(`Đã tạo tạm ứng ${fmtVNDg(amt)}`);
      } else if (createModal === 'refund') {
        if (!cform.reason.trim()) { tw('Nhập lý do hoàn tiền'); setSavingC(false); return; }
        await createRefund({ patientId: pt.patientId, refundType: 1, refundAmount: amt, refundMethod: cform.method, reason: cform.reason });
        const r = await searchRefunds({ patientId: pt.patientId, page: 1, pageSize: 50 });
        setRefunds(r.data?.items || []);
        tk(`Đã lập phiếu hoàn tiền ${fmtVNDg(amt)}`);
      }
      setCreateModal(null);
    } catch { te('Tạo phiếu thất bại'); }
    finally { setSavingC(false); }
  };

  const doPrintReceipt = async () => {
    if (!lastPaymentId) { tw('Chưa có biên lai — vui lòng thu tiền trước'); return; }
    setPrintingReceipt(true);
    try {
      const res = await printPaymentReceipt(lastPaymentId);
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { te('Không thể in biên lai'); }
    finally { setPrintingReceipt(false); }
  };

  const doPrintInvoice = async (einv: ElectronicInvoiceDto) => {
    try {
      const res = await printInvoice(einv.invoiceId);
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { te('Không thể in hóa đơn'); }
  };

  const openSendEmail = (einv: ElectronicInvoiceDto) => {
    setEmailTarget(einv);
    setEmailInput(einv.buyerEmail || einv.sentTo || '');
    setEmailModalOpen(true);
  };

  const doSendEmail = async () => {
    if (!emailTarget) return;
    if (!emailInput.trim()) { tw('Nhập địa chỉ email'); return; }
    setSendingEmail(true);
    try {
      await sendElectronicInvoice(emailTarget.id, emailInput.trim());
      tk(`Đã gửi HĐĐT đến ${emailInput.trim()}`);
      setEmailModalOpen(false);
    } catch { te('Gửi email thất bại'); }
    finally { setSendingEmail(false); }
  };

  const openEinv = () => {
    if (!pt) { tw('Chưa chọn bệnh nhân'); return; }
    setEinvForm({ buyerName: pt.patientName, buyerEmail: '', sendEmail: false });
    setEinvOpen(true);
  };
  const issueEinv = async () => {
    if (!pt) return;
    setSavingEinv(true);
    try {
      const inv = await getPatientInvoice(pt.medicalRecordId);
      const invoiceId = inv.data?.id;
      if (!invoiceId) { tw('Bệnh nhân chưa có hoá đơn để phát hành'); setSavingEinv(false); return; }
      await issueElectronicInvoice({ invoiceId, buyerName: einvForm.buyerName || undefined, buyerEmail: einvForm.buyerEmail || undefined, sendEmail: einvForm.sendEmail });
      const r = await getElectronicInvoices();
      setEinvoices(Array.isArray(r.data) ? r.data : []);
      setEinvOpen(false);
      tk('Đã tạo nháp hoá đơn điện tử — bấm Xuất để phát hành qua nhà cung cấp');
    } catch { te('Phát hành HĐĐT thất bại'); }
    finally { setSavingEinv(false); }
  };

  // ── Columns for read-only tabs ───────────────────────────────────
  const depositCols: ColumnDef<DepositDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 130, render: (r) => r.receiptCode },
    { key: 'type', label: 'Loại', width: 120, render: (r) => r.depositTypeName },
    { key: 'amount', label: 'Số tiền', mono: true, width: 130, render: (r) => fmtVNDg(r.amount) },
    { key: 'remain', label: 'Còn lại', mono: true, width: 130, render: (r) => fmtVNDg(r.remainingAmount) },
    { key: 'cashier', label: 'Thu ngân', render: (r) => r.cashierName || '—' },
  ];
  const refundCols: ColumnDef<RefundDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 130, render: (r) => r.refundCode },
    { key: 'type', label: 'Loại', width: 140, render: (r) => r.refundTypeName },
    { key: 'amount', label: 'Số tiền', mono: true, width: 130, render: (r) => fmtVNDg(r.refundAmount) },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason },
    { key: 'status', label: 'TT', width: 120, render: (r) => <StatusBadge tone={r.status === 2 ? 'ok' : 'warn'} dot>{r.status === 2 ? 'Đã hoàn' : 'Chờ duyệt'}</StatusBadge> },
  ];
  const cashbookCols: ColumnDef<CashBookDto>[] = [
    { key: 'code', label: 'Mã sổ', mono: true, code: true, width: 130, render: (r) => r.code },
    { key: 'name', label: 'Tên sổ', render: (r) => r.name },
    { key: 'type', label: 'Loại', width: 110, render: (r) => r.bookTypeName },
    { key: 'balance', label: 'Số dư', mono: true, width: 140, render: (r) => fmtVNDg(r.currentBalance) },
    { key: 'status', label: 'TT', width: 110, render: (r) => <StatusBadge tone={r.status === 1 ? 'ok' : r.status === 2 ? 'warn' : 'info'} dot>{r.statusName}</StatusBadge> },
  ];
  const einvCols: ColumnDef<ElectronicInvoiceDto>[] = [
    { key: 'no', label: 'Số HĐ', mono: true, code: true, width: 150, render: (r) => r.eInvoiceNumber || r.invoiceCode },
    { key: 'date', label: 'Ngày', mono: true, width: 150, render: (r) => fmtDTg(r.eInvoiceDate) },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName || r.buyerName || '—' },
    { key: 'amount', label: 'Số tiền', mono: true, width: 130, render: (r) => fmtVNDg(r.totalAmount) },
    { key: 'status', label: 'TT', width: 130, render: (r) => <StatusBadge tone={r.status === 1 ? 'ok' : r.status === 0 ? 'warn' : 'crit'} dot>{r.status === 1 ? 'Đã phát hành' : r.status === 0 ? 'Nháp' : 'Đã huỷ'}</StatusBadge> },
  ];

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: tab === 'pay' ? '280px 1fr 340px' : '280px 1fr', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'BN đang thu', val: pt?.patientName || '—', sub: pt?.patientCode || 'Chưa chọn' },
          { lbl: 'Mục chờ thu', val: items.length, tone: 'warn', sub: fmtVNDg(items.reduce((s, x) => s + x.patientAmount, 0)) },
          { lbl: 'BN phải trả (chọn)', val: fmtVNDg(coPay), tone: 'info' },
          { lbl: 'Số dư tạm ứng', val: fmtVNDg(advBalance), tone: 'ok' },
          { lbl: 'Trạng thái HS', val: pt?.paymentStatusName || '—' },
        ]} />
      </div>

      {/* Patient panel */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', padding: 'var(--space-12)', background: 'var(--d-1)', overflow: 'auto' }}>
        <Btn variant="ghost" size="sm" style={{ width: '100%', marginBottom: 'var(--space-10)', justifyContent: 'center' }} onClick={() => setSearchOpen(true)}><TermIcon name="search" size={11} /> Tìm bệnh nhân</Btn>
        {!pt ? (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--t-3)' }}>
            <TermIcon name="user" size={28} />
            <div style={{ marginTop: 'var(--space-10)', fontSize: 11.5 }}>Tìm BN để bắt đầu thu</div>
          </div>
        ) : (
          <>
            <div style={{ padding: 'var(--space-12)', background: 'var(--d-0)', borderRadius: 'var(--r-3)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{pt.patientName}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', marginTop: 'var(--space-4)' }}>{pt.patientCode} · {pt.medicalRecordCode}</div>
              <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 4, fontSize: 'var(--fs-xs)' }}>
                <div><span className="ab-u-muted">Trạng thái: </span>{pt.paymentStatusName}</div>
                <div style={{ marginTop: 'var(--space-4)' }}><span className="ab-u-muted">Số dư tạm ứng: </span><b className="mono" style={{ color: 'var(--s-ok)' }}>{fmtVNDg(advBalance)}</b></div>
                <div style={{ marginTop: 'var(--space-4)' }}><span className="ab-u-muted">Tổng viện phí: </span><b className="mono">{fmtVNDg(pt.totalAmount)}</b></div>
              </div>
            </div>
            {deposits.length > 0 && (
              <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-6)' }}>Tạm ứng</div>
                {deposits.slice(0, 5).map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 11.5 }}>
                    <span className="mono ab-u-muted">{d.receiptCode}</span>
                    <b className="mono">{fmtVNDg(d.remainingAmount)}</b>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {/* Main */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TopTabs tab={tab} setTab={(t) => ensureTab(t)} tabs={TABS} />
        <div style={{ overflow: 'auto', flex: 1, padding: 'var(--space-14)' }}>
          {!pt && tab === 'pay' && <div style={{ color: 'var(--t-3)', textAlign: 'center', padding: 'var(--space-40)' }}>Chọn bệnh nhân để xem các mục chờ thu</div>}

          {tab === 'pay' && pt && (
            <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', overflow: 'hidden' }}>
              <table className="ab-tbl" style={{ fontSize: 'var(--fs-sm)' }}>
                <thead><tr>
                  <th style={{ width: 36 }}><input type="checkbox" checked={sel.size === items.length && items.length > 0} onChange={toggleAll} /></th>
                  <th style={{ width: 90 }}>Loại</th>
                  <th>Dịch vụ / Thuốc</th>
                  <th style={{ width: 70 }}>SL</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ width: 120, textAlign: 'right' }}>BN trả</th>
                </tr></thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--t-3)' }}>Không có mục chờ thu</td></tr>}
                  {items.map((it) => (
                    <tr key={it.id} className={sel.has(it.id) ? 'on' : ''}>
                      <td><input type="checkbox" checked={sel.has(it.id)} onChange={() => toggle(it.id)} /></td>
                      <td>{it.kind === 'service' ? <StatusBadge tone="info">Dịch vụ</StatusBadge> : <StatusBadge tone="ok">Thuốc</StatusBadge>}</td>
                      <td><div style={{ fontWeight: 600 }}>{it.name}</div><div style={{ fontSize: 10.5, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{it.code}</div></td>
                      <td className="mono">{it.qty}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(it.unitPrice)}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(it.amount)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVNDg(it.patientAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'advance' && (
            <div>
              <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('deposit')}><TermIcon name="plus" size={12} /> Tạo tạm ứng</Btn></div>
              <DataTable<DepositDto> columns={depositCols} data={deposits} rowKey={(r) => r.id} empty={pt ? 'Chưa có tạm ứng' : 'Chọn bệnh nhân'} />
            </div>
          )}
          {tab === 'refund' && (
            <div>
              <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={() => openCreate('refund')}><TermIcon name="plus" size={12} /> Lập phiếu hoàn tiền</Btn></div>
              <DataTable<RefundDto> columns={refundCols} data={refunds} rowKey={(r) => r.id} empty="Chưa có phiếu hoàn tiền" />
            </div>
          )}
          {tab === 'cashbook' && (
            <DataTable<CashBookDto> columns={cashbookCols} data={cashbooks} rowKey={(r) => r.id} empty="Chưa có sổ tiền" />
          )}
          {tab === 'einv' && (
            <div>
              <div style={{ marginBottom: 'var(--space-12)' }}><Btn variant="primary" onClick={openEinv}><TermIcon name="plus" size={12} /> Phát hành HĐĐT</Btn></div>
              <DataTable<ElectronicInvoiceDto> columns={einvCols} data={einvoices} rowKey={(r) => r.id} empty="Chưa có hoá đơn điện tử"
                actions={(r) => <><ActBtn ic="send" title="Gửi email" onClick={() => openSendEmail(r)} /><ActBtn ic="print" title="In" onClick={() => doPrintInvoice(r)} /></>} />
            </div>
          )}
        </div>
      </main>

      {/* Payment panel (pay tab only) */}
      {tab === 'pay' && (
        <aside className={'ed-right-panel ' + (rightOpen ? 'is-open' : '')} style={{ borderLeft: '1px solid var(--line)', padding: 'var(--space-14)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', overflow: 'auto' }}>
          <div style={{ padding: 'var(--space-14)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Tóm tắt thanh toán</h4>
            <div style={{ display: 'grid', gap: 'var(--space-6)', fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">Tổng tiền chọn</span><b className="mono">{fmtVNDg(subtotal)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">BHYT chi trả</span><b className="mono" style={{ color: 'var(--s-ok)' }}>−{fmtVNDg(bhytCovered)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-6)', borderTop: '1px dashed var(--line)', marginTop: 'var(--space-4)' }}><span className="ab-u-muted">BN đồng chi trả</span><b className="mono">{fmtVNDg(coPay)}</b></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: '6px 0', fontSize: 11.5, color: 'var(--t-2)' }}>
                <input type="checkbox" checked={useAdvance} onChange={(e) => setUseAdvance(e.target.checked)} disabled={advBalance <= 0} />
                Dùng tạm ứng <span className="mono ab-u-fg">−{fmtVNDg(advUsed)}</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-10)', borderTop: '2px solid var(--line)', marginTop: 'var(--space-4)' }}><b style={{ fontSize: 'var(--fs-md)' }}>BN phải trả</b><b className="mono" style={{ fontSize: 'var(--fs-lg)', color: 'var(--a-cy)' }}>{fmtVNDg(finalAmount)}</b></div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-6)' }}>Phương thức TT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              {METHODS.map((m) => (
                <button key={m.v} onClick={() => setMethod(m.v)} style={{ padding: '10px 6px', background: method === m.v ? 'var(--a-cy)' : 'var(--d-0)', color: method === m.v ? '#fff' : 'var(--t-1)', border: method === m.v ? '1px solid var(--a-cy)' : '1px solid var(--line)', borderRadius: 'var(--r-2)', cursor: 'pointer', fontSize: 11.5, fontWeight: method === m.v ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <TermIcon name={m.ic} size={16} />{m.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
            <Btn variant="primary" style={{ height: 40, fontSize: 'var(--fs-md)' }} onClick={() => setConfirmOpen(true)} disabled={selectedItems.length === 0 || busy}>
              <TermIcon name="check" size={13} /> Thu tiền · {fmtVNDg(finalAmount)}
            </Btn>
            <Btn variant="ghost" onClick={doPrintReceipt} disabled={printingReceipt || !lastPaymentId}><TermIcon name="print" size={12} /> In biên lai</Btn>
          </div>
        </aside>
      )}

      {/* Responsive toggles */}
      {(leftOpen || rightOpen) && <div className="ed-panel-backdrop" onClick={closeAll} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Bệnh nhân"><TermIcon name="user" size={18} /></button>
        {tab === 'pay' && <button className="ed-panel-toggle" onClick={() => setRightOpen((o) => !o)} title="Thanh toán" style={{ background: 'var(--s-warn)' }}><TermIcon name="dollar" size={18} /></button>}
      </div>

      {/* Patient search modal */}
      <BillingPatientSearch open={searchOpen} onClose={() => setSearchOpen(false)} onPick={selectPatient} />

      {/* Confirm payment modal */}
      <ModalShell open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Xác nhận thu tiền" sub={METHODS.find((m) => m.v === method)?.l} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirmOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={doPayment}><TermIcon name="check" size={12} /> Xác nhận đã thu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-24)', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--t-2)', marginBottom: 'var(--space-6)' }}>BN cần trả</div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--a-cy)', marginBottom: 'var(--space-14)' }}>{fmtVNDg(finalAmount)}</div>
          {method === 3 && <div style={{ width: 160, height: 160, margin: '0 auto', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', background: 'repeating-conic-gradient(#000 0% 25%, var(--d-2) 0% 50%) 50%/12px 12px' }} />}
          <div style={{ marginTop: 'var(--space-14)', padding: 'var(--space-10)', background: 'var(--d-1)', borderRadius: 4, fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            {selectedItems.length} mục · {METHODS.find((m) => m.v === method)?.l}{advUsed > 0 ? ` · dùng tạm ứng ${fmtVNDg(advUsed)}` : ''}
          </div>
        </div>
      </ModalShell>

      {/* Create deposit / refund modal */}
      <ModalShell open={createModal !== null} onClose={() => setCreateModal(null)}
        title={createModal === 'deposit' ? 'Tạo tạm ứng' : 'Lập phiếu hoàn tiền'} sub={pt?.patientName} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateModal(null)}>Hủy</Btn>
          <Btn variant="primary" disabled={savingC} onClick={saveCreate}><TermIcon name="check" size={12} /> Lưu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Số tiền</span>
            <input type="number" className="ed-fld mono" style={{ textAlign: 'right', fontSize: 16 }} value={cform.amount} onChange={(e) => setCform((p) => ({ ...p, amount: e.target.value }))} placeholder="0" autoFocus />
          </label>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>{createModal === 'deposit' ? 'Phương thức nộp' : 'Phương thức hoàn'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              {METHODS.map((m) => (
                <button key={m.v} onClick={() => setCform((p) => ({ ...p, method: m.v }))} style={{ padding: '8px 6px', background: cform.method === m.v ? 'var(--a-cy)' : 'var(--d-0)', color: cform.method === m.v ? '#fff' : 'var(--t-1)', border: cform.method === m.v ? '1px solid var(--a-cy)' : '1px solid var(--line)', borderRadius: 'var(--r-2)', cursor: 'pointer', fontSize: 11.5 }}>{m.l}</button>
              ))}
            </div>
          </div>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>{createModal === 'refund' ? 'Lý do hoàn (bắt buộc)' : 'Ghi chú'}</span>
            <textarea className="ed-fld" rows={2} value={cform.reason} onChange={(e) => setCform((p) => ({ ...p, reason: e.target.value }))} />
          </label>
        </div>
      </ModalShell>

      {/* Send e-invoice email modal */}
      <ModalShell open={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Gửi hoá đơn điện tử qua email" sub={emailTarget?.eInvoiceNumber || emailTarget?.invoiceCode} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setEmailModalOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={sendingEmail} onClick={doSendEmail}><TermIcon name="send" size={12} /> Gửi</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)' }}>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Địa chỉ email nhận</span>
            <input
              type="email"
              className="ed-fld"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="vd: benhnhan@email.com"
              autoFocus
            />
          </label>
        </div>
      </ModalShell>

      {/* Issue e-invoice modal */}
      <ModalShell open={einvOpen} onClose={() => setEinvOpen(false)} title="Phát hành hoá đơn điện tử" sub={pt?.patientName} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setEinvOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={savingEinv} onClick={issueEinv}><TermIcon name="check" size={12} /> Phát hành</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Tên người mua</span>
            <input className="ed-fld" value={einvForm.buyerName} onChange={(e) => setEinvForm((p) => ({ ...p, buyerName: e.target.value }))} />
          </label>
          <label style={{ display: 'block', fontSize: 11.5 }}>
            <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 'var(--space-3)' }}>Email nhận hoá đơn</span>
            <input type="email" className="ed-fld" value={einvForm.buyerEmail} onChange={(e) => setEinvForm((p) => ({ ...p, buyerEmail: e.target.value }))} placeholder="vd: benhnhan@email.com" />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 'var(--fs-sm)' }}>
            <input type="checkbox" checked={einvForm.sendEmail} onChange={(e) => setEinvForm((p) => ({ ...p, sendEmail: e.target.checked }))} />
            Gửi hoá đơn qua email sau khi phát hành
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

// ── Billing patient search modal ──────────────────────────────────
const BillingPatientSearch: React.FC<{ open: boolean; onClose: () => void; onPick: (p: PatientBillingStatusDto) => void }> = ({ open, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [list, setList] = useState<PatientBillingStatusDto[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (kw: string) => {
    setQ(kw);
    if (!kw || kw.length < 2) { setList([]); return; }
    setLoading(true);
    try {
      const r = await searchPatients({ keyword: kw, page: 1, pageSize: 15 });
      setList(r.data?.items || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Tìm bệnh nhân" sub="Tên · Mã · Mã hồ sơ" size="md"
      footer={<Btn variant="ghost" onClick={onClose}>Đóng</Btn>}>
      <div style={{ padding: 'var(--space-16)' }}>
        <div className="ab-search ab-u-wfull">
          <TermIcon name="search" size={13} />
          <input value={q} onChange={(e) => run(e.target.value)} placeholder="Gõ ≥2 ký tự…" autoFocus />
        </div>
        <div style={{ marginTop: 'var(--space-12)', maxHeight: 360, overflow: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-3)' }}>Đang tìm…</div>}
          {!loading && q.length >= 2 && list.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-3)' }}>Không tìm thấy</div>}
          {list.map((p) => (
            <div key={p.medicalRecordId} onClick={() => onPick(p)} style={{ padding: 'var(--space-10)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-6)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{p.patientName}</b>
                <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{p.patientCode}</span>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>{p.medicalRecordCode} · {p.paymentStatusName} · {fmtVNDg(p.totalAmount)}</div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

export default BillingEditorV2;
