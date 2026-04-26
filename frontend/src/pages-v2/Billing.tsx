import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as billingApi from '../api/billing';
import type { InvoiceDto } from '../api/billing';
import './Billing.css';

const PAY_STATUS_LABEL: Record<number, string> = {
  0: 'CHƯA TT',
  1: 'ĐÃ TT',
  2: 'QUYẾT TOÁN',
  3: 'ĐÃ HỦY',
};

const APPROVAL_LABEL: Record<number, string> = {
  0: 'CHỜ DUYỆT',
  1: 'ĐÃ DUYỆT',
  2: 'TẠM KHÓA',
};

const BillingV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sel, setSel]           = useState<string>('');
  const [tab, setTab]           = useState<'all' | 'unpaid' | 'paid' | 'pending-approval'>('all');
  const [search, setSearch]     = useState('');
  const [pay, setPay]           = useState<'cash' | 'bank' | 'qr' | 'ewallet'>('bank');
  const [detail, setDetail]     = useState<InvoiceDto | null>(null);

  // Load last 30 days of invoices
  const reload = () => {
    setLoading(true);
    billingApi.searchInvoices({
      fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      toDate: dayjs().format('YYYY-MM-DD'),
      page: 1,
      pageSize: 200,
    })
      .then((r) => {
        const data = r.data;
        const items = Array.isArray(data?.items) ? data.items : [];
        setInvoices(items);
        if (items.length > 0 && !sel) setSel(items[0].id);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  // Fetch full detail (with line items) when selection changes
  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    const stub = invoices.find((i) => i.id === sel);
    setDetail(stub || null);
    // get full breakdown via per-record endpoint if available
    if (stub?.medicalRecordId) {
      billingApi.getPatientInvoice(stub.medicalRecordId)
        .then((r) => { if (r.data) setDetail(r.data); })
        .catch(() => {});
    }
  }, [sel, invoices]);

  const counts = useMemo(() => ({
    all: invoices.length,
    unpaid: invoices.filter((i) => i.paymentStatus === 0).length,
    paid:   invoices.filter((i) => i.paymentStatus === 1 || i.paymentStatus === 2).length,
    pendingApproval: invoices.filter((i) => i.approvalStatus === 0).length,
  }), [invoices]);

  const filtered = useMemo(() => {
    let src = invoices;
    if (tab === 'unpaid')           src = src.filter((i) => i.paymentStatus === 0);
    else if (tab === 'paid')        src = src.filter((i) => i.paymentStatus === 1 || i.paymentStatus === 2);
    else if (tab === 'pending-approval') src = src.filter((i) => i.approvalStatus === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      src = src.filter((i) =>
        i.invoiceCode.toLowerCase().includes(q)
        || i.patientName.toLowerCase().includes(q)
        || i.patientCode.toLowerCase().includes(q),
      );
    }
    return src;
  }, [invoices, tab, search]);

  // KPIs
  const todayInvoices = invoices.filter((i) => dayjs(i.createdAt).isSame(dayjs(), 'day'));
  const todayRevenue  = todayInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const todayBhyt     = todayInvoices.reduce((s, i) => s + (i.insuranceAmount || 0), 0);
  const todayPending  = invoices.filter((i) => i.paymentStatus === 0).reduce((s, i) => s + (i.remainingAmount || 0), 0);
  const debtAmount    = invoices.filter((i) => i.paymentStatus === 0 && (i.remainingAmount || 0) > 0).reduce((s, i) => s + (i.remainingAmount || 0), 0);

  const inv = detail;
  const total   = inv?.totalAmount ?? 0;
  const bhytAmt = inv?.insuranceAmount ?? 0;
  const payAmt  = inv?.remainingAmount ?? Math.max(0, total - bhytAmt);

  const fmt = (n: number) => n.toLocaleString('vi-VN');

  const handlePayment = async () => {
    if (!inv) return;
    try {
      await billingApi.createPayment({
        invoiceId: inv.id,
        amount: payAmt,
        receivedAmount: payAmt,
        paymentMethod: pay === 'cash' ? 1 : pay === 'bank' ? 2 : pay === 'qr' ? 3 : 4,
      });
      message.success(`✓ Đã thu ${fmt(payAmt)}₫ · ${inv.invoiceCode}`);
      reload();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Không thể thu tiền');
    }
  };

  return (
    <div className="bill-wrap">
      {/* ====== TOP KPIs ====== */}
      <div className="bill-top">
        <BKpi l="Hoá đơn hôm nay" v={todayInvoices.length} sub={`${fmt(invoices.length)} 30 ngày`} />
        <BKpi l="Doanh thu hôm nay" v={<>{fmt(Math.round(todayRevenue / 1_000_000))}<small>M₫</small></>} sub={`${fmt(Math.round(todayRevenue / 1000))}k`} />
        <BKpi l="BHYT chi trả" v={<>{fmt(Math.round(todayBhyt / 1_000_000))}<small>M₫</small></>} sub={todayRevenue > 0 ? `${Math.round((todayBhyt / todayRevenue) * 100)}%` : '—'} />
        <BKpi l="Chờ thanh toán" v={<span style={{ color: 'var(--s-warn)' }}>{counts.unpaid}</span>} sub={`${fmt(Math.round(todayPending / 1_000_000))}M₫`} subCrit={counts.unpaid > 0} />
        <BKpi l="Chờ duyệt KT" v={counts.pendingApproval} sub="HS" />
        <BKpi l="Công nợ BN" v={<>{fmt(Math.round(debtAmount / 1_000_000))}<small>M₫</small></>} sub={debtAmount > 0 ? 'có nợ' : 'không nợ'} subCrit={debtAmount > 0} />
      </div>

      <div className="bill-body">
        {/* ====== LEFT: invoice list ====== */}
        <div className="bill-list">
          <div className="bill-list-h">
            <div className="bill-seg">
              {([
                { k: 'all',              l: `Tất cả ${counts.all}` },
                { k: 'unpaid',           l: `Chưa TT ${counts.unpaid}` },
                { k: 'paid',             l: `Đã TT ${counts.paid}` },
                { k: 'pending-approval', l: `Chờ duyệt ${counts.pendingApproval}` },
              ] as const).map((t) => (
                <div key={t.k} className={'bill-seg-i ' + (tab === t.k ? 'on' : '')} onClick={() => setTab(t.k)}>
                  {t.l}
                </div>
              ))}
            </div>
            <input
              type="text" placeholder="Tìm mã HĐ / BN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                marginLeft: 8, height: 26, padding: '0 8px',
                fontSize: 12, border: '1px solid var(--line)',
                borderRadius: 'var(--r-2)', flex: '0 0 180px',
              }}
            />
          </div>
          <div className="bill-list-body">
            {loading ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                {invoices.length === 0
                  ? 'Chưa có hóa đơn nào trong 30 ngày'
                  : 'Không có hóa đơn ở bộ lọc này'}
              </div>
            ) : filtered.map((x) => {
              const stKey = x.paymentStatus === 0 ? 'pend' : x.paymentStatus === 1 ? 'paid' : x.paymentStatus === 2 ? 'paid' : 'draft';
              return (
                <div
                  key={x.id}
                  className={'bill-inv ' + (sel === x.id ? 'sel' : '')}
                  onClick={() => setSel(x.id)}
                >
                  <div className="bill-inv-row1">
                    <span className="bill-inv-id">{x.invoiceCode}</span>
                    <span className={'bill-inv-stat ' + stKey}>{PAY_STATUS_LABEL[x.paymentStatus] || '-'}</span>
                  </div>
                  <div className="bill-inv-pt">{x.patientName}</div>
                  <div className="bill-inv-meta">
                    <span>BN <b>{x.patientCode}</b></span>
                    <span>{dayjs(x.createdAt).format('DD/MM HH:mm')}</span>
                    <span>{x.patientTypeName || (x.patientType === 2 ? 'IPD' : 'OPD')}</span>
                    {x.departmentName && <span>{x.departmentName}</span>}
                    {x.insuranceCardNumber && <span>BHYT</span>}
                  </div>
                  <div className="bill-inv-amt">
                    {fmt(x.totalAmount || 0)} ₫
                    {x.remainingAmount > 0 && <div className="pay">BN trả: {fmt(x.remainingAmount)} ₫</div>}
                    {x.remainingAmount === 0 && x.paymentStatus !== 0 && <div className="pay">Đã thanh toán</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ====== MIDDLE: invoice detail ====== */}
        <div className="bill-detail">
          {!inv ? (
            <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              Chọn một hoá đơn trong danh sách
            </div>
          ) : (
            <>
              <div className="bill-detail-h">
                <div>
                  <div className="bill-detail-tit">{inv.invoiceCode}</div>
                  <div className="bill-detail-sub">
                    <span>Ngày <b>{dayjs(inv.createdAt).format('DD/MM/YYYY HH:mm')}</b></span>
                    <span>·</span>
                    <span>HSBA <b>{inv.medicalRecordCode}</b></span>
                    {inv.departmentName && <><span>·</span><span>Khoa <b>{inv.departmentName}</b></span></>}
                    <span>·</span>
                    <span>{APPROVAL_LABEL[inv.approvalStatus] || '—'}</span>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--a-cy-bg)', color: 'var(--a-cy)',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 600, fontSize: 20,
                      border: '1px solid var(--a-cy-line)',
                    }}>
                      {(inv.patientName || '?').split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t-0)' }}>{inv.patientName}</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)',
                        marginTop: 2, display: 'flex', gap: 10,
                      }}>
                        <span><b style={{ color: 'var(--t-0)', fontFamily: 'var(--font-sans)' }}>{inv.patientCode}</b></span>
                        {inv.gender && <span>{inv.gender === 'Nam' ? 'Nam' : 'Nữ'}</span>}
                        {inv.phoneNumber && <span>SĐT {inv.phoneNumber}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="opd-btn-sec" onClick={() => message.info(`⎙ In hóa đơn ${inv.invoiceCode}`)}>⎙ In hóa đơn</button>
                  <button className="opd-btn-sec" onClick={() => message.success('✉ Đã gửi HDĐT')}>✉ Gửi HDĐT</button>
                  <button className="opd-btn-sec" onClick={reload}>⟳ Làm mới</button>
                </div>
              </div>

              <div className="bill-detail-body">
                {renderSection('1. Dịch vụ', inv.serviceItems || [], 'service')}
                {renderSection('2. Thuốc theo đơn', inv.medicineItems || [], 'medicine')}
                {renderSection('3. Vật tư', inv.supplyItems || [], 'supply')}
                {renderSection('4. Giường', inv.bedItems || [], 'bed')}
                {(inv.serviceItems?.length || 0) +
                 (inv.medicineItems?.length || 0) +
                 (inv.supplyItems?.length || 0) +
                 (inv.bedItems?.length || 0) === 0 && (
                  <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                    Hoá đơn không có dòng chi tiết — chỉ tổng hợp.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ====== RIGHT: payment ====== */}
        <div className="bill-pay">
          <div className="bill-pay-h">Thanh toán</div>
          <div className="bill-pay-body">
            {inv?.insuranceCardNumber ? (
              <div className="bhyt-card">
                <div className="h">
                  <span className="t">BHYT</span>
                  <span className="bill-inv-stat paid">✓ Có thẻ</span>
                </div>
                <div className="num">{inv.insuranceCardNumber}</div>
                <div className="meta">
                  {inv.insuranceCardPlace && <span>Nơi ĐKKCB: <b>{inv.insuranceCardPlace}</b></span>}
                  {typeof inv.insuranceRate === 'number' && <span>Mức <b>{inv.insuranceRate}%</b></span>}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '10px 12px', border: '1px dashed var(--line)',
                borderRadius: 'var(--r-2)', color: 'var(--t-2)',
                fontSize: 12, background: 'var(--d-1)', marginBottom: 12,
              }}>
                Không có BHYT · thu phí dịch vụ 100%
              </div>
            )}

            <div className="bill-summary">
              <div className="bill-sum-row">
                <span className="l">Tổng chi phí</span>
                <span className="v">{fmt(total)} ₫</span>
              </div>
              {inv?.discountAmount ? (
                <div className="bill-sum-row ded">
                  <span className="l">− Giảm</span>
                  <span className="v">− {fmt(inv.discountAmount)} ₫</span>
                </div>
              ) : null}
              <div className="bill-sum-row ded">
                <span className="l">− BHYT chi trả</span>
                <span className="v">− {fmt(bhytAmt)} ₫</span>
              </div>
              {inv?.paidAmount ? (
                <div className="bill-sum-row ded">
                  <span className="l">− Đã nộp</span>
                  <span className="v">− {fmt(inv.paidAmount)} ₫</span>
                </div>
              ) : null}
              <div className="bill-sum-row sep tot">
                <span className="l">BN phải trả</span>
                <span className="v">{fmt(payAmt)} ₫</span>
              </div>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', color: 'var(--t-2)',
              letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600,
            }}>Phương thức</div>
            <div className="pay-method">
              {([
                { k: 'cash' as const,    ic: '💵', l: 'Tiền mặt'       },
                { k: 'bank' as const,    ic: '💳', l: 'Thẻ ATM/POS'    },
                { k: 'qr' as const,      ic: '◱', l: 'QR VietQR'      },
                { k: 'ewallet' as const, ic: '◯', l: 'Momo / ZaloPay' },
              ]).map((m) => (
                <div
                  key={m.k}
                  className={'pay-tile ' + (pay === m.k ? 'on' : '')}
                  onClick={() => setPay(m.k)}
                >
                  <span className="ic">{m.ic}</span>
                  {m.l}
                </div>
              ))}
            </div>
          </div>

          <div className="bill-pay-foot">
            <button
              disabled={!inv || payAmt <= 0}
              onClick={() => {
                if (!inv) return;
                modal.confirm({
                  title: `Xác nhận thanh toán ${fmt(payAmt)}₫?`,
                  content: `${inv.invoiceCode} · ${inv.patientName}. Phương thức: ${ { cash: 'Tiền mặt', bank: 'Thẻ ATM/POS', qr: 'QR VietQR', ewallet: 'Ví điện tử' }[pay] }.`,
                  okText: 'XÁC NHẬN THU',
                  cancelText: 'Hủy',
                  onOk: handlePayment,
                });
              }}
            >✓ Thanh toán {payAmt > 0 ? fmt(payAmt) + ' ₫' : ''} (F10)</button>
            <div className="sec-row">
              <button onClick={() => message.info('Chưa hỗ trợ lưu nháp')}>Lưu nháp</button>
              <button onClick={() => message.info('Chưa hỗ trợ hoãn')}>Hoãn</button>
              <button onClick={() => message.info('Chưa hỗ trợ tách HĐ')}>Tách HĐ</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type LineKind = 'service' | 'medicine' | 'supply' | 'bed';
type AnyLine = {
  serviceName?: string; medicineName?: string; supplyName?: string;
  serviceCode?: string; medicineCode?: string; supplyCode?: string;
  quantity?: number;
  unitPrice?: number; price?: number; amount?: number;
  insuranceRate?: number; insuranceAmount?: number;
  patientAmount?: number;
};

function renderSection(title: string, list: AnyLine[], kind: LineKind) {
  if (!list || list.length === 0) return null;
  const subtotal = list.reduce((s, x) => s + (x.amount || (x.unitPrice ?? x.price ?? 0) * (x.quantity ?? 1)), 0);
  return (
    <div className="bill-card" key={title}>
      <div className="bill-card-h">
        <span>{title} <span className="n">· {list.length} dòng</span></span>
        <span className="t">{subtotal.toLocaleString('vi-VN')} ₫</span>
      </div>
      <div className="bill-line bill-line-head">
        <span>Mã</span>
        <span>Nội dung</span>
        <span style={{ textAlign: 'right' }}>SL</span>
        <span style={{ textAlign: 'right' }}>BHYT %</span>
        <span style={{ textAlign: 'right' }}>Đơn giá</span>
        <span style={{ textAlign: 'right' }}>BHYT trả</span>
        <span style={{ textAlign: 'right' }}>BN trả</span>
      </div>
      {list.map((l, i) => {
        const code = l.serviceCode || l.medicineCode || l.supplyCode || `${kind}-${i + 1}`;
        const name = l.serviceName || l.medicineName || l.supplyName || '—';
        const qty  = l.quantity ?? 1;
        const price = l.unitPrice ?? l.price ?? 0;
        const amount = l.amount ?? price * qty;
        const insRate = l.insuranceRate ?? 0;
        const insAmt = l.insuranceAmount ?? 0;
        const pay = l.patientAmount ?? Math.max(0, amount - insAmt);
        return (
          <div key={i} className="bill-line">
            <span className="code">{code}</span>
            <span><span className="nm">{name}</span></span>
            <span className="num">{qty}</span>
            <span className="num pay-ok">{insRate}%</span>
            <span className="num">{amount.toLocaleString('vi-VN')}</span>
            <span className="num pay-ok">{insAmt.toLocaleString('vi-VN')}</span>
            <span className={'num ' + (pay === 0 ? 'pay-no' : '')}>{pay.toLocaleString('vi-VN')}</span>
          </div>
        );
      })}
    </div>
  );
}

const BKpi: React.FC<{ l: string; v: React.ReactNode; sub?: string; subCrit?: boolean }> = ({ l, v, sub, subCrit }) => (
  <div className="bill-kpi">
    <div className="l">{l}</div>
    <div className="v">{v}</div>
    {sub && <div className={'s ' + (subCrit ? 'crit' : '')}>{sub}</div>}
  </div>
);

export default BillingV2;
